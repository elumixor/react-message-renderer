import { describe, expect, test } from "bun:test";
import { useEffect, useState } from "react";
import { useFinishRender } from "./finish-context";
import { Message } from "./message";
import { Renderer } from "./Renderer";
import { serialize } from "./serializer";
import { nonNull } from "./test-helpers";
import type { ElementNode } from "./types";

class CountingRenderer extends Renderer {
  readonly commits: ElementNode[][] = [];
  protected override renderMessages(messageNodes: ElementNode[]): Promise<void> {
    this.commits.push(messageNodes);
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

describe("stress", () => {
  test("mounts a 1000-node flat tree", async () => {
    const r = new CountingRenderer({ throttleMs: 1 });
    const items = Array.from({ length: 1000 }, (_, i) => i);
    await r.render(
      <>
        <Message>
          {items.map((i) => (
            <b key={i}>{`item-${i} `}</b>
          ))}
        </Message>
        <Done />
      </>,
    );
    const last = nonNull(r.commits[r.commits.length - 1]);
    const msg = nonNull(last[0]);
    expect(msg.children.length).toBe(1000);
    const html = serialize(msg);
    expect(html.startsWith("<b>item-0 </b>")).toBe(true);
    expect(html.endsWith("<b>item-999 </b>")).toBe(true);
  });

  test("renders deeply nested tree (depth 50)", async () => {
    const r = new CountingRenderer({ throttleMs: 1 });

    function Nest({ depth }: { depth: number }) {
      if (depth === 0) return <>leaf</>;
      return (
        <b>
          <Nest depth={depth - 1} />
        </b>
      );
    }

    await r.render(
      <>
        <Message>
          <Nest depth={50} />
        </Message>
        <Done />
      </>,
    );
    const last = nonNull(r.commits[r.commits.length - 1]);
    const html = serialize(nonNull(last[0]));
    const opens = (html.match(/<b>/g) ?? []).length;
    const closes = (html.match(/<\/b>/g) ?? []).length;
    expect(opens).toBe(50);
    expect(closes).toBe(50);
    expect(html.includes("leaf")).toBe(true);
  });

  test("rapid updates coalesce into bounded commits", async () => {
    const r = new CountingRenderer({ throttleMs: 30 });
    let setCounter: ((n: number) => void) | undefined;

    function Counter() {
      const [n, setN] = useState(0);
      setCounter = setN;
      return <Message>n={n}</Message>;
    }

    function Finisher() {
      const finish = useFinishRender();
      useEffect(() => {
        const t = setTimeout(() => void finish(), 200);
        return () => clearTimeout(t);
      }, [finish]);
      return null;
    }

    const renderPromise = r.render(
      <>
        <Counter />
        <Finisher />
      </>,
    );

    await new Promise((res) => setTimeout(res, 5));
    for (let i = 1; i <= 100; i++) setCounter?.(i);
    await renderPromise;

    expect(r.commits.length).toBeLessThan(15);
    const last = nonNull(r.commits[r.commits.length - 1]);
    const html = serialize(nonNull(last[0]));
    expect(html).toBe("n=100");
  });

  test("repeated mount/unmount of large trees does not leak parent references", async () => {
    const r = new CountingRenderer({ throttleMs: 1 });

    const sequence: boolean[][] = [
      [true, true, true, true, true],
      [false, true, false, true, false],
      [true, true, true, true, true],
      [false, false, true, false, false],
      [true, true, true, true, true],
    ];

    function Toggle() {
      const [step, setStep] = useState(0);
      const finish = useFinishRender();
      useEffect(() => {
        if (step < sequence.length - 1) setStep(step + 1);
        else void finish();
      }, [step, finish]);
      const show = nonNull(sequence[step]);
      const labels = ["a", "b", "c", "d", "e"];
      return <Message>{show.map((v, i) => (v ? <b key={labels[i]}>{`${i} `}</b> : null))}</Message>;
    }

    await r.render(<Toggle />);
    const final = nonNull(r.commits[r.commits.length - 1]);
    const msg = nonNull(final[0]);
    expect(msg.children.length).toBe(5);
    expect(serialize(msg)).toBe("<b>0 </b><b>1 </b><b>2 </b><b>3 </b><b>4 </b>");
  });
});
