"""Protocol tests with supplied native byte buffers; no X11 connection opens."""

import importlib.util
from pathlib import Path
import time
import unittest

source = Path(__file__).resolve().parents[1] / "scripts/qa-planet-arrival-x11.py"
spec = importlib.util.spec_from_file_location("arrival_x11", source)
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)

VIEWPORT = {"width": 16, "height": 24}
MARKERS = [{"id": name, "x": x, "y": y, "width": 4, "height": 8,
            "rgb": [40 + i, 80 + i, 120 + i] * 32}
           for i, (name, x, y) in enumerate([
               ("tl", 0, 0), ("tr", 12, 0), ("bl", 0, 16), ("br", 12, 16)])]


def image_bytes(width, height, markers):
    raw = bytearray(width * height * 4)
    for marker in markers:
        for pixel in range(32):
            x, y = marker["x"] + pixel % 4, marker["y"] + pixel // 4
            red, green, blue = marker["rgb"][pixel * 3:pixel * 3 + 3]
            offset = (y * width + x) * 4
            raw[offset:offset + 4] = bytes([blue, green, red, 0])
    fmt = {"width": width, "height": height, "depth": 24, "bitsPerPixel": 32,
           "bytesPerLine": width * 4, "byteOrderCode": 0, "byteOrder": "LSBFirst",
           "bitmapUnit": 32, "bitmapPad": 32, "xOffset": 0, "format": "ZPixmap",
           "redMask": 0xFF0000, "greenMask": 0xFF00, "blueMask": 0xFF}
    return bytes(raw), fmt


class NativeReads:
    def __init__(self, stale_corner="tl", stale_rounds=0, stale_forever=False, corrupt_full=False):
        self.stale_corner, self.stale_rounds = stale_corner, stale_rounds
        self.stale_forever, self.corrupt_full = stale_forever, corrupt_full
        self.calls = []

    def image(self, x, y, width, height):
        started = time.monotonic_ns()
        if (width, height) == (4, 8):
            marker = next(m for m in MARKERS if (m["x"], m["y"]) == (x, y))
            stale = marker["id"] == self.stale_corner and (self.stale_forever or self.stale_rounds > 0)
            if stale and self.stale_rounds > 0:
                self.stale_rounds -= 1
            self.calls.append((marker["id"], not stale))
            raw, fmt = image_bytes(width, height, [
                {**marker, "x": 0, "y": 0, "rgb": [0] * 96 if stale else marker["rgb"]}])
        else:
            self.calls.append(("full", not self.corrupt_full))
            markers = [{**m, "rgb": [0] * 96 if self.corrupt_full and m["id"] == "br" else m["rgb"]}
                       for m in MARKERS]
            raw, fmt = image_bytes(width, height, markers)
        ended = time.monotonic_ns()
        return raw, fmt, {"getImageStartMonotonicNs": str(started),
                          "getImageEndMonotonicNs": str(ended), "privateCopyEndMonotonicNs": str(ended),
                          "getImageMs": native.milliseconds(started, ended), "privateCopyMs": 0,
                          "copyMs": native.milliseconds(started, ended)}


def capture(reads, timeout=1000):
    helper = native.Helper()
    helper.x, helper.runtime = reads, {"setupId": "protocol-test"}
    helper.calibrations["test"] = {"viewport": VIEWPORT, "origin": {"x": 0, "y": 0},
                                   "markers": [{**m, "rgb": [i + 1] * 96} for i, m in enumerate(MARKERS)],
                                   "nonce": "b" * 24}
    helper.geometry_guard = lambda _calibration: {"passed": True}
    ack = helper.capture({"calibrationId": "test", "captureId": "one-native-copy",
                          "nonce": "a" * 24, "markers": MARKERS, "timeoutMs": timeout})
    return helper, ack


class FreshNativeFrameProtocol(unittest.TestCase):
    def test_stale_rounds_stop_early_but_success_checks_every_corner_and_one_full_copy(self):
        for index, marker in enumerate(MARKERS):
            with self.subTest(stale_corner=marker["id"]):
                reads = NativeReads(stale_corner=marker["id"], stale_rounds=2)
                helper, ack = capture(reads)
                rejected_round = [(m["id"], i < index) for i, m in enumerate(MARKERS[:index + 1])]
                self.assertEqual(reads.calls, rejected_round * 2 + [(m["id"], True) for m in MARKERS] + [("full", True)])
                self.assertEqual(ack["timings"]["probeRounds"], 3)
                self.assertEqual(ack["timings"]["probeCount"], 2 * (index + 1) + 4)
                self.assertTrue(ack["probeReady"])
                self.assertEqual(len(ack["probeObservations"]), 4)
                self.assertEqual(len(ack["markerObservations"]), 4)
                self.assertTrue(all(m["matched"] for m in ack["markerObservations"]))
                self.assertTrue(ack["nonceMatched"])
                self.assertTrue(ack["freshSinceCalibration"])
                self.assertFalse(ack["rejected"])
                self.assertEqual(list(helper.frames), [ack["token"]])

    def test_three_fresh_corners_never_admit_a_stale_last_corner(self):
        reads = NativeReads(stale_corner="br", stale_forever=True)
        helper, ack = capture(reads, timeout=1)
        self.assertFalse(ack["probeReady"])
        self.assertEqual(ack["probeObservations"], [
            {"id": m["id"], "matched": m["id"] != "br"} for m in MARKERS])
        self.assertTrue(ack["timedOut"])
        self.assertTrue(ack["rejected"])
        # The one original buffer remains diagnostic evidence, even if its
        # pixels arrive fresh after the polling deadline. It is never accepted.
        self.assertEqual(reads.calls.count(("full", True)), 1)
        self.assertTrue(helper.frames[ack["token"]]["ack"]["rejected"])

    def test_a_fresh_probe_round_cannot_hide_a_stale_corner_in_the_full_copy(self):
        reads = NativeReads(corrupt_full=True)
        helper, ack = capture(reads)
        self.assertTrue(ack["probeReady"])
        self.assertFalse(ack["nonceMatched"])
        self.assertEqual([m["id"] for m in ack["markerObservations"] if not m["matched"]], ["br"])
        self.assertTrue(ack["rejected"])
        self.assertEqual(reads.calls.count(("full", False)), 1)
        self.assertTrue(helper.frames[ack["token"]]["ack"]["rejected"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
