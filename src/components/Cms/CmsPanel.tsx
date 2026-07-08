import React, { useEffect, useState } from "react";
import {
  BRANDS,
  WEIGHTS,
  useAuth,
  putFile,
  batchCommit,
  renameFile,
  writeMeta,
  readMeta,
  b64FromAny,
  type Brand,
  type Weight,
} from "@/lib/github";
import "./Cms.css";

const svgPath = (b: Brand, w: Weight, name: string) =>
  `public/raw/elsway/${b}/${w}/${name}.svg`;

/**
 * CmsPanel — embedded inside the icon detail popover when the user is signed
 * in with write access. Shows Rename / Replace SVG / Edit tags & categories /
 * Delete controls for the currently-selected icon.
 */
const CmsPanel: React.FC<{
  iconName: string;
  initialCategories?: string[];
  onNameChanged?: (newName: string) => void;
  onDeleted?: () => void;
}> = ({ iconName, initialCategories, onNameChanged, onDeleted }) => {
  const { canWrite, token } = useAuth();
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [name, setName] = useState(iconName);
  const [categories, setCategories] = useState((initialCategories ?? []).join(", "));
  const [tags, setTags] = useState("");

  // Load metadata (tags/categories overrides) once we know we can write.
  useEffect(() => {
    if (!canWrite || !token) return;
    let alive = true;
    readMeta(token)
      .then((m) => {
        if (!alive) return;
        const entry = m[iconName];
        if (entry?.tags) setTags(entry.tags.join(", "));
        if (entry?.categories)
          setCategories(entry.categories.join(", "));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [iconName, canWrite, token]);

  useEffect(() => {
    setName(iconName);
  }, [iconName]);

  if (!canWrite || !token) return null;

  const saveMeta = async () => {
    setBusy("Committing…");
    try {
      await writeMeta(
        (m) => {
          m[iconName] = {
            categories: categories.split(",").map((s) => s.trim()).filter(Boolean),
            tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
          };
          return m;
        },
        `cms: meta ${iconName}`,
        token
      );
      setStatus("Metadata saved.");
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  const rename = async () => {
    const newName = name.trim();
    if (newName === iconName) return;
    if (!/^[a-z0-9-]+$/.test(newName)) {
      setStatus("Slug must be [a-z0-9-] only.");
      return;
    }
    setBusy("Renaming (10 files)…");
    try {
      for (const b of BRANDS)
        for (const w of WEIGHTS)
          await renameFile(
            svgPath(b, w, iconName),
            svgPath(b, w, newName),
            token
          );
      await writeMeta(
        (m) => {
          if (m[iconName]) {
            m[newName] = m[iconName];
            delete m[iconName];
          }
          return m;
        },
        `cms: rename meta ${iconName} → ${newName}`,
        token
      );
      setStatus(`Renamed → ${newName}`);
      onNameChanged?.(newName);
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  const replace = async (b: Brand, w: Weight, file: File) => {
    if (file.type !== "image/svg+xml" && !file.name.endsWith(".svg")) {
      setStatus("Only SVG files.");
      return;
    }
    setBusy(`Uploading ${b}/${w}…`);
    try {
      const b64 = await b64FromAny(file);
      await putFile(
        svgPath(b, w, iconName),
        b64,
        `cms: replace ${b}/${w}/${iconName}`,
        token
      );
      setStatus(`Replaced ${b}/${w}.`);
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  const del = async () => {
    if (!confirm(`Delete "${iconName}" from all brands and weights?`)) return;
    setBusy("Deleting…");
    try {
      const changes = BRANDS.flatMap((b) =>
        WEIGHTS.map((w) => ({
          path: svgPath(b, w, iconName),
          contentBase64: null as string | null,
        }))
      );
      await batchCommit(changes, `cms: delete ${iconName}`, token);
      await writeMeta(
        (m) => {
          delete m[iconName];
          return m;
        },
        `cms: meta drop ${iconName}`,
        token
      );
      setStatus(`Deleted.`);
      onDeleted?.();
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  return (
    <details className="cms-panel">
      <summary>CMS · Edit this icon</summary>
      {(busy || status) && (
        <div className={`cms-status ${busy ? "busy" : ""}`}>
          {busy || status}
        </div>
      )}

      <div className="cms-row">
        <label>Slug</label>
        <div className="cms-inline">
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            className="cms-btn"
            onClick={rename}
            disabled={name === iconName || !!busy}
          >
            Rename
          </button>
        </div>
      </div>
      <div className="cms-row">
        <label>Categories (comma-separated)</label>
        <input
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
        />
      </div>
      <div className="cms-row">
        <label>Tags (comma-separated)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      <button
        type="button"
        className="cms-btn primary"
        onClick={saveMeta}
        disabled={!!busy}
      >
        Save metadata
      </button>

      <h4>Replace SVG per brand × weight</h4>
      <div className="cms-matrix">
        {BRANDS.map((b) =>
          WEIGHTS.map((w) => (
            <label key={`${b}-${w}`} className="cms-matrix-cell">
              <span className="cms-slot">
                {b}/{w}
              </span>
              <span className="cms-file-btn">
                Choose file
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) replace(b, w, f);
                  }}
                />
              </span>
            </label>
          ))
        )}
      </div>

      <button
        type="button"
        className="cms-btn danger"
        onClick={del}
        disabled={!!busy}
      >
        Delete icon
      </button>
    </details>
  );
};

export default CmsPanel;
