// Offline schema compiler for CI: uses the actual migration, never hand-maintained columns.
// Supabase CLI `gen types typescript --local` can replace this file for a running stack.
import { writeFile } from "node:fs/promises";
import { databaseHarness } from "./database-harness";
async function main() {
  const db = await databaseHarness();
  const { rows } = await db.query<{
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
    is_generated: string;
  }>(
    `select table_name,column_name,data_type,is_nullable,column_default,is_generated from information_schema.columns where table_schema='public' order by table_name,ordinal_position`,
  );
  const tables = [...new Set(rows.map((r) => r.table_name))];
  const type = (r: (typeof rows)[number]) =>
    (({
      uuid: "string",
      text: "string",
      "timestamp with time zone": "string",
      date: "string",
      numeric: "number",
      integer: "number",
      jsonb: "Json",
      boolean: "boolean",
    })[r.data_type] ?? "unknown") + (r.is_nullable === "YES" ? " | null" : "");
  let content =
    "// Generated from the migration by npm run db:types:offline. Do not edit.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = { public: { Tables: {\n";
  for (const table of tables) {
    const cols = rows.filter((r) => r.table_name === table);
    content += `  ${table}: {\n    Row: {\n${cols.map((r) => `      ${r.column_name}: ${type(r)};`).join("\n")}\n    };\n    Insert: {\n${cols.map((r) => `      ${r.column_name}${r.column_default || r.is_nullable === "YES" || r.is_generated === "ALWAYS" ? "?" : ""}: ${type(r)};`).join("\n")}\n    };\n    Update: {\n${cols.map((r) => `      ${r.column_name}?: ${type(r)};`).join("\n")}\n    };\n    Relationships: [];\n  };\n`;
  }
  content +=
    "}; Views: { [_ in never]: never }; Functions: { household_action: { Args: { action: string; payload: Json }; Returns: Json } }; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never }; } };\n";
  await writeFile("src/lib/database.types.ts", content);
  await db.close();
  console.log("Generated database types from migration.");
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
