/** Resource bounds, not a remote commit guarantee. A timed-out POST/PATCH may
 * already have been applied; callers must retain and reconcile their outbox. */
export class CloudResponseErrorV94 extends Error {
  constructor(readonly reason: "deadline" | "oversized" | "invalid-json", readonly status = 0) {
    super(reason); this.name = "CloudResponseErrorV94";
  }
}
export const CLOUD_AUTH_RESPONSE_BYTES_V94 = 64 * 1024;
// One 16 MiB archive plus its row envelope. No dependency on the save parser.
export const CLOUD_ARCHIVE_RESPONSE_BYTES_V94 = 16 * 1024 * 1024 + 64 * 1024;

export async function fetchCloudJsonV94(
  fetcher: typeof fetch, url: string, options: RequestInit,
  maxBytes: number, timeoutMs = 15_000,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > CLOUD_ARCHIVE_RESPONSE_BYTES_V94 ||
      !Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 15_000) throw new RangeError("Invalid cloud response bounds");
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let stopped = false, completed = false;
  const cancelBody = () => {
    try { void reader?.cancel().catch(() => undefined); } catch { /* No late failure can escape cleanup. */ }
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      stopped = true;
      reject(new CloudResponseErrorV94("deadline"));
      controller.abort(); cancelBody();
    }, timeoutMs);
  });
  const operation = async () => {
    const response = await fetcher(url, { ...options, signal: controller.signal });
    if (stopped) {
      try { void response.body?.cancel().catch(() => undefined); } catch { /* Late response is discarded. */ }
      throw new CloudResponseErrorV94("deadline");
    }
    const advertised = Number(response.headers.get("content-length"));
    if (Number.isFinite(advertised) && advertised > maxBytes) {
      try { void response.body?.cancel().catch(() => undefined); } catch { /* Refuse before reading. */ }
      throw new CloudResponseErrorV94("oversized", response.status);
    }
    let text: string;
    if (response.body) {
      reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: true }), parts: string[] = [];
      let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (stopped) throw new CloudResponseErrorV94("deadline", response.status);
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > maxBytes) throw new CloudResponseErrorV94("oversized", response.status);
        try { parts.push(decoder.decode(chunk.value, { stream: true })); }
        catch { throw new CloudResponseErrorV94("invalid-json", response.status); }
      }
      try { parts.push(decoder.decode()); } catch { throw new CloudResponseErrorV94("invalid-json", response.status); }
      text = parts.join("");
    } else {
      text = await response.text();
      if (stopped) throw new CloudResponseErrorV94("deadline", response.status);
      if (new TextEncoder().encode(text).byteLength > maxBytes) throw new CloudResponseErrorV94("oversized", response.status);
    }
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; }
    catch { throw new CloudResponseErrorV94("invalid-json", response.status); }
    completed = true;
    return { ok: response.ok, status: response.status, data };
  };
  try { return await Promise.race([operation(), deadline]); }
  finally {
    stopped = true; clearTimeout(timer);
    if (!completed) { controller.abort(); cancelBody(); }
    try { reader?.releaseLock(); } catch { /* A native read may still be unwinding after cancellation. */ }
  }
}
