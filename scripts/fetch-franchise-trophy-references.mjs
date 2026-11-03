import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const promptPath = path.join(
  root,
  "art-source",
  "v16",
  "franchise-trophies",
  "openai-franchise-trophy-prompts.jsonl",
);
const sourceRoot = path.dirname(promptPath);
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Codex-Yautja-Reference-Audit/1.0";

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&#x2F;", "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function normalizedImageUrl(value, pageUrl) {
  try {
    const decoded = decodeHtml(value.trim());
    const url = new URL(decoded, pageUrl);
    if (!/^https?:$/.test(url.protocol)) {
      return null;
    }
    if (/wordpress|wp-content/i.test(url.href)) {
      url.pathname = url.pathname.replace(
        /-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp)$)/i,
        "",
      );
    }
    return url.href;
  } catch {
    return null;
  }
}

function candidatesFromHtml(html, pageUrl) {
  const candidates = [];
  const add = (url, label, bonus = 0) => {
    const normalized = normalizedImageUrl(url, pageUrl);
    if (!normalized || !/\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(normalized)) {
      return;
    }
    if (/logo|favicon|emoji|avatar|icon|spinner|placeholder|tracking|pixel/i.test(normalized)) {
      return;
    }
    candidates.push({ url: normalized, label: decodeHtml(label ?? ""), bonus });
  };

  for (const match of html.matchAll(
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
  )) {
    add(match[1], "social preview", 150);
  }
  for (const match of html.matchAll(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["'][^>]*>/gi,
  )) {
    add(match[1], "social preview", 150);
  }
  for (const match of html.matchAll(/<img\b([^>]+)>/gi)) {
    const attributes = match[1];
    const source =
      attributes.match(
        /\b(?:data-src|data-lazy-src|data-original|src)=["']([^"']+)["']/i,
      )?.[1] ?? "";
    const label = attributes.match(/\b(?:alt|title)=["']([^"']*)["']/i)?.[1] ?? "";
    add(source, label, 0);
  }
  for (const match of html.matchAll(
    /<a[^>]+href=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["'][^>]*>/gi,
  )) {
    add(match[1], "linked gallery image", 60);
  }
  for (const match of html.matchAll(
    /!\[([^\]]*)\]\((https?:\/\/[^)\s]+\.(?:jpe?g|png|webp)(?:\?[^)\s]*)?)\)/gi,
  )) {
    add(match[2], match[1], 50);
  }

  return [
    ...new Map(candidates.map((candidate) => [candidate.url, candidate])).values(),
  ];
}

function identityTokens(rows) {
  return [
    ...new Set(
      rows
        .flatMap((row) => `${row.id} ${row.prompt}`.toLowerCase().split(/[^a-z0-9]+/))
        .filter((token) => token.length >= 5),
    ),
  ];
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": userAgent,
      accept: "image/avif,image/webp,image/png,image/jpeg,text/html;q=0.8,*/*;q=0.5",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "",
    finalUrl: response.url,
  };
}

async function usableImage(candidate, tokens) {
  try {
    const fetched = await fetchBuffer(candidate.url);
    if (!/^image\//i.test(fetched.contentType)) {
      return null;
    }
    const metadata = await sharp(fetched.buffer).metadata();
    if (!metadata.width || !metadata.height || metadata.width < 240 || metadata.height < 180) {
      return null;
    }
    const searchable = `${candidate.url} ${candidate.label}`.toLowerCase();
    const tokenScore = tokens.reduce(
      (score, token) => score + (searchable.includes(token) ? 35 : 0),
      0,
    );
    return {
      ...candidate,
      ...fetched,
      width: metadata.width,
      height: metadata.height,
      score:
        candidate.bonus +
        tokenScore +
        Math.min(500, Math.log2(metadata.width * metadata.height) * 18),
    };
  } catch {
    return null;
  }
}

async function renderReferenceBoard(images, outputPath) {
  const selected = images.slice(0, 20);
  const columns = Math.min(4, selected.length);
  const rows = Math.ceil(selected.length / columns);
  const tileWidth = 384;
  const tileHeight = 288;
  const composites = await Promise.all(
    selected.map(async (image, index) => ({
      input: await sharp(image.buffer)
        .rotate()
        .resize(tileWidth - 8, tileHeight - 8, {
          fit: "contain",
          background: "#111511",
          withoutEnlargement: true,
        })
        .extend({
          top: 4,
          bottom: 4,
          left: 4,
          right: 4,
          background: "#111511",
        })
        .webp({ quality: 88 })
        .toBuffer(),
      left: (index % columns) * tileWidth,
      top: Math.floor(index / columns) * tileHeight,
    })),
  );

  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp({
    create: {
      width: columns * tileWidth,
      height: rows * tileHeight,
      channels: 3,
      background: "#080b09",
    },
  })
    .composite(composites)
    .webp({ quality: 90 })
    .toFile(outputPath);
}

async function sourceCandidates(rows) {
  const directUrl = rows.find((row) => row.referenceImageUrl)?.referenceImageUrl;
  if (directUrl) {
    return [{ url: directUrl, label: "exact locked image", bonus: 1000 }];
  }

  const sourcePage = rows[0].sourcePage;
  const youtubeId = new URL(sourcePage).searchParams.get("v");
  if (/youtube\.com|youtu\.be/i.test(sourcePage) && youtubeId) {
    return [
      {
        url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        label: "official video thumbnail",
        bonus: 1000,
      },
    ];
  }

  let fetched;
  try {
    fetched = await fetchBuffer(sourcePage);
  } catch {
    fetched = await fetchBuffer(`https://r.jina.ai/${sourcePage}`);
  }
  const html = fetched.buffer.toString("utf8");
  return candidatesFromHtml(html, fetched.finalUrl);
}

const prompts = (await readFile(promptPath, "utf8"))
  .trim()
  .split(/\r?\n/)
  .map((line) => JSON.parse(line));
const groups = new Map();
for (const prompt of prompts) {
  const rows = groups.get(prompt.localReferencePath) ?? [];
  rows.push(prompt);
  groups.set(prompt.localReferencePath, rows);
}

const report = [];
for (const [relativeOutputPath, rows] of groups) {
  const sourcePage = rows[0].sourcePage;
  try {
    await access(path.join(root, relativeOutputPath));
    report.push({
      localReferencePath: relativeOutputPath,
      sourcePage,
      assetIds: rows.map((row) => row.id),
      status: "existing",
      selectedImages: [],
    });
    continue;
  } catch {
    // Download the locked reference below.
  }
  try {
    const candidates = await sourceCandidates(rows);
    const tokens = identityTokens(rows);
    const inspected = (
      await Promise.all(candidates.slice(0, 60).map((candidate) => usableImage(candidate, tokens)))
    )
      .filter(Boolean)
      .sort((left, right) => right.score - left.score);
    if (inspected.length === 0) {
      throw new Error("no usable reference image found");
    }
    await renderReferenceBoard(inspected, path.join(root, relativeOutputPath));
    report.push({
      localReferencePath: relativeOutputPath,
      sourcePage,
      assetIds: rows.map((row) => row.id),
      status: "downloaded",
      selectedImages: inspected.slice(0, 20).map((image) => ({
        url: image.finalUrl,
        width: image.width,
        height: image.height,
        score: Number(image.score.toFixed(2)),
      })),
    });
    console.log(`Reference OK: ${rows.map((row) => row.id).join(", ")}`);
  } catch (error) {
    report.push({
      localReferencePath: relativeOutputPath,
      sourcePage,
      assetIds: rows.map((row) => row.id),
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    console.warn(`Reference ECHEC: ${sourcePage} (${error})`);
  }
}

await writeFile(
  path.join(sourceRoot, "reference-fetch-report.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      temporaryRoot: "tmp/franchise-trophy-references",
      groups: report,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const failures = report.filter((entry) => entry.status === "failed");
console.log(
  `References franchise : ${report.length - failures.length}/${report.length} groupes disponibles.`,
);
if (failures.length > 0) {
  process.exitCode = 1;
}
