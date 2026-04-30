import { describe, expect, test } from "bun:test";
import { useEffect, useState } from "react";
import { useFinishRender } from "./finish-context";
import { Message } from "./message";
import { Renderer } from "./Renderer";
import { serialize } from "./serializer";
import { nonNull } from "./test-helpers";
import type { ElementNode } from "./types";

class StateCapturingRenderer extends Renderer {
  readonly trees: ElementNode[][] = [];

  constructor() {
    super({ throttleMs: 1 });
  }

  protected override renderMessages(messageNodes: ElementNode[]): Promise<void> {
    this.trees.push(messageNodes.map((n) => structuredCloneNode(n)));
    return Promise.resolve();
  }
}

function structuredCloneNode(node: ElementNode): ElementNode {
  return {
    type: node.type,
    props: { ...node.props },
    children: node.children.map((c) =>
      c.type === "TEXT" ? { type: "TEXT" as const, text: c.text } : structuredCloneNode(c),
    ),
  };
}

function Done() {
  const finish = useFinishRender();
  useEffect(() => {
    void finish();
  }, [finish]);
  return null;
}

describe("reconciler", () => {
  test("mounts nested elements", async () => {
    const r = new StateCapturingRenderer();
    await r.render(
      <>
        <Message>
          <b>
            <i>deep</i>
          </b>
        </Message>
        <Done />
      </>,
    );
    const last = nonNull(r.trees[r.trees.length - 1]);
    expect(last.length).toBe(1);
    const msg = nonNull(last[0]);
    expect(msg.type).toBe("io-message");
    const b = msg.children[0] as ElementNode;
    expect(b.type).toBe("b");
    const i = b.children[0] as ElementNode;
    expect(i.type).toBe("i");
    expect((i.children[0] as { type: "TEXT"; text: string }).text).toBe("deep");
  });

  test("text updates in place", async () => {
    const r = new StateCapturingRenderer();
    function Counter() {
      const [n, setN] = useState(0);
      const finish = useFinishRender();
      useEffect(() => {
        if (n === 0) setN(1);
        else if (n === 1) setN(2);
        else void finish();
      }, [n, finish]);
      return <Message>v={n}</Message>;
    }
    await r.render(<Counter />);
    const final = nonNull(r.trees[r.trees.length - 1]);
    expect(serialize(nonNull(final[0]))).toBe("v=2");
  });

  test("removing children leaves no orphans in parent.children", async () => {
    const r = new StateCapturingRenderer();
    function Toggle() {
      const [show, setShow] = useState(true);
      const finish = useFinishRender();
      useEffect(() => {
        if (show) setShow(false);
        else void finish();
      }, [show, finish]);
      return (
        <Message>
          {show ? <b>here</b> : null}
          <i>always</i>
        </Message>
      );
    }
    await r.render(<Toggle />);
    const last = nonNull(r.trees[r.trees.length - 1]);
    const msg = nonNull(last[0]);
    expect(msg.children.length).toBe(1);
    expect((msg.children[0] as ElementNode).type).toBe("i");
  });

  test("keyed reorder swaps positions", async () => {
    const r = new StateCapturingRenderer();
    function Reorder() {
      const [order, setOrder] = useState(["a", "b", "c"]);
      const finish = useFinishRender();
      useEffect(() => {
        if (order[0] === "a") setOrder(["c", "a", "b"]);
        else void finish();
      }, [order, finish]);
      return (
        <Message>
          {order.map((k) => (
            <b key={k}>{k}</b>
          ))}
        </Message>
      );
    }
    await r.render(<Reorder />);
    const last = nonNull(r.trees[r.trees.length - 1]);
    const root = nonNull(last[0]);
    const texts = (root.children as ElementNode[]).map((c) => (c.children[0] as { type: "TEXT"; text: string }).text);
    expect(texts).toEqual(["c", "a", "b"]);
  });
});
