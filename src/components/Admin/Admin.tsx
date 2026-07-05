import React, { useEffect, useMemo, useState } from "react";
import {
  BRANDS,
  WEIGHTS,
  iconUrl,
  useAuth,
  putFile,
  batchCommit,
  renameFile,
  writeMeta,
  readMeta,
  b64FromAny,
  type Brand,
  type Weight,
  GITHUB_REPO,
} from "@/lib/github";
import "./Admin.css";

type IconRow = {
  name: string;
  categories: string[];
  tags: string[];
};

const svgPath = (b: Brand, w: Weight, name: string) =>
  `public/raw/elsway/${b}/${w}/${name}.svg`;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url + `?t=${Date.now()}`);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

const Admin: React.FC = () => {
  const {
    ready,
    configured,
    user,
    canWrite,
    token,
    signingIn,
    signIn,
    signOut,
  } = useAuth();
  const [rows, setRows] = useState<IconRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!canWrite || !token) return;
    (async () => {
      const base = import.meta.env.BASE_URL;
      const [manifest, categories, meta] = await Promise.all([
        fetchJson<string[]>(`${base}raw/elsway/manifest.json`),
        fetchJson<Record<string, string[]>>(
          `${base}raw/elsway/categories.json`
        ),
        readMeta(token).catch(() => ({}) as any),
      ]);
      if (!manifest) return setStatus("Could not load manifest.");
      const out: IconRow[] = manifest.map((name) => ({
        name,
        categories: meta?.[name]?.categories ?? categories?.[name] ?? [],
        tags: meta?.[name]?.tags ?? [],
      }));
      setRows(out);
    })();
  }, [canWrite, token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.tags.some((t) => t.toLowerCase().includes(s)) ||
        r.categories.some((c) => c.toLowerCase().includes(s))
    );
  }, [rows, q]);

  const current = rows.find((r) => r.name === selected) ?? null;

  const saveMeta = async (row: IconRow) => {
    if (!token) return;
    setBusy("Committing metadata…");
    try {
      await writeMeta(
        (m) => {
          m[row.name] = { categories: row.categories, tags: row.tags };
          return m;
        },
        `cms: meta ${row.name}`,
        token
      );
      setRows((r) => r.map((x) => (x.name === row.name ? row : x)));
      setStatus("Saved.");
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  const rename = async (oldName: string, newName: string) => {
    if (!token) return;
    if (!/^[a-z0-9-]+$/.test(newName))
      return setStatus("Slug must be [a-z0-9-] only.");
    setBusy("Renaming (10 files)…");
    try {
      for (const b of BRANDS)
        for (const w of WEIGHTS)
          await renameFile(
            svgPath(b, w, oldName),
            svgPath(b, w, newName),
            token
          );
      // update metadata key
      await writeMeta(
        (m) => {
          if (m[oldName]) {
            m[newName] = m[oldName];
            delete m[oldName];
          }
          return m;
        },
        `cms: rename meta ${oldName} → ${newName}`,
        token
      );
      setRows((r) =>
        r.map((x) => (x.name === oldName ? { ...x, name: newName } : x))
      );
      setSelected(newName);
      setStatus(`Renamed → ${newName}`);
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  const replaceSvg = async (
    name: string,
    brand: Brand,
    weight: Weight,
    file: File
  ) => {
    if (!token) return;
    if (file.type !== "image/svg+xml" && !file.name.endsWith(".svg"))
      return setStatus("Only SVG files.");
    setBusy(`Uploading ${brand}/${weight}…`);
    try {
      const b64 = await b64FromAny(file);
      await putFile(
        svgPath(brand, weight, name),
        b64,
        `cms: replace ${brand}/${weight}/${name}`,
        token
      );
      setStatus(`Replaced ${brand}/${weight}/${name}.svg`);
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  const deleteIcon = async (name: string) => {
    if (!token) return;
    if (!confirm(`Delete "${name}" from all brands and weights?`)) return;
    setBusy("Deleting (single commit)…");
    try {
      const changes = BRANDS.flatMap((b) =>
        WEIGHTS.map((w) => ({ path: svgPath(b, w, name), contentBase64: null }))
      );
      await batchCommit(changes, `cms: delete ${name}`, token);
      await writeMeta(
        (m) => {
          delete m[name];
          return m;
        },
        `cms: meta drop ${name}`,
        token
      );
      setRows((r) => r.filter((x) => x.name !== name));
      if (selected === name) setSelected(null);
      setStatus(`Deleted ${name}`);
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  const [newIcon, setNewIcon] = useState<{
    name: string;
    categories: string;
    tags: string;
    files: Partial<Record<`${Brand}__${Weight}`, File>>;
  }>({ name: "", categories: "", tags: "", files: {} });

  const addNew = async () => {
    if (!token) return;
    const name = newIcon.name.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(name))
      return setStatus("Slug must be [a-z0-9-] only.");
    if (rows.some((r) => r.name === name))
      return setStatus("Name already exists.");
    const missing: string[] = [];
    for (const b of BRANDS)
      for (const w of WEIGHTS)
        if (!newIcon.files[`${b}__${w}`]) missing.push(`${b}/${w}`);
    if (missing.length)
      return setStatus(
        `Provide SVGs for all ${BRANDS.length * WEIGHTS.length} combos. Missing: ${missing.join(
          ", "
        )}`
      );
    setBusy("Uploading new icon (single commit)…");
    try {
      const changes: { path: string; contentBase64: string }[] = [];
      for (const b of BRANDS)
        for (const w of WEIGHTS) {
          const f = newIcon.files[`${b}__${w}`]!;
          changes.push({
            path: svgPath(b, w, name),
            contentBase64: await b64FromAny(f),
          });
        }
      await batchCommit(changes, `cms: add icon ${name}`, token);
      const cats = newIcon.categories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const tags = newIcon.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await writeMeta(
        (m) => {
          m[name] = { categories: cats, tags };
          return m;
        },
        `cms: meta ${name}`,
        token
      );
      setRows((r) =>
        [...r, { name, categories: cats, tags }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setNewIcon({ name: "", categories: "", tags: "", files: {} });
      setStatus(`Added ${name}`);
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  // ---- Render ----
  if (!ready) return <div className="admin-shell admin-msg">Loading…</div>;

  if (!configured)
    return (
      <div className="admin-shell admin-msg">
        <h1>CMS not configured</h1>
        <p>
          Set <code>VITE_GITHUB_CLIENT_ID</code> in your environment. See{" "}
          <code>CMS-SETUP.md</code>.
        </p>
      </div>
    );

  if (!user)
    return (
      <div className="admin-shell admin-msg">
        <h1>Sign in required</h1>
        <p>
          You need write access to <code>{GITHUB_REPO}</code>.
        </p>
        <button
          className="admin-btn primary"
          onClick={signIn}
          disabled={signingIn}
        >
          {signingIn ? "Waiting for GitHub…" : "Sign in with GitHub"}
        </button>
      </div>
    );

  if (!canWrite)
    return (
      <div className="admin-shell admin-msg">
        <h1>Not authorized</h1>
        <p>
          Signed in as <code>@{user.login}</code>, but you don't have write
          access to <code>{GITHUB_REPO}</code>.
        </p>
        <button className="admin-btn" onClick={signOut}>
          Sign out
        </button>
      </div>
    );

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <strong>Elsway CMS</strong>
          <span className="admin-muted">
            {" "}
            · @{user.login} · {GITHUB_REPO}
          </span>
        </div>
        <div className="admin-tools">
          <input
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <a className="admin-btn" href={import.meta.env.BASE_URL || "/"}>
            ← Back
          </a>
          <button className="admin-btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {status && <div className="admin-status">{status}</div>}
      {busy && <div className="admin-status busy">{busy}</div>}

      <div className="admin-body">
        <aside className="admin-list">
          <div className="admin-list-count">
            {filtered.length.toLocaleString()} / {rows.length.toLocaleString()}
          </div>
          <ul>
            {filtered.slice(0, 500).map((r) => (
              <li key={r.name}>
                <button
                  className={`admin-list-item ${
                    selected === r.name ? "active" : ""
                  }`}
                  onClick={() => setSelected(r.name)}
                >
                  <img
                    src={iconUrl("cars24", "regular", r.name)}
                    alt=""
                    width={20}
                    height={20}
                  />
                  <span>{r.name}</span>
                </button>
              </li>
            ))}
            {filtered.length > 500 && (
              <li className="admin-muted admin-note">
                showing first 500 — refine search to see more
              </li>
            )}
          </ul>
        </aside>

        <main className="admin-editor">
          {!current ? (
            <div className="admin-empty">
              Select an icon on the left, or scroll down to add a new one.
              <br />
              <span className="admin-muted">
                Every change is a git commit authored by @{user.login}. Vercel
                rebuilds automatically.
              </span>
            </div>
          ) : (
            <IconEditor
              row={current}
              onSave={saveMeta}
              onRename={rename}
              onReplace={replaceSvg}
              onDelete={deleteIcon}
            />
          )}

          <section className="admin-new">
            <h2>Add new icon</h2>
            <p className="admin-muted">
              You must upload SVGs for{" "}
              <strong>
                all {BRANDS.length} brands × {WEIGHTS.length} weights ={" "}
                {BRANDS.length * WEIGHTS.length} files
              </strong>
              . All uploaded in a single commit.
            </p>
            <div className="admin-field">
              <label>Slug</label>
              <input
                value={newIcon.name}
                onChange={(e) =>
                  setNewIcon((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="my-new-icon"
              />
            </div>
            <div className="admin-field">
              <label>Categories (comma-separated)</label>
              <input
                value={newIcon.categories}
                onChange={(e) =>
                  setNewIcon((s) => ({ ...s, categories: e.target.value }))
                }
              />
            </div>
            <div className="admin-field">
              <label>Tags (comma-separated)</label>
              <input
                value={newIcon.tags}
                onChange={(e) =>
                  setNewIcon((s) => ({ ...s, tags: e.target.value }))
                }
              />
            </div>
            <div className="admin-matrix">
              {BRANDS.map((b) =>
                WEIGHTS.map((w) => (
                  <label
                    key={`${b}-${w}`}
                    className={`admin-matrix-cell ${
                      newIcon.files[`${b}__${w}`] ? "filled" : ""
                    }`}
                  >
                    <span>
                      {b}/{w}
                    </span>
                    <input
                      type="file"
                      accept=".svg,image/svg+xml"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f)
                          setNewIcon((s) => ({
                            ...s,
                            files: { ...s.files, [`${b}__${w}`]: f },
                          }));
                      }}
                    />
                  </label>
                ))
              )}
            </div>
            <button className="admin-btn primary" onClick={addNew}>
              Upload icon
            </button>
          </section>
        </main>
      </div>
    </div>
  );
};

const IconEditor: React.FC<{
  row: IconRow;
  onSave: (r: IconRow) => void;
  onRename: (oldName: string, newName: string) => void;
  onReplace: (name: string, b: Brand, w: Weight, f: File) => void;
  onDelete: (name: string) => void;
}> = ({ row, onSave, onRename, onReplace, onDelete }) => {
  const [name, setName] = useState(row.name);
  const [cats, setCats] = useState(row.categories.join(", "));
  const [tags, setTags] = useState(row.tags.join(", "));
  useEffect(() => {
    setName(row.name);
    setCats(row.categories.join(", "));
    setTags(row.tags.join(", "));
  }, [row.name]);

  return (
    <section className="admin-icon">
      <h2>{row.name}</h2>
      <div className="admin-field">
        <label>Slug</label>
        <div className="admin-row">
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="admin-btn"
            disabled={name === row.name}
            onClick={() => onRename(row.name, name.trim())}
          >
            Rename
          </button>
        </div>
      </div>
      <div className="admin-field">
        <label>Categories</label>
        <input value={cats} onChange={(e) => setCats(e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Tags</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      <button
        className="admin-btn primary"
        onClick={() =>
          onSave({
            ...row,
            categories: cats.split(",").map((s) => s.trim()).filter(Boolean),
            tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
          })
        }
      >
        Save metadata
      </button>

      <h3>Replace SVGs</h3>
      <div className="admin-matrix">
        {BRANDS.map((b) =>
          WEIGHTS.map((w) => (
            <div key={`${b}-${w}`} className="admin-matrix-cell view">
              <img
                src={`${iconUrl(b, w, row.name)}?t=${Date.now()}`}
                alt=""
                width={40}
                height={40}
                loading="lazy"
              />
              <span>
                {b}/{w}
              </span>
              <label className="admin-file-label">
                Replace
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onReplace(row.name, b, w, f);
                  }}
                />
              </label>
            </div>
          ))
        )}
      </div>

      <button className="admin-btn danger" onClick={() => onDelete(row.name)}>
        Delete icon
      </button>
    </section>
  );
};

export default Admin;
