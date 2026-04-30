/**
 * Well-known element type names. Target packages can introduce additional
 * types at the JSX layer; the reconciler accepts any string and stores it
 * verbatim on the resulting ElementNode.
 */
export type ElementType =
  | "io-root"
  | "io-message"
  | "io-text"
  | "b"
  | "i"
  | "u"
  | "s"
  | "a"
  | "code"
  | "pre"
  | "br"
  | "div"
  | "p"
  | "blockquote";

export interface TextNode {
  type: "TEXT";
  text: string;
  parent?: ElementNode;
}

export interface ElementNode {
  type: ElementType;
  props: Record<string, unknown>;
  children: OutputNode[];
  parent?: ElementNode;
}

export type OutputNode = TextNode | ElementNode;

export interface Container {
  root: ElementNode;
  commitUpdate: () => void;
}

export interface FileData {
  buffer: Buffer;
  mimeType: string;
  filename?: string;
}
