import { supabase } from "./supabase";

const CMS_ENDPOINT = "/api/cms";

async function bearer(): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return token;
}

async function call<T = unknown>(body: unknown): Promise<T> {
  const token = await bearer();
  const res = await fetch(CMS_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

async function fileToB64(file: File | Blob | string): Promise<string> {
  if (typeof file === "string") return btoa(unescape(encodeURIComponent(file)));
  const buf = new Uint8Array(await (file as Blob).arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

export async function putSvg(path: string, file: File | Blob | string) {
  return call({
    op: "put",
    path,
    contentBase64: await fileToB64(file),
    message: `cms: replace ${path}`,
  });
}
export async function deleteFile(path: string) {
  return call({ op: "delete", path, message: `cms: delete ${path}` });
}
export async function renameFile(from: string, to: string) {
  return call({ op: "rename", from, to, message: `cms: rename ${from} → ${to}` });
}
export async function batchCommit(
  changes: { path: string; contentBase64: string | null }[],
  message: string
) {
  return call({ op: "batch", changes, message });
}
export async function updateMeta(
  name: string,
  categories?: string[],
  tags?: string[]
) {
  return call({
    op: "meta",
    name,
    categories,
    tags,
    message: `cms: meta ${name}`,
  });
}

/** Helper: convert a File to a {path, contentBase64} entry for batch commits. */
export async function svgEntry(path: string, file: File | Blob | string) {
  return { path, contentBase64: await fileToB64(file) };
}
