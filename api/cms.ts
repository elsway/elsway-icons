// Vercel serverless function — CMS write API backed by GitHub commits.
// All writes require a Supabase-issued JWT in Authorization: Bearer <token>
// belonging to an @cars24.com email. The GitHub PAT never leaves the server.
//
// Endpoint: POST /api/cms
// Body: { op: "put" | "delete" | "rename" | "batch" | "meta", ...args }
//
// Supported ops:
//   put         { path, contentBase64, message? }
//   delete      { path, message? }
//   rename      { from, to, message? }               // moves file
//   batch       { changes: [{path, contentBase64|null}], message? }  // multi-file commit
//   meta        { name, categories?, tags? }         // updates public/raw/elsway/metadata.json
//
// Env:
//   GITHUB_TOKEN         fine-grained PAT with contents: read/write on elsway/elsway-icons
//   GITHUB_REPO          "elsway/elsway-icons"
//   GITHUB_BRANCH        "main"
//   SUPABASE_URL         used to verify the caller's Google session
//   SUPABASE_ANON_KEY
//   ALLOWED_EMAIL_DOMAIN "cars24.com"

interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_EMAIL_DOMAIN: string;
}
function env(): Env {
  return {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
    GITHUB_REPO: process.env.GITHUB_REPO || "elsway/elsway-icons",
    GITHUB_BRANCH: process.env.GITHUB_BRANCH || "main",
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
    ALLOWED_EMAIL_DOMAIN: process.env.ALLOWED_EMAIL_DOMAIN || "cars24.com",
  };
}

async function verifyCaller(req: Request, e: Env): Promise<string> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Response("missing auth", { status: 401 });
  if (!e.SUPABASE_URL) throw new Response("supabase not configured", { status: 500 });
  const res = await fetch(`${e.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: e.SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Response("invalid session", { status: 401 });
  const user = (await res.json()) as { email?: string };
  const email = (user.email || "").toLowerCase();
  if (!email.endsWith(`@${e.ALLOWED_EMAIL_DOMAIN}`))
    throw new Response("forbidden domain", { status: 403 });
  return email;
}

// ---- GitHub helpers ----
const GH = "https://api.github.com";
function gh(e: Env, path: string, init?: RequestInit) {
  return fetch(`${GH}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${e.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

async function getRef(e: Env) {
  const res = await gh(
    e,
    `/repos/${e.GITHUB_REPO}/git/ref/heads/${encodeURIComponent(e.GITHUB_BRANCH)}`
  );
  if (!res.ok) throw new Response(`ref: ${await res.text()}`, { status: 502 });
  return (await res.json()) as { object: { sha: string } };
}
async function getCommit(e: Env, sha: string) {
  const res = await gh(e, `/repos/${e.GITHUB_REPO}/git/commits/${sha}`);
  if (!res.ok) throw new Response(`commit: ${await res.text()}`, { status: 502 });
  return (await res.json()) as { tree: { sha: string } };
}
async function createBlob(e: Env, contentBase64: string) {
  const res = await gh(e, `/repos/${e.GITHUB_REPO}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content: contentBase64, encoding: "base64" }),
  });
  if (!res.ok) throw new Response(`blob: ${await res.text()}`, { status: 502 });
  return (await res.json()) as { sha: string };
}
async function createTree(
  e: Env,
  baseTreeSha: string,
  entries: { path: string; sha: string | null }[]
) {
  const tree = entries.map((x) =>
    x.sha
      ? { path: x.path, mode: "100644", type: "blob", sha: x.sha }
      : { path: x.path, mode: "100644", type: "blob", sha: null }
  );
  const res = await gh(e, `/repos/${e.GITHUB_REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  });
  if (!res.ok) throw new Response(`tree: ${await res.text()}`, { status: 502 });
  return (await res.json()) as { sha: string };
}
async function createCommit(
  e: Env,
  parent: string,
  treeSha: string,
  message: string,
  author: string
) {
  const res = await gh(e, `/repos/${e.GITHUB_REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [parent],
      author: { name: author, email: author, date: new Date().toISOString() },
    }),
  });
  if (!res.ok) throw new Response(`commit: ${await res.text()}`, { status: 502 });
  return (await res.json()) as { sha: string };
}
async function updateRef(e: Env, sha: string) {
  const res = await gh(
    e,
    `/repos/${e.GITHUB_REPO}/git/refs/heads/${encodeURIComponent(e.GITHUB_BRANCH)}`,
    { method: "PATCH", body: JSON.stringify({ sha }) }
  );
  if (!res.ok) throw new Response(`ref-update: ${await res.text()}`, { status: 502 });
}
async function getFile(
  e: Env,
  path: string
): Promise<{ contentBase64: string } | null> {
  const res = await gh(
    e,
    `/repos/${e.GITHUB_REPO}/contents/${encodeURI(path)}?ref=${encodeURIComponent(e.GITHUB_BRANCH)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Response(`file: ${await res.text()}`, { status: 502 });
  const data = (await res.json()) as { content: string };
  return { contentBase64: data.content };
}

async function commitChanges(
  e: Env,
  changes: { path: string; contentBase64: string | null }[],
  message: string,
  author: string
) {
  const ref = await getRef(e);
  const parentCommit = await getCommit(e, ref.object.sha);
  // Upload blobs first
  const entries: { path: string; sha: string | null }[] = [];
  for (const c of changes) {
    if (c.contentBase64 == null) {
      entries.push({ path: c.path, sha: null });
    } else {
      const blob = await createBlob(e, c.contentBase64);
      entries.push({ path: c.path, sha: blob.sha });
    }
  }
  const tree = await createTree(e, parentCommit.tree.sha, entries);
  const commit = await createCommit(
    e,
    ref.object.sha,
    tree.sha,
    message,
    author
  );
  await updateRef(e, commit.sha);
  return commit.sha;
}

// ---- Handler ----
export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS")
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  if (req.method !== "POST")
    return new Response("method not allowed", { status: 405 });

  const e = env();
  let email: string;
  try {
    email = await verifyCaller(req, e);
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response("auth failed", { status: 401 });
  }
  if (!e.GITHUB_TOKEN)
    return new Response("GITHUB_TOKEN not set", { status: 500 });

  const body = (await req.json()) as any;
  const op = body?.op as string;
  const commitMsg =
    body?.message || `cms: ${op} by ${email} @ ${new Date().toISOString()}`;

  try {
    switch (op) {
      case "put": {
        const { path, contentBase64 } = body;
        if (!path || !contentBase64) return badReq();
        await commitChanges(
          e,
          [{ path, contentBase64 }],
          commitMsg,
          email
        );
        return ok();
      }
      case "delete": {
        const { path } = body;
        if (!path) return badReq();
        await commitChanges(e, [{ path, contentBase64: null }], commitMsg, email);
        return ok();
      }
      case "rename": {
        const { from, to } = body;
        if (!from || !to) return badReq();
        const file = await getFile(e, from);
        if (!file)
          return new Response(`missing: ${from}`, { status: 404 });
        await commitChanges(
          e,
          [
            { path: to, contentBase64: file.contentBase64 },
            { path: from, contentBase64: null },
          ],
          commitMsg,
          email
        );
        return ok();
      }
      case "batch": {
        const { changes } = body;
        if (!Array.isArray(changes) || !changes.length) return badReq();
        await commitChanges(e, changes, commitMsg, email);
        return ok();
      }
      case "meta": {
        const { name, categories, tags } = body;
        if (!name) return badReq();
        // Read metadata.json (if any), update, commit.
        const metaFile = await getFile(e, "public/raw/elsway/metadata.json");
        let meta: Record<string, { categories?: string[]; tags?: string[] }> =
          {};
        if (metaFile) {
          try {
            meta = JSON.parse(atob(metaFile.contentBase64));
          } catch {}
        }
        meta[name] = {
          ...(meta[name] || {}),
          ...(categories !== undefined ? { categories } : {}),
          ...(tags !== undefined ? { tags } : {}),
        };
        const nextB64 = btoa(JSON.stringify(meta, null, 2));
        await commitChanges(
          e,
          [{ path: "public/raw/elsway/metadata.json", contentBase64: nextB64 }],
          commitMsg,
          email
        );
        return ok();
      }
      default:
        return new Response("unknown op", { status: 400 });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(String((err as Error).message || err), { status: 500 });
  }
}

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
function badReq() {
  return new Response("bad request", { status: 400 });
}
