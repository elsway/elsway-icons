import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { icons, useApplicationStore } from "@/state";
import { iconUrl } from "@/lib/github";
import { IconStyle } from "@/lib/types";
import "./DownloadLibrary.css";

type Format = "svg" | "json" | "ttf" | "png";

const FORMATS: { id: Format; label: string; blurb: string }[] = [
  { id: "svg", label: "SVG", blurb: "One file per icon, exactly as drawn" },
  { id: "json", label: "JSON", blurb: "Names, categories and font codepoints" },
  { id: "ttf", label: "TTF", blurb: "Icon font, CSS and codepoints" },
  { id: "png", label: "PNG", blurb: "Rasterised at 128px, transparent" },
];

const PNG_SIZE = 128;
/** Chosen to stay well under the browser's parallel-request ceiling. */
const BATCH = 24;

async function mapInBatches<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  onProgress: (done: number) => void
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    out.push(
      ...(await Promise.all(slice.map((it, j) => fn(it, i + j))))
    );
    onProgress(Math.min(i + BATCH, items.length));
  }
  return out;
}

/** Rasterise an SVG string to a transparent PNG via canvas. */
function svgToPng(svg: string, size: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

const DownloadLibrary: React.FC = () => {
  const brand = useApplicationStore.use.iconBrand();
  const weight = useApplicationStore.use.iconWeight();
  const weightFolder = weight === IconStyle.FILL ? "fill" : "regular";

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const base = import.meta.env.BASE_URL;
  const fontName = `autonaut-${brand}-${weightFolder}`;
  const total = icons.length;

  const close = () => {
    if (busy) return; // never leave a half-built zip behind
    setOpen(false);
    setError(null);
    setProgress(0);
  };

  const build = async (format: Format) => {
    setBusy(format);
    setError(null);
    setProgress(0);
    try {
      const zip = new JSZip();
      const stamp = `autonaut-icons-${brand}-${weightFolder}`;

      if (format === "json") {
        zip.file(
          "icons.json",
          JSON.stringify(
            {
              brand,
              weight: weightFolder,
              count: total,
              icons: icons.map((i) => ({
                name: i.name,
                categories: i.categories,
                codepoint: i.codepoint,
                unicode: `U+${i.codepoint.toString(16).toUpperCase()}`,
                svg: `raw/elsway/${brand}/${weightFolder}/${i.name}.svg`,
              })),
            },
            null,
            2
          )
        );
        setProgress(total);
      }

      if (format === "ttf") {
        const dir = `${base}font/${brand}-${weightFolder}`;
        const files = [
          `${fontName}.ttf`,
          `${fontName}.woff`,
          `${fontName}.css`,
          "README.txt",
        ];
        await mapInBatches(
          files,
          async (f) => {
            const res = await fetch(`${dir}/${f}`);
            if (!res.ok) throw new Error(`${f} — ${res.status}`);
            zip.file(f, await res.blob());
          },
          () => setProgress(total)
        );
        // shared across every brand, so it lives a level up
        const cps = await fetch(`${base}font/codepoints.json`);
        if (cps.ok) zip.file("codepoints.json", await cps.blob());
      }

      if (format === "svg" || format === "png") {
        const folder = zip.folder(format)!;
        await mapInBatches(
          icons,
          async (icon) => {
            const res = await fetch(iconUrl(brand, weightFolder, icon.name));
            if (!res.ok) return;
            if (format === "svg") {
              folder.file(`${icon.name}.svg`, await res.text());
            } else {
              const png = await svgToPng(await res.text(), PNG_SIZE);
              if (png) folder.file(`${icon.name}.png`, png);
            }
          },
          setProgress
        );
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${stamp}-${format}.zip`);
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not build the download."
      );
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  return (
    <>
      <button
        type="button"
        className="download-library-btn"
        onClick={() => setOpen(true)}
      >
        <i className="ai ai-cloud-download" aria-hidden />
        <span>Download library</span>
      </button>

      {open && (
        <div
          className="dl-scrim"
          role="dialog"
          aria-modal="true"
          aria-label="Download the icon library"
          onClick={close}
        >
          <div className="dl-sheet" onClick={(e) => e.stopPropagation()}>
            <header className="dl-head">
              <h2>Download library</h2>
              <p>
                {total.toLocaleString()} icons · {brand} · {weightFolder}
              </p>
            </header>

            <div className="dl-formats">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="dl-format"
                  disabled={!!busy}
                  onClick={() => build(f.id)}
                >
                  <span className="dl-format-label">{f.label}</span>
                  <span className="dl-format-blurb">{f.blurb}</span>
                  {busy === f.id && (
                    <span className="dl-progress">
                      {progress
                        ? `${Math.round((progress / total) * 100)}%`
                        : "starting…"}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {error && <p className="dl-error">{error}</p>}

            <footer className="dl-foot">
              <span>
                {busy
                  ? "Building the archive — this runs in your browser."
                  : "Switch brand or weight first to change what you get."}
              </span>
              <button type="button" onClick={close} disabled={!!busy}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default DownloadLibrary;
