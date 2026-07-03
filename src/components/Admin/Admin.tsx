import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  BRANDS,
  WEIGHTS,
  supabase,
  STORAGE_BUCKET,
  storagePath,
  iconUrl,
  type Brand,
  type Weight,
} from "@/lib/supabase";
import "./Admin.css";

type IconRow = {
  name: string;
  categories: string[];
  tags: string[];
  updated_at?: string;
};

const emptyRow = (name = ""): IconRow => ({
  name,
  categories: [],
  tags: [],
});

const Admin: React.FC = () => {
  const { ready, user, isAllowed, signIn, signOut, configured } = useAuth();
  const [rows, setRows] = useState<IconRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (!supabase || !isAllowed) return;
    (async () => {
      const { data, error } = await supabase
        .from("icons")
        .select("*")
        .order("name");
      if (error) setStatus(`load error: ${error.message}`);
      else setRows((data as IconRow[]) ?? []);
    })();
  }, [isAllowed]);

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

  // ---- Actions ----
  const saveMeta = async (row: IconRow) => {
    if (!supabase) return;
    setBusy("Saving…");
    const { error } = await supabase
      .from("icons")
      .update({ categories: row.categories, tags: row.tags })
      .eq("name", row.name);
    setBusy("");
    if (error) return setStatus(error.message);
    setRows((r) => r.map((x) => (x.name === row.name ? row : x)));
    setStatus("Saved.");
  };

  const rename = async (oldName: string, newName: string) => {
    if (!supabase) return;
    if (!/^[a-z0-9-]+$/.test(newName))
      return setStatus("Slug must be [a-z0-9-] only.");
    setBusy("Renaming…");
    // 1. Move each of the 10 storage objects
    for (const b of BRANDS)
      for (const w of WEIGHTS) {
        const from = storagePath(b, w, oldName);
        const to = storagePath(b, w, newName);
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .move(from, to);
        if (error && !/not found/i.test(error.message)) {
          setBusy("");
          return setStatus(`storage: ${error.message}`);
        }
      }
    // 2. Update the row's primary key
    const { error } = await supabase
      .from("icons")
      .update({ name: newName })
      .eq("name", oldName);
    setBusy("");
    if (error) return setStatus(error.message);
    setRows((r) =>
      r.map((x) => (x.name === oldName ? { ...x, name: newName } : x))
    );
    setSelected(newName);
    setStatus(`Renamed → ${newName}`);
  };

  const replaceSvg = async (
    name: string,
    brand: Brand,
    weight: Weight,
    file: File
  ) => {
    if (!supabase) return;
    if (file.type !== "image/svg+xml" && !file.name.endsWith(".svg"))
      return setStatus("Only SVG files.");
    setBusy(`Uploading ${brand}/${weight}…`);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath(brand, weight, name), file, {
        upsert: true,
        contentType: "image/svg+xml",
      });
    setBusy("");
    if (error) return setStatus(error.message);
    setStatus(`Replaced ${brand}/${weight}/${name}.svg`);
  };

  const deleteIcon = async (name: string) => {
    if (!supabase) return;
    if (!confirm(`Delete "${name}" from all brands and weights?`)) return;
    setBusy("Deleting…");
    const paths = BRANDS.flatMap((b) =>
      WEIGHTS.map((w) => storagePath(b, w, name))
    );
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    const { error } = await supabase.from("icons").delete().eq("name", name);
    setBusy("");
    if (error) return setStatus(error.message);
    setRows((r) => r.filter((x) => x.name !== name));
    if (selected === name) setSelected(null);
    setStatus(`Deleted ${name}`);
  };

  const [newIcon, setNewIcon] = useState<{
    name: string;
    categories: string;
    tags: string;
    files: Partial<Record<`${Brand}__${Weight}`, File>>;
  }>({ name: "", categories: "", tags: "", files: {} });

  const addNew = async () => {
    if (!supabase) return;
    const name = newIcon.name.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(name))
      return setStatus("Slug must be [a-z0-9-] only.");
    if (rows.some((r) => r.name === name))
      return setStatus("Name already exists.");
    // MANDATE: every brand × weight must have a file.
    const missing: string[] = [];
    for (const b of BRANDS)
      for (const w of WEIGHTS)
        if (!newIcon.files[`${b}__${w}`]) missing.push(`${b}/${w}`);
    if (missing.length)
      return setStatus(
        `Provide SVGs for all ${BRANDS.length * WEIGHTS.length} combos. Missing: ${missing.join(", ")}`
      );
    setBusy("Uploading new icon…");
    for (const b of BRANDS)
      for (const w of WEIGHTS) {
        const file = newIcon.files[`${b}__${w}`]!;
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath(b, w, name), file, {
            upsert: false,
            contentType: "image/svg+xml",
          });
        if (error) {
          setBusy("");
          return setStatus(`upload ${b}/${w}: ${error.message}`);
        }
      }
    const row: IconRow = {
      name,
      categories: newIcon.categories.split(",").map((s) => s.trim()).filter(Boolean),
      tags: newIcon.tags.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const { error } = await supabase.from("icons").insert(row);
    setBusy("");
    if (error) return setStatus(error.message);
    setRows((r) => [...r, row].sort((a, b) => a.name.localeCompare(b.name)));
    setNewIcon({ name: "", categories: "", tags: "", files: {} });
    setStatus(`Added ${name}`);
  };

  // ---- Render ----
  if (!ready)
    return <div className="admin-shell admin-msg">Loading…</div>;

  if (!configured)
    return (
      <div className="admin-shell admin-msg">
        <h1>CMS not configured</h1>
        <p>
          Set <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> in your environment. See{" "}
          <code>supabase/schema.sql</code> and the setup checklist.
        </p>
      </div>
    );

  if (!user)
    return (
      <div className="admin-shell admin-msg">
        <h1>Sign in required</h1>
        <p>Use your @cars24.com Google account.</p>
        <button className="admin-btn primary" onClick={signIn}>
          Sign in with Google
        </button>
      </div>
    );

  if (!isAllowed)
    return (
      <div className="admin-shell admin-msg">
        <h1>Not authorized</h1>
        <p>
          Signed in as <code>{user.email}</code>. Only @cars24.com accounts can
          use the CMS.
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
          <span className="admin-muted"> · {user.email}</span>
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
              You must upload SVGs for <strong>all {BRANDS.length} brands ×{" "}
              {WEIGHTS.length} weights = {BRANDS.length * WEIGHTS.length} files</strong>.
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
                    <span>{b}/{w}</span>
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
              <span>{b}/{w}</span>
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

      <button
        className="admin-btn danger"
        onClick={() => onDelete(row.name)}
      >
        Delete icon
      </button>
    </section>
  );
};

export default Admin;
