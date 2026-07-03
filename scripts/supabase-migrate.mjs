#!/usr/bin/env node
/**
 * One-time migration: upload all existing SVGs to Supabase Storage
 * and populate the `icons` table with categories.
 *
 * Requires env vars (put them in .env.local or export inline):
 *   SUPABASE_URL              = https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = service role key (server-side only!)
 *
 * Usage:
 *   node scripts/supabase-migrate.mjs                  # migrates everything
 *   node scripts/supabase-migrate.mjs --dry            # scan only
 *   node scripts/supabase-migrate.mjs --only=metadata  # skip storage upload
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "public", "raw", "elsway");
const BRANDS = ["default", "carinfo", "cars24", "teambhp", "vehicleinfo"];
const WEIGHTS = ["regular", "fill"];
const BUCKET = "elsway-icons";
const CONCURRENCY = 12;

const args = new Set(process.argv.slice(2));
const dry = args.has("--dry");
const onlyMetadata = args.has("--only=metadata");
const onlyStorage = args.has("--only=storage");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const manifest = JSON.parse(
  readFileSync(join(OUT, "manifest.json"), "utf-8")
);
const categories = JSON.parse(
  readFileSync(join(OUT, "categories.json"), "utf-8")
);

console.error(`Manifest: ${manifest.length} icons`);

async function withPool(items, worker, size = CONCURRENCY) {
  let i = 0, ok = 0, fail = 0;
  const errors = [];
  async function next() {
    while (i < items.length) {
      const idx = i++;
      try { await worker(items[idx], idx); ok++; }
      catch (e) { fail++; if (errors.length < 10) errors.push(String(e?.message || e)); }
      if (ok % 500 === 0 || ok + fail === items.length) {
        process.stderr.write(`  ${ok + fail}/${items.length}  ok=${ok} fail=${fail}\r`);
      }
    }
  }
  await Promise.all(Array.from({ length: size }, next));
  process.stderr.write("\n");
  if (errors.length) console.error("First errors:", errors);
  return { ok, fail };
}

// 1) Storage upload
if (!onlyMetadata) {
  console.error(`\nUploading SVGs to storage bucket "${BUCKET}"…`);
  const jobs = [];
  for (const name of manifest)
    for (const brand of BRANDS)
      for (const weight of WEIGHTS)
        jobs.push({ name, brand, weight });
  console.error(`  ${jobs.length} objects total`);
  if (dry) console.error("  (dry run, skipping upload)");
  else {
    await withPool(jobs, async ({ name, brand, weight }) => {
      const local = join(OUT, brand, weight, `${name}.svg`);
      if (!existsSync(local)) throw new Error(`missing ${local}`);
      const body = readFileSync(local);
      const path = `${brand}/${weight}/${name}.svg`;
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(path, body, {
          contentType: "image/svg+xml",
          upsert: true,
          cacheControl: "31536000",
        });
      if (error) throw error;
    });
  }
}

// 2) Metadata rows
if (!onlyStorage) {
  console.error(`\nUpserting ${manifest.length} rows into public.icons…`);
  if (dry) console.error("  (dry run, skipping upsert)");
  else {
    const CHUNK = 500;
    let done = 0;
    for (let i = 0; i < manifest.length; i += CHUNK) {
      const slice = manifest.slice(i, i + CHUNK).map((name) => ({
        name,
        categories: categories[name] || [],
        tags: [],
      }));
      const { error } = await sb.from("icons").upsert(slice, {
        onConflict: "name",
      });
      if (error) throw error;
      done += slice.length;
      process.stderr.write(`  ${done}/${manifest.length}\r`);
    }
    process.stderr.write("\n");
  }
}

console.error("\nDone.");
