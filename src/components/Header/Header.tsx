import {
  ArrowCircleUpRightIcon,
  ArrowCircleDownIcon,
} from "@elsway-icons/react";

import ElswayLogo from "@/assets/elsway-logo.svg?react";
import PaperClipsTwo from "@/assets/paperclips-2.svg?react";
import PaperClipsThree from "@/assets/paperclips-3.svg?react";
import IPad from "@/assets/ipad.svg?react";
import IPadSpec from "@/assets/ipad-spec.svg?react";
import Map from "@/assets/map.svg?react";
import MapSpec from "@/assets/map-spec.svg?react";
import Synth from "@/assets/synth.svg?react";
import SynthSpec from "@/assets/synth-spec.svg?react";

import { Watch, WatchSpec } from "./dynamic/Watch";

import Links from "@/components/Links";
import "./Header.css";

type HeaderProps = {};

const handleGetStarted = () =>
  window.open(
    "https://github.com/elsway/elsway-icons",
    "_blank",
    "noopener noreferrer"
  );

const handleScrollToIcons = () =>
  document
    .getElementById("toolbar")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });

const Header = (_: HeaderProps) => {
  return (
    <header>
      <div className="header-contents">
        <div className="illustrations-top">
          <ElswayLogo id="logo" />

          <PaperClipsThree id="paperclips-three" />

          <IPadSpec className="ipad" />
          <IPad className="ipad inspectable xray" />
        </div>
        <div className="intro">
          <h2>
            Elsway is a flexible icon family for interfaces, diagrams,
            presentations — whatever, really.
          </h2>
          <div className="button-container">
            <button className="main-button" onClick={handleGetStarted}>
              <ArrowCircleUpRightIcon size={24} />
              Get started
            </button>
            <button className="main-button" onClick={handleScrollToIcons}>
              <ArrowCircleDownIcon size={24} />
              Explore icons
            </button>
          </div>
          <Links />
        </div>
        <div className="illustrations-bottom">
          <MapSpec className="map" />
          <Map className="map inspectable xray" />

          <SynthSpec className="synth" />
          <Synth className="synth inspectable xray" />

          <WatchSpec className="watch" />
          <Watch className="watch inspectable xray" />

          <PaperClipsTwo id="paperclips" />
        </div>
      </div>
    </header>
  );
};

export default Header;
