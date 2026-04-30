import { createContext, type ReactNode, useContext, useMemo } from "react";

export interface LinkPreviewOptions {
  ignored: Set<string>;
  previewUrl?: string;
}

interface LinkPreviewContextValue {
  options: LinkPreviewOptions;
}

const LinkPreviewContext = createContext<LinkPreviewContextValue | null>(null);

export interface LinkPreviewProviderProps {
  children: ReactNode;
  ignored?: Iterable<string>;
  previewUrl?: string;
}

export function LinkPreviewProvider({ children, ignored, previewUrl }: LinkPreviewProviderProps) {
  const value = useMemo<LinkPreviewContextValue>(
    () => ({
      options: {
        ignored: new Set(ignored ?? []),
        previewUrl,
      },
    }),
    [ignored, previewUrl],
  );

  return <LinkPreviewContext.Provider value={value}>{children}</LinkPreviewContext.Provider>;
}

export function useLinkPreviewOptions(): LinkPreviewOptions | undefined {
  return useContext(LinkPreviewContext)?.options;
}
