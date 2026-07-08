import React, {
  useState,
  useEffect,
  useMemo,
  HTMLAttributes,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { motion, AnimatePresence, Variants } from "motion/react";
import { Svg2Png } from "svg2png-converter";
import { saveAs } from "file-saver";
import {
  CopyIcon,
  CheckCircleIcon,
  ArrowFatLinesDownIcon,
  XCircleIcon,
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
} from "@elsway-icons/react";
import { IconStyle } from "@elsway-icons/core";
import ReactGA from "react-ga4";

import Tabs, { Tab } from "@/components/Tabs";
import { useMediaQuery, useTransientState, useSessionStorage } from "@/hooks";
import { SnippetType } from "@/lib";
import { useApplicationStore } from "@/state";
import { getCodeSnippets, supportsWeight } from "@/utils";
import { useAuth } from "@/lib/github";

import TagCloud from "./TagCloud";

const variants: Record<string, Variants> = {
  desktop: {
    initial: { y: 188 },
    animate: { y: 0 },
    exit: { y: 188 },
  },
  mobile: {
    initial: { y: "60vh" },
    animate: { y: 0 },
    exit: { y: "60vh" },
  },
};

const RENDERED_SNIPPETS = [
  SnippetType.REACT,
  SnippetType.HTML,
  SnippetType.VUE,
  SnippetType.FLUTTER,
  SnippetType.ELM,
  SnippetType.SWIFT,
];

enum CopyType {
  SVG,
  SVG_RAW,
  SVG_DATA,
  PNG,
  PNG_DATA,
  UNICODE,
}

function cloneWithSize(svg: SVGSVGElement, size: number): SVGSVGElement {
  const sized = svg.cloneNode(true) as SVGSVGElement;
  sized.setAttribute("width", `${size}`);
  sized.setAttribute("height", `${size}`);
  return sized;
}

const ActionButton = (
  props: {
    active?: boolean;
    label: string;
    download?: boolean;
    disabled?: boolean;
  } & HTMLAttributes<HTMLButtonElement>
) => {
  const { active, download, label, ...rest } = props;
  const Icon = download ? ArrowFatLinesDownIcon : CopyIcon;
  return (
    <button
      {...rest}
      className={`action-button text ${props.disabled ? "disabled" : ""}`}
      aria-disabled={props.disabled}
      tabIndex={0}
    >
      {active ? (
        <CheckCircleIcon size={20} color="var(--olive)" weight="fill" />
      ) : (
        <Icon size={20} color="currentColor" weight="fill" />
      )}
      {label}
    </button>
  );
};

const Panel = () => {
  const {
    iconWeight: weight,
    iconSize: size,
    iconColor: color,
    selectionEntry: entry,
    setSelectionEntry,
    iconBrand: brand,
  } = useApplicationStore();
  const weightFolder = weight === IconStyle.FILL ? "fill" : "regular";
  const elswaySrc = entry
    ? `${import.meta.env.BASE_URL}raw/elsway/${brand}/${weightFolder}/${
        entry.name
      }.svg`
    : "";

  const [copied, setCopied] = useTransientState<SnippetType | CopyType | false>(
    false,
    2000
  );

  const [showMoreActions, setShowMoreActions] = useState<boolean>(false);

  const [i, setInitialTab] = useSessionStorage("tab", 0);

  const isMobile = useMediaQuery("(max-width: 719px)");

  const [snippets, tabs] = useMemo<
    [Partial<Record<SnippetType, string>>, Tab[]]
  >(() => {
    if (!entry) return [{}, []];

    const snippets = getCodeSnippets({
      displayName: entry?.pascal_name!,
      name: entry.name,
      weight,
      size,
      color,
    });

    const tabs = [
      {
        header: "Tags",
        content: (
          <TagCloud
            name={entry.name}
            tags={Array.from(
              new Set<string>([
                ...entry.tags,
                ...entry.categories,
                ...entry.name.split("-"),
              ])
            )}
          />
        ),
      },
    ].concat(
      RENDERED_SNIPPETS.map((type) => {
        const isWeightSupported = supportsWeight({ type, weight });

        return {
          header: type,
          content: (
            <div className="snippet" key={type}>
              <pre className={!isWeightSupported ? "disabled" : undefined}>
                <span className={!isWeightSupported ? "disabled" : undefined}>
                  {isWeightSupported
                    ? snippets[type]
                    : "This weight is not yet supported"}
                </span>
                {isWeightSupported && (
                  <button
                    title="Copy snippet"
                    className="action-button"
                    onClick={(e) => handleCopySnippet(e, type)}
                  >
                    {copied === type ? (
                      <CheckCircleIcon
                        size={20}
                        color="var(--olive)"
                        weight="fill"
                      />
                    ) : (
                      <CopyIcon
                        size={20}
                        color="var(--foreground)"
                        weight="fill"
                      />
                    )}
                  </button>
                )}
              </pre>
            </div>
          ),
        };
      })
    );

    return [snippets, tabs];
  }, [entry, weight, size, color, copied]);

  useHotkeys("esc", () => setSelectionEntry(null));

  useEffect(() => {
    if (!entry) return;
    ReactGA.event({
      category: "Grid",
      action: "Details",
      label: entry.name,
    });
  }, [entry]);

  const handleCopySnippet = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    type: SnippetType
  ) => {
    event.currentTarget.blur();
    if (!entry) return;

    setCopied(type);
    const data = snippets[type];
    data && void navigator.clipboard?.writeText(data);
  };

  const fetchElswaySVG = async () => {
    const r = await fetch(elswaySrc);
    return r.text();
  };

  const handleCopySVG = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.currentTarget.blur();
    if (!entry) return;
    const content = await fetchElswaySVG();
    const fullName = `${entry.name}-${brand}-${weightFolder}`;
    navigator.clipboard?.writeText(`<!-- ${fullName} -->\n${content}`);
    setCopied(CopyType.SVG);
  };

  const handleCopyDataSVG = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.currentTarget.blur();
    if (!entry) return;
    const content = await fetchElswaySVG();
    navigator.clipboard?.writeText(
      "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(content)))
    );
    setCopied(CopyType.SVG_DATA);
  };

  const handleCopyRawSVG = async () => {
    if (!entry) return;
    const content = await fetchElswaySVG();
    const fullName = `${entry.name}-${brand}-${weightFolder}`;
    navigator.clipboard?.writeText(`<!-- ${fullName} -->\n${content}`);
    setCopied(CopyType.SVG_RAW);
  };

  const handleCopyUnicode = async () => {
    if (!entry) return;

    const content = String.fromCharCode(entry.codepoint);
    navigator.clipboard?.writeText(content);
    setCopied(CopyType.UNICODE);
  };

  const handleDownloadSVG = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.currentTarget.blur();
    if (!entry) return;
    const content = await fetchElswaySVG();
    saveAs(
      new Blob([content], { type: "image/svg+xml" }),
      `${entry.name}-${brand}-${weightFolder}.svg`
    );
  };

  const handleDownloadRawSVG = async () => {
    if (!entry) return;
    saveAs(elswaySrc, `${entry.name}-${brand}-${weightFolder}.svg`);
  };

  const fetchElswaySVGElement = async (): Promise<SVGSVGElement | null> => {
    const txt = await fetchElswaySVG();
    const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
    const svg = doc.documentElement as unknown as SVGSVGElement;
    return svg && svg.tagName === "svg" ? svg : null;
  };

  const handleDownloadPNG = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.currentTarget.blur();
    if (!entry) return;
    const svg = await fetchElswaySVGElement();
    if (!svg) return;
    Svg2Png.save(
      cloneWithSize(svg, size),
      `${entry.name}-${brand}-${weightFolder}.png`
    );
  };

  const handleCopyPNG = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.currentTarget.blur();
    if (!entry) return;
    const svg = await fetchElswaySVGElement();
    if (!svg) return;
    Svg2Png.toDataURL(cloneWithSize(svg, size))
      .then((data) => fetch(data))
      .then((res) => res.blob())
      .then((blob) =>
        navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ])
      )
      .then(() => {
        setCopied(CopyType.PNG);
      });
  };

  // const handleCopyDataPNG = async (
  //   event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  // ) => {
  //   event.currentTarget.blur();
  //   if (!entry) return;
  //   if (!ref.current) return;

  //   const data = await Svg2Png.toDataURL(cloneWithSize(ref.current, size));
  //   navigator.clipboard?.writeText(data);
  //   setCopied(CopyType.PNG_DATA);
  // };

  return (
    <AnimatePresence initial={true}>
      {!!entry && (
        <motion.aside
          initial="initial"
          animate="animate"
          exit="exit"
          variants={isMobile ? variants.mobile : variants.desktop}
          className="secondary detail-footer card"
          transition={isMobile ? { duration: 0.25 } : { duration: 0.1 }}
        >
          <div className="detail-preview">
            <figure>
              <img
                src={elswaySrc}
                alt={entry.name}
                width={64}
                height={64}
                style={{ display: "block" }}
              />
              <figcaption>
                <p>{entry.name}</p>
                <small className="versioning">{brand}</small>
                <small className="versioning">{weightFolder}</small>
              </figcaption>
            </figure>
            <hr />
            <div className="detail-meta">
              <div className="detail-actions">
                {!showMoreActions ? (
                  <>
                    <ActionButton
                      label="SVG"
                      title="Download SVG"
                      download
                      onClick={handleDownloadSVG}
                    />

                    <ActionButton
                      label="SVG Raw"
                      title="Download raw SVG including original strokes"
                      download
                      onClick={handleDownloadRawSVG}
                    />

                    <ActionButton
                      label="SVG"
                      title="Copy SVG"
                      active={copied === CopyType.SVG}
                      onClick={handleCopySVG}
                    />

                    <ActionButton
                      label="SVG Raw"
                      title="Copy raw SVG including original strokes"
                      active={copied === CopyType.SVG_RAW}
                      onClick={handleCopyRawSVG}
                    />
                  </>
                ) : (
                  <>
                    <ActionButton
                      label="PNG"
                      title="Download PNG"
                      download
                      onClick={handleDownloadPNG}
                    />

                    <ActionButton
                      label="PNG"
                      title="Copy PNG"
                      active={copied === CopyType.PNG}
                      onClick={handleCopyPNG}
                    />

                    <ActionButton
                      label="Data SVG"
                      title="Copy SVG as DataURL"
                      active={copied === CopyType.SVG_DATA}
                      onClick={handleCopyDataSVG}
                    />

                    <ActionButton
                      label="Unicode"
                      title="Copy Unicode character (v2.1.0 or newer)"
                      active={copied === CopyType.UNICODE}
                      disabled={weight === IconStyle.DUOTONE}
                      onClick={handleCopyUnicode}
                    />
                  </>
                )}
              </div>
              <button
                className="action-button"
                title="More actions"
                tabIndex={0}
                onClick={() => setShowMoreActions((s) => !s)}
              >
                {!showMoreActions ? (
                  <CaretDoubleRightIcon
                    size={16}
                    weight="bold"
                    color="var(--foreground)"
                  />
                ) : (
                  <CaretDoubleLeftIcon
                    size={16}
                    weight="bold"
                    color="var(--foreground)"
                  />
                )}
              </button>
            </div>
          </div>

          <Tabs tabs={tabs} initialIndex={i} onTabChange={setInitialTab} />

          <EditThisIconButton entry={entry} />

          <button
            tabIndex={0}
            className="close-button"
            aria-label="Close detail panel"
            title="Close"
            onClick={() => setSelectionEntry(null)}
            onKeyDown={(e) => {
              e.key === "Enter" && setSelectionEntry(null);
            }}
          >
            <XCircleIcon color="currentColor" size={28} weight="fill" />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

const EditThisIconButton: React.FC<{ entry: any }> = ({ entry }) => {
  const { canWrite } = useAuth();
  const setSelectionEntry = useApplicationStore.use.setSelectionEntry();
  const setEditingEntry = useApplicationStore.use.setEditingEntry();
  if (!canWrite) return null;
  return (
    <div style={{ margin: "16px 0 0", textAlign: "center" }}>
      <button
        type="button"
        className="cms-btn primary big"
        onClick={() => {
          // Close the preview popover, open the edit modal.
          setEditingEntry(entry);
          setSelectionEntry(null);
        }}
      >
        Edit this icon
      </button>
    </div>
  );
};

export default Panel;
