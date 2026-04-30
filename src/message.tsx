/// <reference path="./jsx.d.ts" />
import type { ReactNode } from "react";
import { type LinkPreviewOptions, useLinkPreviewOptions } from "./link-preview-context";

export interface MessageProps {
  children?: ReactNode;
  repliesTo?: number;
  /**
   * Telegram-specific: forum/topic thread id. When set, overrides the renderer's
   * default of reading `ctx.message?.message_thread_id` from the incoming update.
   */
  threadId?: number;
  linkPreview?: LinkPreviewOptions;
}

export function Message({ children, repliesTo, threadId, linkPreview }: MessageProps) {
  const contextOptions = useLinkPreviewOptions();
  const options = linkPreview ?? contextOptions;

  return (
    <io-message repliesTo={repliesTo} threadId={threadId} linkPreview={options}>
      {children}
    </io-message>
  );
}
