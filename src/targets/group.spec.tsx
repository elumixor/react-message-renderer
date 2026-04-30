import { describe, expect, test } from "bun:test";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useFinishRender } from "../finish-context";
import { Message } from "../message";
import { type IRenderer, Renderer } from "../Renderer";
import { serialize } from "../serializer";
import type { ElementNode } from "../types";
import { GroupRenderer } from "./group";

class TaggingRenderer extends Renderer {
  readonly outputs: string[] = [];
  constructor(private readonly tag: string) {
    super({ throttleMs: 1 });
  }
  protected override renderMessages(messageNodes: ElementNode[]): Promise<void> {
    this.outputs.push(`${this.tag}:${messageNodes.map(serialize).join("|")}`);
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

describe("GroupRenderer", () => {
  test("fans out a single render to every child renderer", async () => {
    const a = new TaggingRenderer("a");
    const b = new TaggingRenderer("b");
    const group = new GroupRenderer(a, b);
    const tree: ReactNode = (
      <>
        <Message>x</Message>
        <Done />
      </>
    );
    await group.render(tree);
    expect(a.outputs.some((o) => o.endsWith(":x"))).toBe(true);
    expect(b.outputs.some((o) => o.endsWith(":x"))).toBe(true);
  });

  test("awaits all children before resolving", async () => {
    let aResolved = false;
    let bResolved = false;
    class SlowRenderer implements IRenderer {
      constructor(
        private readonly delayMs: number,
        private readonly mark: () => void,
      ) {}
      async render() {
        await new Promise((r) => setTimeout(r, this.delayMs));
        this.mark();
      }
    }
    const group = new GroupRenderer(
      new SlowRenderer(20, () => {
        aResolved = true;
      }),
      new SlowRenderer(40, () => {
        bResolved = true;
      }),
    );
    await group.render(<Message>x</Message>);
    expect(aResolved).toBe(true);
    expect(bResolved).toBe(true);
  });
});
