"use client";
import { createBrowserClient } from "@supabase/ssr";
import { credentials } from "./config";
import type { Database } from "../database.types";
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;
export function browserClient() {
  const { url, key } = credentials();
  return (client ??= createBrowserClient<Database>(url, key));
}
