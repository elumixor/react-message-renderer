import type { ReactNode } from "react";
import type { LinkPreviewOptions } from "./link-preview-context";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "io-message": {
        children?: ReactNode;
        repliesTo?: number;
        threadId?: number;
        linkPreview?: LinkPreviewOptions;
      };
      "io-text": { children?: ReactNode };
      b: { children?: ReactNode };
      i: { children?: ReactNode };
      u: { children?: ReactNode };
      s: { children?: ReactNode };
      a: { children?: ReactNode; href?: string };
      code: { children?: ReactNode };
      pre: { children?: ReactNode };
      blockquote: { children?: ReactNode };
      br: Record<string, never>;
      div: { children?: ReactNode };
      p: { children?: ReactNode };
    }
  }
}
