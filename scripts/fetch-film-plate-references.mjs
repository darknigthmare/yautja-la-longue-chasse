import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { HUNTER_FILM_PRESETS } from "../app/game/hunterLore.ts";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const REFERENCE_ROOT = path.join(
  ROOT,
  "tmp",
  "yautja-film-references",
);
const LOCK_PATH = path.join(
  ROOT,
  "art-source",
  "v5",
  "film-plates",
  "reference-locks.json",
);
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT =
  "Mozilla/5.0 YautjaLongHuntReferenceAudit/5.0 (+private fan-art production)";

function decodeHtml(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"');
}

function metaImageUrls(html, pageUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
  ];
  return patterns.flatMap((pattern) =>
    [...html.matchAll(pattern)].flatMap((match) => {
      try {
        return [new URL(decodeHtml(match[1]), pageUrl).href];
      } catch {
        return [];
      }
    }),
  );
}

function galleryImageUrls(html, pageUrl, visualTerms) {
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].flatMap(([tag]) => {
    const source =
      tag.match(/\b(?:data-src|data-zoom|src)=["']([^"']+)["']/i)?.[1] ??
      null;
    if (!source) return [];
    const description = [
      tag.match(/\balt=["']([^"']*)["']/i)?.[1],
      tag.match(/\btitle=["']([^"']*)["']/i)?.[1],
      source,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const score = visualTerms.reduce(
      (total, term) => total + Number(description.includes(term)),
      0,
    );
    try {
      return [
        {
          url: new URL(decodeHtml(source), pageUrl).href,
          score,
        },
      ];
    } catch {
      return [];
    }
  });
  return images
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ url }) => url);
}

async function fetchResource(url) {
  return fetch(url, {
    headers: {
      accept: "text/html,image/avif,image/webp,image/png,image/jpeg,*/*",
      "user-agent": USER_AGENT,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function extensionFor(response, url) {
  const contentType = response.headers.get("content-type") ?? "";
  if (/png/i.test(contentType)) return ".png";
  if (/webp/i.test(contentType)) return ".webp";
  if (/avif/i.test(contentType)) return ".avif";
  if (/jpe?g/i.test(contentType)) return ".jpg";
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return [".png", ".webp", ".avif", ".jpg", ".jpeg"].includes(extension)
    ? extension
    : ".jpg";
}

async function downloadFirstImage({
  pageUrl,
  destinationStem,
  visualTerms,
  excludedHashes,
}) {
  const pageResponse = await fetchResource(pageUrl);
  if (!pageResponse.ok) {
    throw new Error(`page HTTP ${pageResponse.status}`);
  }
  const pageType = pageResponse.headers.get("content-type") ?? "";
  let candidates;
  if (pageType.startsWith("image/")) {
    candidates = [pageResponse.url];
  } else {
    const html = await pageResponse.text();
    candidates = [
      ...galleryImageUrls(html, pageResponse.url, visualTerms),
      ...metaImageUrls(html, pageResponse.url),
    ];
  }

  for (const candidateUrl of [...new Set(candidates)]) {
    try {
      const imageResponse = await fetchResource(candidateUrl);
      const contentType = imageResponse.headers.get("content-type") ?? "";
      if (!imageResponse.ok || !contentType.startsWith("image/")) continue;
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      if (buffer.length < 20_000) continue;
      const metadata = await sharp(buffer).metadata();
      if (
        !metadata.width ||
        !metadata.height ||
        metadata.width < 400 ||
        metadata.height < 400
      ) {
        continue;
      }
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      if (excludedHashes.has(sha256)) continue;
      const destination = `${destinationStem}${extensionFor(
        imageResponse,
        imageResponse.url,
      )}`;
      await writeFile(destination, buffer);
      return {
        imageUrl: imageResponse.url,
        localReference: path.relative(ROOT, destination).replaceAll("\\", "/"),
        bytes: buffer.length,
        width: metadata.width,
        height: metadata.height,
        sha256,
      };
    } catch {
      // Try the next gallery or metadata candidate.
    }
  }
  throw new Error("aucune image de référence exploitable trouvée");
}

async function main() {
  await mkdir(REFERENCE_ROOT, { recursive: true });
  await mkdir(path.dirname(LOCK_PATH), { recursive: true });
  const entries = [];

  for (const preset of HUNTER_FILM_PRESETS) {
    const directory = path.join(REFERENCE_ROOT, preset.id);
    await mkdir(directory, { recursive: true });
    const visualTerms = preset.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 3)
      .concat(["predator", preset.id.replaceAll("-", " ")]);
    const references = [];
    const referenceHashes = new Set();
    for (const [sourceIndex, pageUrl] of preset.sourceUrls.entries()) {
      const destinationStem = path.join(
        directory,
        `reference-${sourceIndex + 1}`,
      );
      try {
        const downloaded = await downloadFirstImage({
          pageUrl,
          destinationStem,
          visualTerms,
          excludedHashes: referenceHashes,
        });
        referenceHashes.add(downloaded.sha256);
        references.push({
          pageUrl,
          ...downloaded,
          error: null,
        });
      } catch (error) {
        references.push({
          pageUrl,
          imageUrl: null,
          localReference: null,
          bytes: 0,
          width: 0,
          height: 0,
          sha256: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const validReferences = references.filter(
      (reference) => reference.localReference && reference.sha256,
    );
    entries.push({
      id: preset.id,
      name: preset.name,
      work: preset.work,
      sourceUrls: preset.sourceUrls,
      references,
      ready:
        validReferences.length >= 2 &&
        new Set(validReferences.map((reference) => reference.sha256)).size >= 2 &&
        new Set(validReferences.map((reference) => reference.pageUrl)).size >= 2,
    });
  }

  await writeFile(
    LOCK_PATH,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        policy: {
          minimumIndependentReferencesWhenAvailable: 2,
          minimumReferenceDimensions: "400x400",
          rejectUnscoredGalleryImages: true,
          rejectDuplicateReferencePixels: true,
          officialReferencePixelsShippedInRuntime: false,
          sourcePriority: [
            "studio",
            "licensed-turnaround",
            "licensed-game-render",
          ],
        },
        counts: {
          hunters: entries.length,
          ready: entries.filter((entry) => entry.ready).length,
          downloaded: entries.reduce(
            (count, entry) =>
              count +
              entry.references.filter((reference) => reference.localReference)
                .length,
            0,
          ),
        },
        entries,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const lockMetadata = await stat(LOCK_PATH);
  console.log(
    `Références plaques cinéma : ${entries.filter((entry) => entry.ready).length}/${entries.length} dossiers à deux vues, registre ${lockMetadata.size} octets.`,
  );
  console.log(path.relative(ROOT, LOCK_PATH));
  for (const entry of entries.filter((candidate) => !candidate.ready)) {
    console.log(
      `- ${entry.id}: ${entry.references
        .filter((reference) => reference.error)
        .map((reference) => reference.error)
        .join(" | ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
