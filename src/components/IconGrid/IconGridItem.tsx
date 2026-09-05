import {
  useRef,
  useLayoutEffect,
  useEffect,
  RefObject,
  HTMLAttributes,
} from "react";
import { motion } from "motion/react";
import { useShallow } from "zustand/react/shallow";

import { IconEntry } from "@/lib";
import { useApplicationStore } from "@/state";
import { IconStyle } from "@/lib/types";

const BASE = import.meta.env.BASE_URL;

interface IconGridItemProps extends HTMLAttributes<HTMLDivElement> {
  index: number;
  isDark: boolean;
  entry: IconEntry;
  originOffset: RefObject<{ top: number; left: number }>;
}

const transition = { duration: 0.2 };
const originIndex = 0;
const delayPerPixel = 0.0003;

const itemVariants = {
  hidden: { opacity: 0 },
  visible: (delayRef: RefObject<number>) => ({
    opacity: 1,
    transition: { delay: delayRef.current },
  }),
};

const IconGridItem = (props: IconGridItemProps) => {
  const { index, originOffset, entry, style } = props;
  const { name } = entry;
  const { selection, setSelectionEntry, brand, weight, size } =
    useApplicationStore(
      useShallow((state) => ({
        selection: state.selectionEntry,
        setSelectionEntry: state.setSelectionEntry,
        brand: state.iconBrand,
        weight: state.iconWeight,
        size: state.iconSize,
      }))
    );
  const weightFolder = weight === IconStyle.FILL ? "fill" : "regular";
  const svgSrc = `${BASE}raw/elsway/${brand}/${weightFolder}/${name}.svg`;
  const isOpen = selection?.name === name;
  const isNew = entry.tags.includes("*new*");
  const isUpdated = entry.tags.includes("*updated*");
  const delayRef = useRef<number>(0);
  const offset = useRef({ top: 0, left: 0 });
  const ref = useRef<HTMLButtonElement>(null);

  const handleOpen = () => setSelectionEntry(isOpen ? null : entry);

  // The measurement for all elements happens in the layoutEffect cycle
  // This ensures that when we calculate distance in the effect cycle
  // all elements have already been measured
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    offset.current = {
      top: element.offsetTop,
      left: element.offsetLeft,
    };

    if (index === originIndex) {
      originOffset.current = offset.current;
    }
  }, [index, originOffset]);

  useEffect(() => {
    const dx = Math.abs(offset.current.left - originOffset.current.left);
    const dy = Math.abs(offset.current.top - originOffset.current.top);
    const d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    delayRef.current = d * delayPerPixel;
  }, [originOffset]);

  return (
    <motion.button
      className="grid-item"
      key={name}
      ref={ref}
      style={{
        ...style,
        backgroundColor: isOpen ? "var(--background-layer)" : undefined,
      }}
      initial="hidden"
      animate="visible"
      custom={delayRef}
      transition={transition}
      variants={itemVariants}
      onClick={handleOpen}
    >
      <div className="grid-item-icon">
        <img
          src={svgSrc}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          style={{ display: "block" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0.15";
          }}
        />
      </div>
      <p>
        <span className="name">{name}</span>
        {isNew && <span className="badge new" />}
        {isUpdated && <span className="badge updated" />}
      </p>
    </motion.button>
  );
};

export default IconGridItem;
