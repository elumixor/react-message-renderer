import { describe, expect, test } from "bun:test";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "./error-boundary";
import { useFinishRender } from "./finish-context";
import { Message } from "./message";
import { Renderer } from "./Renderer";
import { serialize } from "./serializer";
import { nonNull } from "./test-helpers";
import type { ElementNode } from "./types";

class CapturingRenderer extends Renderer {
  readonly commits: string[][] = [];
  protected override renderMessages(messageNodes: ElementNode[]): Promise<void> {
    this.commits.push(messageNodes.map(serialize));
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

function Boom({ when }: { when: boolean }) {
  if (when) throw new Error("kaboom");
  return <>still here</>;
}

describe("ErrorBoundary", () => {
  test("static fallback renders when child throws during render", async () => {
    const r = new CapturingRenderer({ throttleMs: 1, logger: { warn: () => {}, error: () => {} } });
    await r.render(
      <>
        <Message>
          <ErrorBoundary fallback="caught">
            <Boom when={true} />
          </ErrorBoundary>
        </Message>
        <Done />
      </>,
    );
    const last = nonNull(r.commits[r.commits.length - 1]);
    expect(last[0]).toBe("caught");
  });

  test("function fallback receives error and reset", async () => {
    let capturedError: Error | undefined;
    const r = new CapturingRenderer({ throttleMs: 1, logger: { warn: () => {}, error: () => {} } });
    await r.render(
      <>
        <Message>
          <ErrorBoundary
            fallback={(err) => {
              capturedError = err;
              return <>err: {err.message}</>;
            }}
          >
            <Boom when={true} />
          </ErrorBoundary>
        </Message>
        <Done />
      </>,
    );
    expect(capturedError?.message).toBe("kaboom");
    const last = nonNull(r.commits[r.commits.length - 1]);
    expect(last[0]).toBe("err: kaboom");
  });

  test("happy path renders children", async () => {
    const r = new CapturingRenderer({ throttleMs: 1 });
    await r.render(
      <>
        <Message>
          <ErrorBoundary fallback="caught">
            <Boom when={false} />
          </ErrorBoundary>
        </Message>
        <Done />
      </>,
    );
    const last = nonNull(r.commits[r.commits.length - 1]);
    expect(last[0]).toBe("still here");
  });

  test("reset re-renders children", async () => {
    const r = new CapturingRenderer({ throttleMs: 1, logger: { warn: () => {}, error: () => {} } });

    function Toggling() {
      const [explode, setExplode] = useState(true);
      const finish = useFinishRender();
      // After the boundary catches once, we flip state to no-throw and reset.
      const handleReset = (reset: () => void) => {
        setExplode(false);
        reset();
        // Schedule finish after re-render takes effect.
        setTimeout(() => void finish(), 30);
      };

      return (
        <Message>
          <ErrorBoundary
            fallback={(_err, reset) => {
              return <Resetter onReset={() => handleReset(reset)} />;
            }}
          >
            <Boom when={explode} />
          </ErrorBoundary>
        </Message>
      );
    }

    function Resetter({ onReset }: { onReset: () => void }) {
      useEffect(() => {
        onReset();
      }, [onReset]);
      return <>resetting…</>;
    }

    await r.render(<Toggling />);
    const final = nonNull(r.commits[r.commits.length - 1]);
    expect(final[0]).toBe("still here");
  });

  test("onError callback is invoked", async () => {
    let calledWith: Error | undefined;
    const r = new CapturingRenderer({ throttleMs: 1, logger: { warn: () => {}, error: () => {} } });
    await r.render(
      <>
        <Message>
          <ErrorBoundary
            fallback="x"
            onError={(err) => {
              calledWith = err;
            }}
          >
            <Boom when={true} />
          </ErrorBoundary>
        </Message>
        <Done />
      </>,
    );
    expect(calledWith?.message).toBe("kaboom");
  });
});
