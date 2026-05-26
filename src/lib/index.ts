import { Icon } from "@elsway-icons/react";
import { IconEntry as CoreEntry } from "@elsway-icons/core";
export * from "./icons";

export interface IconEntry extends CoreEntry {
  Icon: Icon;
}

export enum SnippetType {
  REACT = "React",
  VUE = "Vue",
  HTML = "Web",
  FLUTTER = "Flutter",
  ELM = "Elm",
  SWIFT = "Swift",
}
