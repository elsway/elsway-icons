import React, { useState } from "react";
import {
  BRANDS,
  WEIGHTS,
  useAuth,
  batchCommit,
  writeMeta,
  b64FromAny,
  type Brand,
  type Weight,
} from "@/lib/github";
import "./Cms.css";

const svgPath = (b: Brand, w: Weight, name: string) =>
  `public/raw/elsway/${b}/${w}/${name}.svg`;

const NewIconModal: React.FC<{
  onClose: () => void;
  onCreated?: (name: string) => void;
}> = ({ onClose, onCreated }) => {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState<
    Partial<Record<`${Brand}__${Weight}`, File>>
  >({});
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");

  const requiredCount = BRANDS.length * WEIGHTS.length;
  const filledCount = Object.values(files).filter(Boolean).length;

  const submit = async () => {
    if (!token) return;
    const slug = name.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setStatus("Slug must be [a-z0-9-] only.");
      return;
    }
    const missing: string[] = [];
    for (const b of BRANDS)
      for (const w of WEIGHTS)
        if (!files[`${b}__${w}`]) missing.push(`${b}/${w}`);
    if (missing.length) {
      setStatus(`Missing SVGs: ${missing.join(", ")}`);
      return;
    }
    setBusy("Uploading (single commit)…");
    try {
      const changes: { path: string; contentBase64: string }[] = [];
      for (const b of BRANDS)
        for (const w of WEIGHTS) {
          const f = files[`${b}__${w}`]!;
          changes.push({
            path: svgPath(b, w, slug),
            contentBase64: await b64FromAny(f),
          });
        }
      await batchCommit(changes, `cms: add icon ${slug}`, token);
      const cats = categories.split(",").map((s) => s.trim()).filter(Boolean);
      const tg = tags.split(",").map((s) => s.trim()).filter(Boolean);
      await writeMeta(
        (m) => {
          m[slug] = { categories: cats, tags: tg };
          return m;
        },
        `cms: meta ${slug}`,
        token
      );
      onCreated?.(slug);
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
          <h2>Add new icon</h2>
          <button className="cms-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
        <p className="cms-hint">
          Upload SVGs for <strong>all {requiredCount} combos</strong> ({filledCount}/
          {requiredCount} chosen). Everything lands in one commit.
        </p>

        {(busy || status) && (
          <div className={`cms-status ${busy ? "busy" : ""}`}>{busy || status}</div>
        )}

        <div className="cms-row">
          <label>Slug (a-z, 0-9, hyphen)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-new-icon"
            autoFocus
          />
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

        <h4>SVGs · {filledCount}/{requiredCount}</h4>
        <div className="cms-matrix">
          {BRANDS.map((b) =>
            WEIGHTS.map((w) => (
              <label
                key={`${b}-${w}`}
                className={`cms-matrix-cell ${
                  files[`${b}__${w}`] ? "filled" : ""
                }`}
              >
                <span className="cms-slot">
                  {b}/{w}
                </span>
                <span className="cms-file-btn">
                  {files[`${b}__${w}`] ? "Change" : "Choose"}
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        setFiles((s) => ({ ...s, [`${b}__${w}`]: f }));
                    }}
                  />
                </span>
              </label>
            ))
          )}
        </div>

        <button
          className="cms-btn primary big"
          onClick={submit}
          disabled={!!busy || filledCount !== requiredCount || !name.trim()}
        >
          {busy ? busy : `Upload icon (${filledCount}/${requiredCount})`}
        </button>
      </div>
    </div>
  );
};

export default NewIconModal;
