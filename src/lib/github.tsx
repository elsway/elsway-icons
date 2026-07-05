import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ==========================================================================
// Config (safe to expose — GitHub OAuth Device Flow does not use a client_secret)
// ==========================================================================

export const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as
  | string
  | undefined;
export const GITHUB_REPO =
  (import.meta.env.VITE_GITHUB_REPO as string | undefined) ??
  "elsway/elsway-icons";
export const GITHUB_BRANCH =
  (import.meta.env.VITE_GITHUB_BRANCH as string | undefined) ?? "main";
const TOKEN_KEY = "elsway_gh_token";
const USER_KEY = "elsway_gh_user";

export const CMS_CONFIGURED = !!GITHUB_CLIENT_ID;

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

export function iconUrl(brand: Brand, weight: Weight, name: string): string {
  return `${import.meta.env.BASE_URL}raw/elsway/${brand}/${weight}/${name}.svg`;
}

// ==========================================================================
// Device flow
// ==========================================================================

// GitHub returns CORS-friendly JSON when Accept: application/json is set.
async function github<T = unknown>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Bad response from ${url}: ${text}`);
  }
}

type DeviceStart = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export async function startDeviceFlow(): Promise<DeviceStart> {
  if (!GITHUB_CLIENT_ID) throw new Error("VITE_GITHUB_CLIENT_ID not set");
  const body = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: "repo",
  });
  return github<DeviceStart>("https://github.com/login/device/code", {
    method: "POST",
    body,
  });
}

type DevicePoll =
  | { access_token: string; token_type: string; scope: string }
  | { error: string; error_description?: string; interval?: number };

export async function pollDeviceFlow(device_code: string): Promise<DevicePoll> {
  const body = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID!,
    device_code,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });
  return github<DevicePoll>("https://github.com/login/oauth/access_token", {
    method: "POST",
    body,
  });
}

// ==========================================================================
// Auth context
// ==========================================================================

export type GhUser = { login: string; name?: string; avatar_url?: string };

type AuthState = {
  ready: boolean;
  configured: boolean;
  token: string | null;
  user: GhUser | null;
  canWrite: boolean;
  device: DeviceStart | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  cancelSignIn: () => void;
};

const AuthContext = createContext<AuthState>({
  ready: false,
  configured: CMS_CONFIGURED,
  token: null,
  user: null,
  canWrite: false,
  device: null,
  signIn: async () => {},
  signOut: () => {},
  cancelSignIn: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<GhUser | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [canWrite, setCanWrite] = useState(false);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<DeviceStart | null>(null);
  const [pollTimer, setPollTimer] = useState<number | null>(null);

  // Validate token on mount: fetch /user and repo permission.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const u = await github<GhUser & { message?: string }>(
          "https://api.github.com/user",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!alive) return;
        if ((u as any).message) throw new Error((u as any).message);
        setUser({ login: u.login, name: u.name, avatar_url: u.avatar_url });
        localStorage.setItem(
          USER_KEY,
          JSON.stringify({ login: u.login, name: u.name, avatar_url: u.avatar_url })
        );

        // Check push permission on the repo
        const perm = await github<{ permission?: string; message?: string }>(
          `https://api.github.com/repos/${GITHUB_REPO}/collaborators/${u.login}/permission`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!alive) return;
        const p = (perm as any).permission;
        setCanWrite(p === "write" || p === "admin" || p === "maintain");
      } catch {
        // token bad — sign out
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setCanWrite(false);
    setDevice(null);
    if (pollTimer) window.clearInterval(pollTimer);
    setPollTimer(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, [pollTimer]);

  const cancelSignIn = useCallback(() => {
    if (pollTimer) window.clearInterval(pollTimer);
    setPollTimer(null);
    setDevice(null);
  }, [pollTimer]);

  const signIn = useCallback(async () => {
    if (!CMS_CONFIGURED) {
      alert("VITE_GITHUB_CLIENT_ID not set. See CMS setup instructions.");
      return;
    }
    const d = await startDeviceFlow();
    setDevice(d);
    // Auto-open verification URL for convenience.
    window.open(d.verification_uri, "_blank");
    let interval = Math.max(d.interval || 5, 5) * 1000;
    const id = window.setInterval(async () => {
      try {
        const r = await pollDeviceFlow(d.device_code);
        if ("access_token" in r && r.access_token) {
          window.clearInterval(id);
          setPollTimer(null);
          setDevice(null);
          localStorage.setItem(TOKEN_KEY, r.access_token);
          setToken(r.access_token);
        } else if ("error" in r) {
          if (r.error === "authorization_pending") return;
          if (r.error === "slow_down") {
            window.clearInterval(id);
            interval += 5000;
            const id2 = window.setInterval(() => void 0, interval);
            setPollTimer(id2);
            return;
          }
          if (r.error === "expired_token" || r.error === "access_denied") {
            window.clearInterval(id);
            setPollTimer(null);
            setDevice(null);
            alert(`Sign-in ${r.error}`);
          }
        }
      } catch (e) {
        console.error("device poll", e);
      }
    }, interval);
    setPollTimer(id);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      configured: CMS_CONFIGURED,
      token,
      user,
      canWrite,
      device,
      signIn,
      signOut,
      cancelSignIn,
    }),
    [ready, token, user, canWrite, device, signIn, signOut, cancelSignIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

// ==========================================================================
// GitHub CMS operations (all use the user's own token)
// ==========================================================================

const API = "https://api.github.com";

async function gh<T = unknown>(
  path: string,
  init: RequestInit & { token: string }
): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(rest.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok)
    throw new Error(
      `GitHub ${res.status}: ${(data as any).message || res.statusText}`
    );
  return data as T;
}

export function b64FromString(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}
export async function b64FromBlob(f: Blob): Promise<string> {
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}
export async function b64FromAny(v: File | Blob | string): Promise<string> {
  return typeof v === "string" ? b64FromString(v) : b64FromBlob(v);
}

/** Get file sha at path (null if missing) */
async function getSha(path: string, token: string): Promise<string | null> {
  try {
    const d = await gh<{ sha: string }>(
      `/repos/${GITHUB_REPO}/contents/${encodeURI(path)}?ref=${GITHUB_BRANCH}`,
      { token }
    );
    return d.sha;
  } catch (e: any) {
    if (String(e.message).includes("404")) return null;
    throw e;
  }
}

export async function putFile(
  path: string,
  contentBase64: string,
  message: string,
  token: string
) {
  const sha = await getSha(path, token);
  return gh(
    `/repos/${GITHUB_REPO}/contents/${encodeURI(path)}`,
    {
      token,
      method: "PUT",
      body: JSON.stringify({
        message,
        content: contentBase64,
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {}),
      }),
    }
  );
}

export async function deleteFile(path: string, message: string, token: string) {
  const sha = await getSha(path, token);
  if (!sha) return null;
  return gh(`/repos/${GITHUB_REPO}/contents/${encodeURI(path)}`, {
    token,
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch: GITHUB_BRANCH }),
  });
}

export async function renameFile(from: string, to: string, token: string) {
  // Read blob, PUT to new path, DELETE old path.
  const src = await gh<{ content: string; sha: string; encoding: string }>(
    `/repos/${GITHUB_REPO}/contents/${encodeURI(from)}?ref=${GITHUB_BRANCH}`,
    { token }
  );
  await putFile(to, src.content.replace(/\n/g, ""), `cms: rename → ${to}`, token);
  await deleteFile(from, `cms: rename from ${from}`, token);
}

// -- Batch commit (multiple file changes, single commit) --
export async function batchCommit(
  changes: { path: string; contentBase64: string | null }[],
  message: string,
  token: string
) {
  const ref = await gh<{ object: { sha: string } }>(
    `/repos/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`,
    { token }
  );
  const parent = ref.object.sha;
  const parentCommit = await gh<{ tree: { sha: string } }>(
    `/repos/${GITHUB_REPO}/git/commits/${parent}`,
    { token }
  );
  const baseTree = parentCommit.tree.sha;

  const treeEntries: any[] = [];
  for (const c of changes) {
    if (c.contentBase64 == null) {
      // deletion: setting sha=null on the tree entry deletes it
      treeEntries.push({
        path: c.path,
        mode: "100644",
        type: "blob",
        sha: null,
      });
    } else {
      const blob = await gh<{ sha: string }>(
        `/repos/${GITHUB_REPO}/git/blobs`,
        {
          token,
          method: "POST",
          body: JSON.stringify({
            content: c.contentBase64,
            encoding: "base64",
          }),
        }
      );
      treeEntries.push({
        path: c.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }
  }
  const tree = await gh<{ sha: string }>(
    `/repos/${GITHUB_REPO}/git/trees`,
    {
      token,
      method: "POST",
      body: JSON.stringify({ base_tree: baseTree, tree: treeEntries }),
    }
  );
  const commit = await gh<{ sha: string }>(
    `/repos/${GITHUB_REPO}/git/commits`,
    {
      token,
      method: "POST",
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [parent],
      }),
    }
  );
  await gh(`/repos/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return { commitSha: commit.sha };
}

// -- Metadata (categories, tags) — stored in public/raw/elsway/metadata.json --
const META_PATH = "public/raw/elsway/metadata.json";

type MetaMap = Record<string, { categories?: string[]; tags?: string[] }>;

export async function readMeta(token: string): Promise<MetaMap> {
  try {
    const d = await gh<{ content: string; encoding: string }>(
      `/repos/${GITHUB_REPO}/contents/${encodeURI(META_PATH)}?ref=${GITHUB_BRANCH}`,
      { token }
    );
    const raw = atob(d.content.replace(/\n/g, ""));
    return JSON.parse(raw);
  } catch (e: any) {
    if (String(e.message).includes("404")) return {};
    throw e;
  }
}

export async function writeMeta(
  update: (m: MetaMap) => MetaMap,
  message: string,
  token: string
) {
  const cur = await readMeta(token);
  const next = update({ ...cur });
  const body = JSON.stringify(next, null, 2);
  await putFile(META_PATH, b64FromString(body), message, token);
  return next;
}
