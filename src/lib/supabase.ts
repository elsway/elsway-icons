import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const SUPABASE_CONFIGURED = !!supabase;

export const STORAGE_BUCKET = "elsway-icons";
export const ALLOWED_EMAIL_DOMAIN = "cars24.com";

export const BRANDS = [
  "default",
  "carinfo",
  "cars24",
  "teambhp",
  "vehicleinfo",
] as const;
export const WEIGHTS = ["regular", "fill"] as const;
export type Brand = (typeof BRANDS)[number];
export type Weight = (typeof WEIGHTS)[number];

export function storagePath(brand: Brand, weight: Weight, name: string) {
  return `${brand}/${weight}/${name}.svg`;
}

/** Public URL for an icon SVG. Falls back to the bundled path if Supabase is not configured. */
export function iconUrl(brand: Brand, weight: Weight, name: string): string {
  if (supabase) {
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath(brand, weight, name));
    return data.publicUrl;
  }
  return `${import.meta.env.BASE_URL}raw/elsway/${brand}/${weight}/${name}.svg`;
}
