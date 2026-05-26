import { ArrowElbowDownRightIcon } from "@phosphor-icons/react";

import { iconCount } from "@/lib/icons";
import OutboundLink from "@/components/OutboundLink";

import "./Links.css";

interface LinksProps {}

const Links = (_: LinksProps) => {
  return (
    <div className="links">
      <div>
        <ArrowElbowDownRightIcon size={24} />
        <OutboundLink
          className="nav-link"
          href="/assets/elsway-icons.zip"
          eventLabel="Download all"
          download
          type="application/zip"
        >
          Download all ({iconCount})
        </OutboundLink>
      </div>

      <div>
        <ArrowElbowDownRightIcon size={24} />
        <span>
          <OutboundLink
            href="https://www.figma.com/community/plugin/898620911119764089/Elsway-Icons"
            eventLabel="Figma plugin"
          >
            Figma plugin
          </OutboundLink>
          {" / "}
          <OutboundLink
            href="https://www.figma.com/community/file/903830135544202908/Elsway-Icons"
            eventLabel="Figma library"
          >
            library
          </OutboundLink>
        </span>
      </div>

      <div>
        <ArrowElbowDownRightIcon size={24} />
        <OutboundLink
          href="/assets/elsway-icons.sketchplugin.zip"
          eventLabel="Download sketch plugin"
          download
          type="application/zip"
        >
          Sketch plugin
        </OutboundLink>
      </div>

      <div>
        <ArrowElbowDownRightIcon size={24} />
        <OutboundLink
          href="https://play.elswayicons.com"
          eventLabel="Showcase"
        >
          Showcase
        </OutboundLink>
      </div>

      <div>
        <ArrowElbowDownRightIcon size={24} />
        <OutboundLink
          href="https://github.com/elsway-icons/homepage"
          eventLabel="GitHub"
        >
          GitHub
        </OutboundLink>
      </div>
      <div>
        <ArrowElbowDownRightIcon size={24} />
        <OutboundLink
          href="https://github.com/elsway-icons/homepage/issues"
          eventLabel="Request"
        >
          Request an icon
        </OutboundLink>
      </div>

      <div>
        <ArrowElbowDownRightIcon size={24} />
        <span>
          <OutboundLink
            href="https://www.buymeacoffee.com/elswayicons"
            eventLabel="Donate"
          >
            Donate
          </OutboundLink>
          {" / "}
          <OutboundLink
            href="https://patreon.com/elswayicons"
            eventLabel="Patreon"
          >
            Patreon
          </OutboundLink>
        </span>
      </div>

      <div>
        <ArrowElbowDownRightIcon size={24} />
        <OutboundLink
          href="https://twitter.com/_elswayicons"
          eventLabel="Twitter"
        >
          Twitter
        </OutboundLink>
      </div>
    </div>
  );
};

export default Links;
