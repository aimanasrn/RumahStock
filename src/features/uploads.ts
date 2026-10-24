"use server";
import { serverClient } from "@/lib/supabase/server";
export async function uploadImage(
  body: FormData,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const client = await serverClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { data: membership } = await client
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();
  if (!membership) return { ok: false, error: "Join a household first." };
  const file = body.get("file");
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || file.size === 0)
    return { ok: false, error: "Choose an image up to 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const ext =
    png && file.type === "image/png"
      ? "png"
      : jpg && file.type === "image/jpeg"
        ? "jpg"
        : webp && file.type === "image/webp"
          ? "webp"
          : null;
  if (!ext) return { ok: false, error: "Upload a valid JPG, PNG, or WebP image." };
  const path = `${membership.household_id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage
    .from("product-images")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  return error
    ? { ok: false, error: "The image could not be uploaded. Try again." }
    : { ok: true, path };
}
