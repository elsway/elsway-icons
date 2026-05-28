import { useShallow } from "zustand/react/shallow";
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  LinkIcon,
} from "@elsway-icons/react";

import { useTransientState } from "@/hooks";
import { useApplicationStore } from "@/state";

import "./SettingsActions.css";

const SettingsActions = () => {
  const { reset } = useApplicationStore(
    useShallow((state) => ({
      reset: state.resetApplicationState,
    }))
  );

  const [copied, setCopied] = useTransientState<boolean>(false, 2000);

  const copyDeepLinkToClipboard = () => {
    void navigator.clipboard
      ?.writeText(`${window.location.origin}${window.location.search}`)
      .then(() => {
        setCopied(true);
      })
      .catch(() => {
        alert("Clipboard permissions must be enabled to copy links!");
      });
  };

  return (
    <>
      <button
        className="tool-button"
        title="Restore default settings"
        onClick={reset}
      >
        <ArrowCounterClockwiseIcon size={24} />
      </button>
      <button
        className="tool-button"
        title="Copy URL for current settings"
        onClick={copyDeepLinkToClipboard}
      >
        {copied ? (
          <CheckCircleIcon size={24} color="var(--olive)" weight="fill" />
        ) : (
          <LinkIcon size={24} />
        )}
      </button>
    </>
  );
};

export default SettingsActions;
