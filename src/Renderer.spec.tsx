import { describe, expect, mock, test } from "bun:test";
import { useEffect, useState } from "react";
import { useFinishRender } from "./finish-context";
import { Message } from "./message";
import { Renderer, type RendererLogger } from "./Renderer";
import { serialize } from "./serializer";
import type { ElementNode } from "./types";

class CapturingRenderer extends Renderer {
  readonly commits: string[][] = [];
  readonly logger: RendererLogger;

  constructor(opts: { throttleMs?: number; logger?: RendererLogger } = {}) {
    super(opts);
    this.logger = opts.logger ?? { warn: () => {}, error: () => {} };
  }

  protected override renderMessages(messageNodes: ElementNode[]): Promise<void> {
    this.commits.push(messageNodes.map(serialize));
    return Promise.resolve();
  }
}

function FinishImmediately() {
  const finish = useFinishRender();
  useEffect(() => {
    void finish();
  }, [finish]);
  return null;
}

describe("Renderer", () => {
  test("a single static render produces one commit and resolves", async () => {
    const r = new CapturingRenderer({ throttleMs: 10 });
    await r.render(
      <>
        <Message>hello</Message>
        <FinishImmediately />
      </>,
    );
    expect(r.commits.length).toBeGreaterThanOrEqual(1);
    const final = r.commits[r.commits.length - 1];
    expect(final).toEqual(["hello"]);
  });

  test("flush-on-finish emits the final state even with a long throttle", async () => {
    const r = new CapturingRenderer({ throttleMs: 10_000 });

    function Counter() {
      const [n, setN] = useState(0);
      const finish = useFinishRender();
      useEffect(() => {
        if (n < 3) {
          setN((v) => v + 1);
          return;
        }
        void finish();
      }, [n, finish]);
      return <Message>n={n}</Message>;
    }

    await r.render(<Counter />);
    const last = r.commits[r.commits.length - 1];
    expect(last).toEqual(["n=3"]);
  });

  test("throttle coalesces rapid updates into a single commit", async () => {
    const r = new CapturingRenderer({ throttleMs: 50 });
    let setExternal: ((v: number) => void) | undefined;

    function Live() {
      const [n, setN] = useState(0);
      setExternal = setN;
      return <Message>n={n}</Message>;
    }

    const finishProxy = new Promise<void>((resolve) => {
      function Finalizer() {
        const finish = useFinishRender();
        useEffect(() => {
          setTimeout(() => void finish().then(() => resolve()), 200);
        }, [finish]);
        return null;
      }
      void r.render(
        <>
          <Live />
          <Finalizer />
        </>,
      );
    });

    await new Promise((res) => setTimeout(res, 5));
    if (setExternal) {
      setExternal(1);
      setExternal(2);
      setExternal(3);
    }
    await finishProxy;

    const distinct = new Set(r.commits.map((c) => c.join("|")));
    expect(distinct.has("n=3")).toBe(true);
    expect(r.commits.length).toBeLessThan(10);
  });

  test("warns when content is rendered outside a <Message>", async () => {
    const warn = mock(() => {});
    const r = new CapturingRenderer({ throttleMs: 5, logger: { warn, error: () => {} } });
    await r.render(
      <>
        <io-text>floating</io-text>
        <FinishImmediately />
      </>,
    );
    expect(warn).toHaveBeenCalled();
  });

  test("does not warn when only a <Message> is rendered", async () => {
    const warn = mock(() => {});
    const r = new CapturingRenderer({ throttleMs: 5, logger: { warn, error: () => {} } });
    await r.render(
      <>
        <Message>ok</Message>
        <FinishImmediately />
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  test("multiple <Message> siblings each become their own commit entry", async () => {
    const r = new CapturingRenderer({ throttleMs: 5 });
    await r.render(
      <>
        <Message>a</Message>
        <Message>b</Message>
        <FinishImmediately />
      </>,
    );
    const final = r.commits[r.commits.length - 1];
    expect(final).toEqual(["a", "b"]);
  });
});
