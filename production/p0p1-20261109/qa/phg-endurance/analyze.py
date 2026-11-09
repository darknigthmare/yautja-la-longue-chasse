#!/usr/bin/env python3
"""Analyze real native T15 observations; never infer GPU memory from JS heap."""
import argparse
import collections
import csv
import gzip
import datetime
import hashlib
import json
import math
import os
from pathlib import Path
import statistics

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]
MIB = 1024 * 1024


def read(path):
    return json.loads(path.read_text())


def pin(path):
    raw = path.read_bytes()
    return {"path": str(path.relative_to(ROOT)), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def scalar(allocators, name):
    item = allocators.get(name, {}).get("attrs", {}).get("size", {})
    if item.get("units") != "bytes" or item.get("type") != "scalar":
        return None
    # Chrome memory-infra scalar strings are hexadecimal, including strings
    # containing only decimal-looking digits. Do not parse them as base ten.
    return int(item["value"], 16)


def percentile_bucket(buckets, percentile):
    total = sum(buckets)
    if not total:
        return None
    threshold = math.ceil(total * percentile)
    subtotal = 0
    for index, count in enumerate(buckets):
        subtotal += count
        if subtotal >= threshold:
            return index
    return len(buckets) - 1


def slope_per_minute(rows, field):
    pairs = [(row["elapsedSeconds"] / 60, row[field]) for row in rows if row.get(field) is not None]
    if len(pairs) < 2:
        return None
    xm = statistics.mean(x for x, _ in pairs)
    ym = statistics.mean(y for _, y in pairs)
    denominator = sum((x - xm) ** 2 for x, _ in pairs)
    return sum((x - xm) * (y - ym) for x, y in pairs) / denominator if denominator else None


def processes(row):
    values = row.get("processes", [])
    return values if isinstance(values, list) else []


def analyze(folder):
    folder = folder.resolve()
    raw_path = folder / "report.browser-run.json"
    raw = read(raw_path)
    plan = read(BASE / "analysis-plan.json")
    plain_trace, compressed_trace = folder / "memory-trace.json", folder / "memory-trace.json.gz"
    trace_input = None
    if compressed_trace.exists() or plain_trace.exists():
        container = compressed_trace if compressed_trace.exists() else plain_trace
        trace_bytes = gzip.decompress(container.read_bytes()) if container == compressed_trace else container.read_bytes()
        expected_trace = raw.get("memoryTrace", {})
        assert hashlib.sha256(trace_bytes).hexdigest() == expected_trace.get("sha256"), "trace compression must preserve the original emitted bytes"
        assert len(trace_bytes) == expected_trace.get("bytes"), "trace length differs from original browser receipt"
        trace = json.loads(trace_bytes)
        trace_input = {**pin(container), "compression": "gzip" if container == compressed_trace else "none",
                       "decompressedBytes": len(trace_bytes), "decompressedSha256": hashlib.sha256(trace_bytes).hexdigest(),
                       "matchesOriginalBrowserReceipt": True}
    else:
        trace = {"traceEvents": []}
    samples = raw["samples"]
    gpu_pids = {proc["id"] for row in samples for proc in processes(row) if isinstance(proc, dict) and proc.get("type") == "GPU"}
    # CDP Performance.Timestamp and trace timestamps use the same monotonic
    # Chrome time domain. This correlates dumps with native samples without
    # changing clocks; raw request GUIDs and trace IDs remain separately saved.
    offsets = [s["cdp"]["Timestamp"] * 1_000_000 - s["elapsedSeconds"] * 1_000_000 for s in samples if "Timestamp" in s.get("cdp", {})]
    offset = statistics.median(offsets) if offsets else None
    gpu_rows = []
    for event in trace["traceEvents"]:
        if event.get("ph") != "v" or event.get("pid") not in gpu_pids:
            continue
        dumps = event.get("args", {}).get("dumps", {})
        allocators = dumps.get("allocators", {})
        size = scalar(allocators, "gpu")
        if size is None:
            continue
        elapsed = (event["ts"] - offset) / 1_000_000 if offset is not None else None
        closest = min(raw.get("memoryDumps", []), key=lambda r: abs(r.get("elapsedSeconds", 0) - elapsed)) if elapsed is not None and raw.get("memoryDumps") else {}
        gpu_rows.append({"elapsedSeconds": elapsed, "traceTimestampUs": event["ts"], "traceEventId": event.get("id"),
                         "processId": event["pid"], "levelOfDetail": dumps.get("level_of_detail"),
                         "nearestRequest": closest.get("label"), "nearestRequestGuid": closest.get("dumpGuid"),
                         "deltaFromNearestRequestSeconds": elapsed - closest["elapsedSeconds"] if elapsed is not None and closest else None,
                         "gpuAllocatorBytes": size, "sharedImagesBytes": scalar(allocators, "gpu/shared_images"),
                         "glTexturesBytes": scalar(allocators, "gpu/gl/textures")})
    gpu_rows.sort(key=lambda r: r["elapsedSeconds"] if r["elapsedSeconds"] is not None else r["traceTimestampUs"])
    cycle = next((row for row in samples if row["label"] == "cycle-1"), None)
    baseline = min(gpu_rows, key=lambda r: abs(r["elapsedSeconds"] - cycle["elapsedSeconds"])) if cycle and gpu_rows and offset is not None else None
    postwarm = [r for r in gpu_rows if baseline and r["elapsedSeconds"] >= baseline["elapsedSeconds"]]
    baseline_rss = next((p.get("VmRSSBytes") for p in processes(cycle) if p.get("type") == "GPU"), None) if cycle else None
    ending_rss = next((p.get("VmRSSBytes") for p in processes(samples[-1]) if p.get("type") == "GPU"), None) if samples else None
    ending = gpu_rows[-1] if gpu_rows else None
    allocator_growth = ending["gpuAllocatorBytes"] - baseline["gpuAllocatorBytes"] if baseline and ending else None
    median_growth = statistics.median(r["gpuAllocatorBytes"] for r in postwarm[-3:]) - statistics.median(r["gpuAllocatorBytes"] for r in postwarm[:3]) if len(postwarm) >= 3 else None
    rss_growth = ending_rss - baseline_rss if ending_rss is not None and baseline_rss is not None else None
    selected_counts = collections.Counter(row["materialId"] for row in raw["selections"])
    devices = raw.get("systemInfo", {}).get("gpu", {}).get("devices", [])
    software = any("swiftshader" in str(device).lower() for device in devices)
    checks = {
        "nativeInputRunPassed": raw.get("nativeRunPassed") is True,
        "realDurationAtLeast3600Seconds": not raw["probe"] and raw.get("elapsedSeconds", 0) >= 3600,
        "visibleDurationAtLeast3600Seconds": not raw["probe"] and bool(samples) and samples[-1].get("visibleMs", 0) >= 3_600_000,
        "all77MaterialsActuallySelected": len(selected_counts) == 77,
        "sourceIdentityUnchanged": raw.get("sourceAfter", {}).get("sha256") == raw.get("sourceBefore", {}).get("sha256") and "sourceAfter" in raw,
        "compiledJsCssIdentityUnchanged": raw.get("buildAfter", {}).get("sha256") == raw.get("buildBefore", {}).get("sha256") and "buildAfter" in raw,
        "materialAssetsUnchanged": raw.get("materialAssetsAfter", {}).get("sha256") == raw.get("materialAssetsBefore", {}).get("sha256") and "materialAssetsAfter" in raw,
        "gpuProcessStableInSamples": len(gpu_pids) == 1 and all({p["id"] for p in processes(row) if p.get("type") == "GPU"} == gpu_pids for row in samples),
        "firstCompleteCycleGpuBaselineCaptured": bool(baseline and cycle and baseline["nearestRequest"] == "cycle-1" and abs(baseline["elapsedSeconds"] - cycle["elapsedSeconds"]) <= 5),
        "endingGpuDumpCaptured": bool(ending and ending["nearestRequest"] == "end" and abs(ending["elapsedSeconds"] - raw.get("elapsedSeconds", 0)) <= 10),
        "atLeast3DirectGpuDumpsAfterMaterialWarmup": len(postwarm) >= 3,
        "nonzeroGpuAllocationActuallyObserved": bool(baseline and baseline["gpuAllocatorBytes"] > 0 and any(row["gpuAllocatorBytes"] > 0 for row in postwarm)),
        "endingGpuAllocatorWithinPredeclared16MiBGrowth": allocator_growth is not None and allocator_growth <= plan["growthToleranceBytes"]["gpuAllocator"],
        "medianGpuAllocatorWithinPredeclared16MiBGrowth": median_growth is not None and median_growth <= plan["growthToleranceBytes"]["gpuAllocator"],
        "endingGpuProcessRssWithinPredeclared64MiBGrowth": rss_growth is not None and rss_growth <= plan["growthToleranceBytes"]["gpuProcessRss"],
        "zeroRuntimeAndRequestErrors": all(not raw.get(name) for name in ["errors", "consoleErrors", "httpErrors", "requestFailures"]),
    }
    series = []
    previous = None
    for row in samples:
        delta_frames = row["frames"] - (previous["frames"] if previous else 0)
        delta_ms = row["totalFrameMs"] - (previous["totalFrameMs"] if previous else 0)
        old_buckets = previous["frameBucketsMs"] if previous else [0] * len(row["frameBucketsMs"])
        window_buckets = [a - b for a, b in zip(row["frameBucketsMs"], old_buckets)]
        proc = next((p for p in processes(row) if p.get("type") == "GPU"), {})
        series.append({"elapsedSeconds": row["elapsedSeconds"], "label": row["label"], "gpuProcessRssBytes": proc.get("VmRSSBytes"),
                       "jsHeapUsedBytes": row.get("cdp", {}).get("JSHeapUsedSize"), "domNodes": row.get("cdp", {}).get("Nodes"),
                       "meanWindowFps": 1000 * delta_frames / delta_ms if delta_ms > 0 else None,
                       "windowP95FrameMsBucketLowerBound": percentile_bucket(window_buckets, .95),
                       "longTaskCount": row["longTaskCount"], "longTaskMs": row["longTaskMs"]})
        previous = row
    for name, rows in [("gpu-counters.csv", gpu_rows), ("native-metrics.csv", series)]:
        if rows:
            with (folder / name).open("w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)
    summary = {"schemaVersion": 1, "analyzedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
               "sourceCriterion": raw["sourceCriterion"], "status": "QUALIFIE_BORNE" if all(checks.values()) else "PARTIEL",
               "gpuLeakCriterionQualifiedWithinObservedBackend": all(checks.values()), "checks": checks,
               "elapsedSeconds": raw.get("elapsedSeconds"), "visibleSeconds": samples[-1].get("visibleMs", 0) / 1000 if samples else 0,
               "materialSelections": len(raw["selections"]), "distinctMaterials": len(selected_counts),
               "minimumSelectionsPerMaterial": min(selected_counts.values()) if selected_counts else 0,
               "completedFullCycles": raw.get("completedFullCycles", 0), "gpuBackend": devices,
               "softwareBackend": software, "physicalGpuOrVramQualified": False,
               "gpuCounterMeaning": "Memory-infra GPU-process root allocation size; gpu/shared_images is a child, not a second quantity to sum. Scalar strings parsed in hexadecimal. These are allocations of the observed backend, not a VRAM estimate.",
               "gpuProcessIds": sorted(gpu_pids), "gpuDumpCount": len(gpu_rows), "postWarmupGpuDumpCount": len(postwarm),
               "warmupBaseline": baseline, "lastGpuCounter": ending, "gpuAllocatorGrowthBytes": allocator_growth,
               "gpuAllocatorMedianGrowthBytes": median_growth, "gpuAllocatorTrendBytesPerMinute": slope_per_minute(postwarm, "gpuAllocatorBytes"),
               "gpuProcessRssGrowthBytes": rss_growth, "gpuCounters": gpu_rows, "metrics": series,
               "predeclaredPlan": pin(BASE / "analysis-plan.json"), "rawReport": pin(raw_path), "inputTrace": trace_input,
               "conclusion": "No unbounded GPU allocation growth observed beyond the predeclared tolerances after the77-material warmup, for this measured duration and backend only." if all(checks.values()) else "Some required evidence or bound is not established. See false checks; this does not certify the complete T15 criterion.",
               "limits": raw["limits"] + ["Shared cloud CPU load is not experimentally isolated from other agents. Frame timings are measurements of this run, not a hardware FPS guarantee."]}
    # The immutable runtime is the measured target. Report separately whether
    # the working checkout has since advanced; never silently substitute it.
    changed = []
    for entry in raw["sourceBefore"]["entries"]:
        file = ROOT / entry["path"]
        actual = hashlib.sha256(file.read_bytes()).hexdigest() if file.is_file() else None
        if actual != entry["sha256"]:
            changed.append({"path": entry["path"], "testedSha256": entry["sha256"], "currentSha256": actual})
    summary["currentWorkspaceSourceComparison"] = {"compared": len(raw["sourceBefore"]["entries"]), "byteIdentical": not changed, "changed": changed,
        "scope": "Separate from runtime source-before/after equality. This identifies any later checkout evolution without rewriting the measured version."}
    (folder / "memory-analysis.json").write_text(json.dumps(summary, indent=2) + "\n")
    try:
        os.environ.setdefault("MPLCONFIGDIR", "/tmp/phg-endurance-matplotlib-20261109")
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, axes = plt.subplots(3, 1, figsize=(12, 9), sharex=True, layout="constrained")
        if gpu_rows:
            axes[0].plot([r["elapsedSeconds"] / 60 for r in gpu_rows], [r["gpuAllocatorBytes"] / MIB for r in gpu_rows], "o-", label="Allocateur GPU (memory-infra)", color="#167d68")
        axes[0].plot([r["elapsedSeconds"] / 60 for r in series], [(r["gpuProcessRssBytes"] or 0) / MIB for r in series], label="RSS du processus GPU (mémoire hôte)", color="#676d76")
        axes[0].set_ylabel("Mio"); axes[0].legend(loc="best"); axes[0].grid(alpha=.2)
        axes[1].plot([r["elapsedSeconds"] / 60 for r in series], [(r["jsHeapUsedBytes"] or 0) / MIB for r in series], color="#7254a0", label="Mémoire JS du renderer")
        axes[1].set_ylabel("Mio"); axes[1].legend(loc="best"); axes[1].grid(alpha=.2)
        axes[2].plot([r["elapsedSeconds"] / 60 for r in series], [r["meanWindowFps"] for r in series], color="#167d68", label="FPS moyens par fenêtre")
        axes[2].set_ylabel("FPS"); second = axes[2].twinx()
        second.plot([r["elapsedSeconds"] / 60 for r in series], [r["windowP95FrameMsBucketLowerBound"] for r in series], color="#b97728", label="Trame p95 (borne du bucket)")
        second.set_ylabel("ms"); axes[2].set_xlabel("Exposition réelle monotone (minutes)"); axes[2].grid(alpha=.2)
        axes[2].legend(loc="upper left"); second.legend(loc="upper right")
        fig.suptitle("PHG T15 — " + str(summary["distinctMaterials"]) + "/77 matières, " + str(round(summary["elapsedSeconds"] / 60, 2)) + " minutes réelles\n" + ("Backend SwiftShader logiciel" if software else "Backend Chromium observé") + " · " + raw["buildId"])
        for ax in axes:
            if cycle: ax.axvline(cycle["elapsedSeconds"] / 60, linestyle="--", color="black", alpha=.35)
        for extension in ["png", "svg"]: fig.savefig(folder / ("memory-and-frame-time." + extension), dpi=150)
        plt.close(fig)
    except ImportError:
        summary["plotUnavailable"] = "matplotlib not installed; raw CSV counters remain available"
        (folder / "memory-analysis.json").write_text(json.dumps(summary, indent=2) + "\n")
    final = {**raw, "gpuLeakCriterionQualified": all(checks.values()), "qualificationStatus": summary["status"],
             "memoryAnalysis": pin(folder / "memory-analysis.json"), "rawBrowserReport": pin(raw_path), "memoryTraceArchive": trace_input}
    (folder / "report.json").write_text(json.dumps(final, indent=2) + "\n")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=BASE / "attempt-1")
    args = parser.parse_args()
    summary = analyze(args.input)
    print(json.dumps({"status": summary["status"], "elapsedSeconds": summary["elapsedSeconds"],
                      "distinctMaterials": summary["distinctMaterials"], "gpuDumps": summary["gpuDumpCount"],
                      "checks": summary["checks"]}))
