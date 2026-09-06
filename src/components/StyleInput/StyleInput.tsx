import { useShallow } from "zustand/react/shallow";

import Dropdown, { type DropdownOption } from "@/components/Dropdown";
import { IconStyle } from "@/lib/types";
import { useApplicationStore } from "@/state";

const options: DropdownOption<IconStyle>[] = [
  {
    value: IconStyle.REGULAR,
    label: "Regular",
    icon: <i className="ai ai-push" aria-hidden />,
  },
  {
    value: IconStyle.FILL,
    label: "Fill",
    icon: <i className="ai-fill ai-push" aria-hidden />,
  },
];

const StyleInput = () => {
  const { style, setStyle } = useApplicationStore(
    useShallow((state) => ({
      style: state.iconWeight,
      setStyle: state.setIconWeight,
    }))
  );

  return (
    <Dropdown
      className="style-input"
      label="Icon weight"
      value={style}
      options={options}
      onChange={setStyle}
    />
  );
};

export default StyleInput;
