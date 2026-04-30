import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { useEffect } from "react";
import { useFinishRender } from "../finish-context";
import { Message } from "../message";
import { ConsoleRenderer } from "./console";

function Done() {
  const finish = useFinishRender();
  useEffect(() => {
    void finish();
  }, [finish]);
  return null;
}

describe("ConsoleRenderer", () => {
  let logs: string[] = [];
  let cleared = 0;
  let originalLog = console.log;
  let originalClear = console.clear;

  beforeEach(() => {
    logs = [];
    cleared = 0;
    originalLog = console.log;
    originalClear = console.clear;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    console.clear = () => {
      cleared++;
    };
  });
  afterEach(() => {
    console.log = originalLog;
    console.clear = originalClear;
  });

  test("logs the serialized html for each <Message>", async () => {
    const r = new ConsoleRenderer({ throttleMs: 1 });
    await r.render(
      <>
        <Message>
          <b>bold</b> and plain
        </Message>
        <Message>second</Message>
        <Done />
      </>,
    );
    expect(logs.some((l) => l.includes("<b>bold</b>"))).toBe(true);
    expect(logs.some((l) => l === "second")).toBe(true);
  });

  test("calls console.clear when clear=true (default)", async () => {
    const r = new ConsoleRenderer({ throttleMs: 1 });
    await r.render(
      <>
        <Message>x</Message>
        <Done />
      </>,
    );
    expect(cleared).toBeGreaterThan(0);
  });

  test("skips console.clear when clear=false", async () => {
    const r = new ConsoleRenderer({ throttleMs: 1, clear: false });
    await r.render(
      <>
        <Message>x</Message>
        <Done />
      </>,
    );
    expect(cleared).toBe(0);
  });
});
