import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { credentials } from "./config";
import type { Database } from "../database.types";
export async function serverClient() {
  const cookieStore = await cookies();
  const { url, key } = credentials();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Server Components refresh cookies through proxy. */
        }
      },
    },
  });
}
