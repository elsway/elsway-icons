import { motion, AnimatePresence, Variants } from "motion/react";
import { ArrowULeftUpIcon } from "@elsway-icons/react";

import Links from "@/components/Links/Links";

import RulerMarker from "@/assets/ruler-marker.svg?react";
import RulerMarkerSpec from "@/assets/ruler-marker-spec.svg?react";
import { useMediaQuery } from "@/hooks";
import { useApplicationStore } from "@/state";
import "./Footer.css";

type FooterProps = {};

const variants: Variants = {
  initial: { y: 188 },
  animate: { y: 0 },
  exit: { y: 188 },
};

const Footer = (_: FooterProps) => {
  const isMobile = useMediaQuery("(max-width: 719px)");
  const isViewing = !!useApplicationStore.use.selectionEntry();

  return (
    <footer>
      <div className="container">
        <AnimatePresence initial={false}>
          {(!isMobile || !isViewing) && (
            <motion.button
              id="back-to-top-button"
              aria-label="back-to-top button"
              className="main-button"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.1 }}
              onClick={() => {
                document
                  .getElementById("root")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <ArrowULeftUpIcon size="1em" />
            </motion.button>
          )}
        </AnimatePresence>
        <div className="outro">
          <Links />
          <p>
            Autonaut Icons is licensed under{" "}
            <a
              className="main-link"
              href="https://github.com/elsway/elsway-icons/blob/main/LICENSE"
            >
              MIT
            </a>
            .
          </p>
          <div className="fine-print">
            <p>
              Type set in{" "}
              <a className="main-link" href="https://www.gent.media/manrope">
                Manrope
              </a>{" "}
              by Mikhail Sharanda and{" "}
              <a className="main-link" href="https://www.ibm.com/plex/">
                IBM Plex Mono
              </a>
              .
            </p>
          </div>
          <div className="illustrations-footer">
            <RulerMarkerSpec className="ruler-marker spec" />
            <RulerMarker className="ruler-marker inspectable xray" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
