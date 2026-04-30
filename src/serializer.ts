import type { ElementNode, OutputNode, TextNode } from "./types";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function isTextNode(node: OutputNode): node is TextNode {
  return node.type === "TEXT";
}

function serializeChildren(node: ElementNode): string {
  return node.children.map(serialize).join("");
}

export function serialize(node: OutputNode): string {
  if (isTextNode(node)) return escapeHtml(node.text);

  const children = serializeChildren(node);

  switch (node.type) {
    case "io-root":
    case "io-text":
    case "io-message":
      return children;
    case "b":
      return `<b>${children}</b>`;
    case "i":
      return `<i>${children}</i>`;
    case "u":
      return `<u>${children}</u>`;
    case "s":
      return `<s>${children}</s>`;
    case "a": {
      const href = escapeAttr(String(node.props.href ?? ""));
      return `<a href="${href}">${children}</a>`;
    }
    case "code":
      return `<code>${children}</code>`;
    case "pre":
      return `<pre>${children}</pre>`;
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "br":
      return "\n";
    case "div":
    case "p":
      return `${children}\n`;
    default:
      return children;
  }
}
