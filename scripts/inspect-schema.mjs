/**
 * Live schema introspection for the EXISTING Supabase project.
 *
 * This is a development tool, not application code. It exists because the data
 * layer must be written against the real schema - column names, nullability, and
 * relationships cannot be assumed. Run it once against the live project and use
 * its output to write `src/lib/data/*` and to decide the "Departments" mapping.
 *
 * It is strictly read-only: every request is a SELECT. It creates nothing,
 * migrates nothing, and writes nothing back.
 *
 * Usage:
 *   npm run db:inspect
 *
 * Requires `.env.local` with NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. It deliberately uses the publishable key,
 * so what it can see is exactly what the public site can see through RLS. A table
 * reported as unreadable here will be unreadable in production too - that is a
 * finding, not a tooling failure.
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Table names as stated by the project owner. Treated as given; their columns are
 * not. Anything not in this list is not probed, because guessing table names is
 * the same mistake as guessing columns.
 */
const TABLES = [
  "sections",
  "venues",
  "menus",
  "menu_main_categories",
  "menu_categories",
  "menu_items",
  "creators",
  "products",
  "studio_info",
  "site_settings",
  "profiles",
];

/** Tables whose full contents are printed, being small and structural. */
const DUMP_IN_FULL = new Set(["sections", "venues", "site_settings", "studio_info"]);

const SAMPLE_ROWS = 3;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!url || !key) {
  console.error(
    "\nMissing Supabase configuration.\n\n" +
      "  1. cp .env.example .env.local\n" +
      "  2. Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\n" +
      "     (Supabase dashboard > Project Settings > API Keys)\n" +
      "  3. npm run db:inspect\n",
  );
  process.exit(1);
}

if (key.startsWith("sb_secret_") || key.startsWith("sbp_")) {
  console.error(
    "\nRefusing to run: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret key.\n" +
      "Introspecting with a privileged key would report tables the public site\n" +
      "cannot actually read. Use the publishable key (sb_publishable_...).\n",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

/** Describes a value precisely enough to write a domain type from it. */
function describe(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return value.length === 0 ? "[]" : `array<${describe(value[0])}>`;
  }
  const type = typeof value;
  if (type !== "string") return type;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return "string(timestamp)";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "string(date)";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return "string(uuid)";
  }
  if (/^https?:\/\//.test(value)) return "string(url)";
  return "string";
}

/**
 * Merges observations across sampled rows. One row is not enough to tell an
 * always-null column from a sometimes-null one, which is exactly the distinction
 * that decides whether a domain field is optional.
 */
function profileColumns(rows) {
  const columns = new Map();

  for (const row of rows) {
    for (const [name, value] of Object.entries(row)) {
      const entry = columns.get(name) ?? { types: new Set(), nulls: 0, samples: [] };
      entry.types.add(describe(value));
      if (value === null) entry.nulls += 1;
      else if (entry.samples.length < 2) entry.samples.push(value);
      columns.set(name, entry);
    }
  }

  return columns;
}

function truncate(value, max = 60) {
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function probe(table) {
  const [sample, counted] = await Promise.all([
    supabase
      .from(table)
      .select("*")
      .limit(DUMP_IN_FULL.has(table) ? 100 : SAMPLE_ROWS),
    supabase.from(table).select("*", { count: "exact", head: true }),
  ]);

  if (sample.error) {
    return { table, ok: false, error: sample.error };
  }

  return {
    table,
    ok: true,
    count: counted.count ?? null,
    countError: counted.error ?? null,
    rows: sample.data ?? [],
  };
}

const results = [];
for (const table of TABLES) {
  results.push(await probe(table));
}

console.log(`\nSupabase schema introspection`);
console.log(`project: ${new URL(url).hostname}`);
console.log(`role:    anon (publishable key) - output reflects public RLS visibility\n`);

for (const result of results) {
  console.log("=".repeat(72));

  if (!result.ok) {
    const { code, message, hint, details } = result.error;
    console.log(`${result.table}  ->  NOT READABLE`);
    console.log(`  code:    ${code ?? "(none)"}`);
    console.log(`  message: ${message}`);
    if (details) console.log(`  details: ${details}`);
    if (hint) console.log(`  hint:    ${hint}`);
    if (code === "42P01") {
      console.log(`  meaning: table does not exist under this name`);
    } else if (code === "42501" || code === "PGRST301") {
      console.log(`  meaning: exists but no public-read RLS policy grants anon access`);
    }
    console.log("");
    continue;
  }

  const rowCount = result.count === null ? "unknown" : String(result.count);
  console.log(`${result.table}  ->  readable, ${rowCount} row(s)`);
  if (result.countError) {
    console.log(`  (count unavailable: ${result.countError.message})`);
  }

  if (result.rows.length === 0) {
    console.log(`  no rows visible to anon - columns cannot be observed from data`);
    console.log("");
    continue;
  }

  console.log(`  columns (observed over ${result.rows.length} row(s)):`);
  for (const [name, info] of profileColumns(result.rows)) {
    const types = [...info.types].join(" | ");
    const nullNote =
      info.nulls === result.rows.length
        ? "  ALWAYS NULL in sample"
        : info.nulls > 0
          ? `  nullable (${info.nulls}/${result.rows.length} null)`
          : "";
    const sample = info.samples.length > 0 ? `  e.g. ${truncate(info.samples[0])}` : "";
    console.log(`    ${name.padEnd(28)} ${types.padEnd(20)}${nullNote}${sample}`);
  }

  if (DUMP_IN_FULL.has(result.table)) {
    console.log(`  full contents:`);
    console.log(
      JSON.stringify(result.rows, null, 2)
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n"),
    );
  }

  console.log("");
}

console.log("=".repeat(72));
const unreadable = results.filter((r) => !r.ok);
const empty = results.filter((r) => r.ok && r.rows.length === 0);

console.log(`readable:   ${results.length - unreadable.length}/${results.length}`);
console.log(`unreadable: ${unreadable.map((r) => r.table).join(", ") || "(none)"}`);
console.log(`empty:      ${empty.map((r) => r.table).join(", ") || "(none)"}`);
console.log(
  `\nNext: npm run db:types  (generates src/lib/supabase/database.types.ts from this schema)\n`,
);

process.exit(unreadable.length > 0 ? 1 : 0);
