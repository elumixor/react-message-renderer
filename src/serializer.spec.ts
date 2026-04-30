import { describe, expect, test } from "bun:test";
import { serialize } from "./serializer";
import type { ElementNode, TextNode } from "./types";

const text = (text: string): TextNode => ({ type: "TEXT", text });
const el = (
  type: ElementNode["type"],
  children: ElementNode["children"] = [],
  props: ElementNode["props"] = {},
): ElementNode => ({ type, props, children });

describe("serialize", () => {
  test("escapes html-special characters in text", () => {
    expect(serialize(text("<b>&\"'>"))).toBe("&lt;b&gt;&amp;\"'&gt;");
  });

  test("renders bold/italic/underline/strikethrough", () => {
    expect(serialize(el("b", [text("hi")]))).toBe("<b>hi</b>");
    expect(serialize(el("i", [text("hi")]))).toBe("<i>hi</i>");
    expect(serialize(el("u", [text("hi")]))).toBe("<u>hi</u>");
    expect(serialize(el("s", [text("hi")]))).toBe("<s>hi</s>");
  });

  test("escapes href attribute", () => {
    const node = el("a", [text("link")], { href: 'https://x.test/?q="bad"&v=<1>' });
    expect(serialize(node)).toBe('<a href="https://x.test/?q=&quot;bad&quot;&amp;v=&lt;1&gt;">link</a>');
  });

  test("renders code/pre/blockquote", () => {
    expect(serialize(el("code", [text("x")]))).toBe("<code>x</code>");
    expect(serialize(el("pre", [text("x")]))).toBe("<pre>x</pre>");
    expect(serialize(el("blockquote", [text("x")]))).toBe("<blockquote>x</blockquote>");
  });

  test("br renders as newline", () => {
    expect(serialize(el("br"))).toBe("\n");
  });

  test("div and p append trailing newline", () => {
    expect(serialize(el("div", [text("a")]))).toBe("a\n");
    expect(serialize(el("p", [text("b")]))).toBe("b\n");
  });

  test("io-root, io-message, io-text are transparent", () => {
    expect(serialize(el("io-root", [text("a")]))).toBe("a");
    expect(serialize(el("io-message", [text("a")]))).toBe("a");
    expect(serialize(el("io-text", [text("a")]))).toBe("a");
  });

  test("nested elements compose", () => {
    const node = el("io-message", [
      el("b", [text("hello "), el("i", [text("world")])]),
      el("br"),
      el("a", [text("click")], { href: "https://x.test" }),
    ]);
    expect(serialize(node)).toBe('<b>hello <i>world</i></b>\n<a href="https://x.test">click</a>');
  });

  test("href falls back to empty string when missing", () => {
    expect(serialize(el("a", [text("x")]))).toBe('<a href="">x</a>');
  });
});
