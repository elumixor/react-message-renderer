/// <reference path="./jsx.d.ts" />
import type { ReactNode } from "react";
import { type LinkPreviewOptions, useLinkPreviewOptions } from "./link-preview-context";

export interface MessageProps {
  children?: ReactNode;
  repliesTo?: number;
  linkPreview?: LinkPreviewOptions;
}

export function Message({ children, repliesTo, linkPreview }: MessageProps) {
  const contextOptions = useLinkPreviewOptions();
  const options = linkPreview ?? contextOptions;

  return (
    <io-message repliesTo={repliesTo} linkPreview={options}>
      {children}
    </io-message>
  );
}
