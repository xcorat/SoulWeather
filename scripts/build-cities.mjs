#!/usr/bin/env node
/**
 * Build `public/cities.json` from the GeoNames `cities15000` dump.
 *
 * GeoNames distributes a tab-separated file of every populated place with
 * ≥15,000 inhabitants (≈25k cities) under CC BY 4.0. We download it once,
 * trim it to the columns we actually need, and serialise to JSON with short
 * keys so the gzipped payload stays around 1 MB.
 *
 * Output shape:
 *   [
 *     { n: "Auckland", c: "NZ", lat: -36.84, lon: 174.76, tz: "Pacific/Auckland" },
 *     ...
 *   ]
 *
 * Run via `npm run build:cities` (also invoked by `prebuild`). Re-running is
 * idempotent; if the output file already exists the script skips work unless
 * `--force` is passed.
 */

import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const DATASET = "cities15000";
const URL = `https://download.geonames.org/export/dump/${DATASET}.zip`;
const OUT_FILE = path.join(ROOT, "public", "cities.json");
const FORCE = process.argv.includes("--force");

// GeoNames cities table column order (see https://download.geonames.org/export/dump/readme.txt).
const COL = {
  name: 1,
  asciiname: 2,
  latitude: 4,
  longitude: 5,
  countryCode: 8,
  population: 14,
  timezone: 17,
};

async function main() {
  if (existsSync(OUT_FILE) && !FORCE) {
    console.log(`[build-cities] ${path.relative(ROOT, OUT_FILE)} already exists; pass --force to regenerate.`);
    return;
  }

  const workDir = await mkdir(path.join(tmpdir(), `geonames-${Date.now()}`), { recursive: true });
  const zipPath = path.join(workDir, `${DATASET}.zip`);
  const txtPath = path.join(workDir, `${DATASET}.txt`);

  console.log(`[build-cities] downloading ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Failed to download ${URL}: ${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath));

  console.log(`[build-cities] extracting ${DATASET}.txt`);
  await extractZipEntry(zipPath, `${DATASET}.txt`, txtPath);

  console.log(`[build-cities] parsing TSV`);
  const cities = [];
  const stream = createInterface({ input: createReadStream(txtPath, "utf8"), crlfDelay: Infinity });
  for await (const line of stream) {
    if (!line) continue;
    const f = line.split("\t");
    const name = f[COL.name] || f[COL.asciiname];
    const cc = f[COL.countryCode];
    const tz = f[COL.timezone];
    const lat = parseFloat(f[COL.latitude]);
    const lon = parseFloat(f[COL.longitude]);
    if (!name || !cc || !tz || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    cities.push({
      n: name,
      c: cc,
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000,
      tz,
    });
  }

  // Sort by population descending so prefix matches surface large cities first.
  // (Population isn't stored in output, just used as sort key.)
  // Re-read to grab population since we discarded it; cheap second pass.
  const popMap = new Map();
  const stream2 = createInterface({ input: createReadStream(txtPath, "utf8"), crlfDelay: Infinity });
  for await (const line of stream2) {
    const f = line.split("\t");
    const key = `${f[COL.name]}|${f[COL.countryCode]}|${f[COL.latitude]}`;
    const pop = parseInt(f[COL.population], 10) || 0;
    popMap.set(key, pop);
  }
  cities.sort((a, b) => {
    const pa = popMap.get(`${a.n}|${a.c}|${a.lat}`) || 0;
    const pb = popMap.get(`${b.n}|${b.c}|${b.lat}`) || 0;
    return pb - pa;
  });

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(cities));
  await rm(workDir, { recursive: true, force: true });
  console.log(`[build-cities] wrote ${cities.length} cities → ${path.relative(ROOT, OUT_FILE)}`);
}

/**
 * Minimal zip reader: extracts a single named entry from a ZIP archive
 * using only the central directory + local file header. Supports the
 * "deflate" (method 8) and "stored" (method 0) compression methods which
 * cover every GeoNames dump.
 */
async function extractZipEntry(zipPath, entryName, outPath) {
  const { inflateRawSync } = await import("node:zlib");
  const buf = await readFile(zipPath);

  // Locate the End of Central Directory (EOCD) record.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a ZIP file (no EOCD record)");

  const cdCount = buf.readUInt16LE(eocd + 10);
  let cd = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < cdCount; i++) {
    if (buf.readUInt32LE(cd) !== 0x02014b50) throw new Error("Corrupt central directory");
    const method = buf.readUInt16LE(cd + 10);
    const compSize = buf.readUInt32LE(cd + 20);
    const nameLen = buf.readUInt16LE(cd + 28);
    const extraLen = buf.readUInt16LE(cd + 30);
    const commentLen = buf.readUInt16LE(cd + 32);
    const localOffset = buf.readUInt32LE(cd + 42);
    const name = buf.toString("utf8", cd + 46, cd + 46 + nameLen);
    cd += 46 + nameLen + extraLen + commentLen;
    if (name !== entryName) continue;

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Corrupt local header");
    const lhNameLen = buf.readUInt16LE(localOffset + 26);
    const lhExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
    const compData = buf.subarray(dataStart, dataStart + compSize);
    const data = method === 0 ? compData : inflateRawSync(compData);
    await writeFile(outPath, data);
    return;
  }
  throw new Error(`Entry not found in ZIP: ${entryName}`);
}

main().catch((err) => {
  console.error(`[build-cities] FAILED: ${err.message}`);
  process.exitCode = 1;
});
