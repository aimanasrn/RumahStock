export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const isConfigured = Boolean(
  supabaseUrl && supabaseKey && !supabaseKey.includes("replace-with"),
);
export function credentials() {
  if (!isConfigured || !supabaseUrl || !supabaseKey)
    throw new Error("Supabase is not configured. See README.md to connect your project.");
  return { url: supabaseUrl, key: supabaseKey };
}
export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
