import { describe, expect, test } from "bun:test";
import { useEffect } from "react";
import { useFinishRender } from "./finish-context";
import { LinkPreviewProvider } from "./link-preview-context";
import { Message } from "./message";
import { Renderer } from "./Renderer";
import type { ElementNode } from "./types";

class CaptureTreeRenderer extends Renderer {
  last?: ElementNode[];
  constructor() {
    super({ throttleMs: 1 });
  }
  protected override renderMessages(messageNodes: ElementNode[]): Promise<void> {
    this.last = messageNodes.map((n) => ({ ...n, children: [...n.children], props: { ...n.props } }));
    return Promise.resolve();
  }
}

function Done() {
  const finish = useFinishRender();
  useEffect(() => {
    void finish();
  }, [finish]);
  return null;
}

describe("Message", () => {
  test("forwards repliesTo and linkPreview via props", async () => {
    const r = new CaptureTreeRenderer();
    const lp = { ignored: new Set(["https://skip.test"]), previewUrl: "https://show.test" };
    await r.render(
      <>
        <Message repliesTo={42} linkPreview={lp}>
          hi
        </Message>
        <Done />
      </>,
    );
    expect(r.last?.[0].props.repliesTo).toBe(42);
    expect(r.last?.[0].props.linkPreview).toBe(lp);
  });

  test("falls back to LinkPreviewProvider context", async () => {
    const r = new CaptureTreeRenderer();
    await r.render(
      <LinkPreviewProvider previewUrl="https://ctx.test" ignored={["https://skip.test"]}>
        <Message>hi</Message>
        <Done />
      </LinkPreviewProvider>,
    );
    const lp = r.last?.[0].props.linkPreview as { ignored: Set<string>; previewUrl?: string } | undefined;
    expect(lp?.previewUrl).toBe("https://ctx.test");
    expect(lp?.ignored.has("https://skip.test")).toBe(true);
  });

  test("explicit prop overrides context", async () => {
    const r = new CaptureTreeRenderer();
    const explicit = { ignored: new Set<string>(), previewUrl: "https://explicit.test" };
    await r.render(
      <LinkPreviewProvider previewUrl="https://ctx.test">
        <Message linkPreview={explicit}>hi</Message>
        <Done />
      </LinkPreviewProvider>,
    );
    const lp = r.last?.[0].props.linkPreview as { previewUrl?: string };
    expect(lp.previewUrl).toBe("https://explicit.test");
  });
});
