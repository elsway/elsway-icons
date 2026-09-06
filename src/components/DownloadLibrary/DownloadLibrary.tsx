import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { icons, useApplicationStore, type IconBrand } from "@/state";
import { iconUrl } from "@/lib/github";
import { IconStyle } from "@/lib/types";
import codepoints from "../../../public/font/codepoints.json";
import "./DownloadLibrary.css";

type Format = "svg" | "json" | "ttf" | "png";

const FORMATS: { id: Format; label: string; blurb: string }[] = [
  { id: "svg", label: "SVG", blurb: "One file per icon, exactly as drawn" },
  { id: "json", label: "JSON", blurb: "Names, categories and font codepoints" },
  { id: "ttf", label: "TTF", blurb: "Both weights in one font, plus CSS" },
  { id: "png", label: "PNG", blurb: "Rasterised at 128px, transparent" },
];

const BRANDS: { value: IconBrand; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "cars24", label: "Cars24" },
  { value: "teambhp", label: "TeamBHP" },
  { value: "carinfo", label: "CarInfo" },
  { value: "vehicleinfo", label: "VehicleInfo" },
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

type Props = {
  className?: string;
  children?: React.ReactNode;
  onOpen?: () => void;
};

const DownloadLibrary: React.FC<Props> = ({
  className,
  children,
  onOpen,
  ...rest
}) => {
  const gridBrand = useApplicationStore.use.iconBrand();
  const weight = useApplicationStore.use.iconWeight();
  const [brand, setBrand] = useState<IconBrand>(gridBrand);
  const weightFolder = weight === IconStyle.FILL ? "fill" : "regular";

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const base = import.meta.env.BASE_URL;
  const fontName = `autonaut-${brand}`;
  const total = icons.length;

  const close = useCallback(() => {
    if (busy) return; // never leave a half-built zip behind
    setOpen(false);
    setError(null);
    setProgress(0);
  }, [busy]);

  // The scrim only dims; it does not capture pointer events. That way a press
  // outside dismisses this sheet *and* still activates whatever it landed on,
  // so clicking another trigger opens that popover in the same gesture.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (
        sheetRef.current &&
        e.target instanceof Node &&
        !sheetRef.current.contains(e.target)
      ) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

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
              icons: icons.map((i) => {
                const glyph = `${i.name}-${weightFolder}`;
                const cp = (codepoints as Record<string, number>)[glyph];
                return {
                  name: i.name,
                  categories: i.categories,
                  glyph,
                  codepoint: cp,
                  unicode: cp
                    ? `U+${cp.toString(16).toUpperCase()}`
                    : undefined,
                  svg: `raw/elsway/${brand}/${weightFolder}/${i.name}.svg`,
                };
              }),
            },
            null,
            2
          )
        );
        setProgress(total);
      }

      if (format === "ttf") {
        const dir = `${base}font/${brand}`;
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
        className={className ?? "download-library-btn"}
        onClick={() => {
          onOpen?.();
          setBrand(gridBrand);
          setOpen(true);
        }}
        {...rest}
      >
        {children ?? (
          <>
            <i className="ai ai-cloud-download" aria-hidden />
            <span>Download library</span>
          </>
        )}
      </button>

      {open &&
        createPortal(
            <div
              className="dl-scrim"
            role="dialog"
            aria-modal="true"
            aria-label="Download the icon library"
          >
            <div className="dl-sheet" ref={sheetRef}>
              <header className="dl-head">
              <div className="dl-head-text">
                <h2>Download library</h2>
                <p>
                  {total.toLocaleString()} icons · {weightFolder}
                </p>
              </div>

              <div className="dl-brand">
                <span className="dl-brand-control">
                  <select
                    value={brand}
                    aria-label="Brand"
                    disabled={!!busy}
                    onChange={(e) =>
                      setBrand(e.currentTarget.value as IconBrand)
                    }
                  >
                    {BRANDS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  <i className="ai-fill ai-chevron-bottom" aria-hidden />
                </span>
              </div>
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
                    : "Weight follows the toolbar; brand is set here."}
                </span>
                <button type="button" onClick={close} disabled={!!busy}>
                  Close
                </button>
              </footer>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default DownloadLibrary;
