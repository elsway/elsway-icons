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
  iconUrl,
  type Brand,
  type Weight,
} from "@/lib/github";
import "./Cms.css";

const svgPath = (b: Brand, w: Weight, name: string) =>
  `public/raw/elsway/${b}/${w}/${name}.svg`;

/**
 * Full edit modal. Opened when the user clicks "Edit this icon" from the
 * detail popover. Replaces the popover — never both open at once.
 */
const EditIconModal: React.FC<{
  iconName: string;
  initialCategories?: string[];
  onClose: () => void;
  onNameChanged?: (newName: string) => void;
  onDeleted?: () => void;
}> = ({ iconName, initialCategories, onClose, onNameChanged, onDeleted }) => {
  const { canWrite, token } = useAuth();
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [name, setName] = useState(iconName);
  const [categories, setCategories] = useState(
    (initialCategories ?? []).join(", ")
  );
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!canWrite || !token) return;
    let alive = true;
    readMeta(token)
      .then((m) => {
        if (!alive) return;
        const entry = m[iconName];
        if (entry?.tags) setTags(entry.tags.join(", "));
        if (entry?.categories) setCategories(entry.categories.join(", "));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [iconName, canWrite, token]);

  if (!canWrite || !token) return null;

  const saveMeta = async () => {
    setBusy("Committing metadata…");
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
      onClose();
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
    setBusy("");
  };

  return (
    <div className="cms-modal-backdrop" onClick={onClose}>
      <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cms-modal-header">
          <h2>Edit · {iconName}</h2>
          <button className="cms-btn" onClick={onClose}>
            Close
          </button>
        </div>

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
              <div key={`${b}-${w}`} className="cms-matrix-cell">
                <img
                  src={`${iconUrl(b, w, iconName)}?t=${Date.now()}`}
                  alt=""
                  width={22}
                  height={22}
                  loading="lazy"
                />
                <span className="cms-slot">
                  {b}/{w}
                </span>
                <label className="cms-file-btn">
                  Replace
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) replace(b, w, f);
                    }}
                  />
                </label>
              </div>
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
      </div>
    </div>
  );
};

export default EditIconModal;
