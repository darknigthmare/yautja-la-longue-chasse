import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Replace a file only after its new bytes are flushed and closed. The caller
 * creates the parent directory. An abrupt process exit may leave an unused
 * temporary file, but readers keep seeing the previous complete destination.
 * This is atomic per file, not a transaction across multiple output files.
 */
export async function writeFileAtomic(destination, data) {
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${process.pid}.${randomUUID()}.tmp`);
  const file = await fs.open(temporary, "wx");
  try {
    try {
      await file.writeFile(data);
      await file.sync();
    } finally {
      await file.close();
    }
    await fs.rename(temporary, destination);
  } catch (error) {
    try {
      await fs.unlink(temporary);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        throw new AggregateError([error, cleanupError], `Could not write ${destination} or remove temporary file ${temporary}`, { cause: error });
      }
    }
    throw error;
  }
}
