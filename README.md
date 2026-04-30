# @elumixor/react-message-renderer

A custom React reconciler that turns JSX (with hooks, state, effects, context) into a tree of messages — and lets you stream those messages into any **mutable** target.

The reconciler is target-agnostic. To do something useful, pair it with a target package such as [`@elumixor/react-telegram`](../react-telegram), or implement your own (Discord, Slack, console, log file, anything where messages can be edited in place).

## Why

Most "JSX → X" libraries are transformers — they turn JSX once into a payload. This is a real reconciler: hooks work, state changes trigger re-renders, the diff is committed to the target via mutation primitives. If your target is mutable (an editable Telegram message, a Discord message, a re-printed terminal frame), React's reconciliation maps onto it surprisingly well — and you get streaming UI for free.

## Install

```bash
bun add @elumixor/react-message-renderer
# or: npm install / pnpm add / yarn add
```

Peer dependency: `react >= 19`.

## The 30-second tour

```tsx
import { Message, Renderer, type ElementNode } from "@elumixor/react-message-renderer";
import { useEffect, useState } from "react";

class MyRenderer extends Renderer {
  protected async renderMessages(messageNodes: ElementNode[]) {
    // Called on every (throttled) commit. Send / edit / delete in your target.
    for (const node of messageNodes) {
      console.log("commit:", node);
    }
  }
}

function Counter() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => v + 1), 200);
    return () => clearInterval(id);
  }, []);
  return <Message>Tick {n}</Message>;
}

const r = new MyRenderer({ throttleMs: 800 });
await r.render(<Counter />);
```

The `Renderer` base class:

- Owns the React fiber root and the output tree.
- Schedules `renderMessages(...)` calls on a throttle so you don't hammer your target.
- Flushes on `useFinishRender()` so your final state always lands.
- Warns when content is rendered outside `<Message>` and won't be displayed.

## What's in the box

- `Renderer` — abstract base; implement `renderMessages` for your target.
- `Message` — root element for a single sendable message; supports `repliesTo`, `linkPreview`.
- `LinkPreviewProvider` / `useLinkPreviewOptions` — context-driven link preview opts.
- `FinishRenderProvider` / `useFinishRender` — let the tree signal "we're done" so the renderer can flush + unmount.
- `serialize(node)` — generic HTML-like serializer (escapes, renders all built-in element types).
- `ConsoleRenderer` — built-in target that prints serialized messages to stdout. Useful for tests.
- `GroupRenderer` — fans a single render call out to multiple target renderers in parallel.
- `reconciler` — the underlying `react-reconciler` instance, in case you want to plug in directly.

## Built-in JSX intrinsics

`<Message>`, `<b>`, `<i>`, `<u>`, `<s>`, `<a href>`, `<code>`, `<pre>`, `<blockquote>`, `<br>`, `<div>`, `<p>`. They map onto a small typed `OutputNode` tree your renderer walks.

## Target packages

- [`@elumixor/react-telegram`](../react-telegram) — grammy-backed renderer that diffs into editable Telegram messages.

## Status

`0.x` — API is settled enough to use, but expect minor breakage as targets evolve.

## License

ISC
