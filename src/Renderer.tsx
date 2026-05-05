import type { ReactNode } from "react";
import { FinishRenderProvider } from "./finish-context";
import { reconciler } from "./reconciler";
import type { Container, ElementNode, OutputNode } from "./types";

function findMessageNodes(node: OutputNode): ElementNode[] {
  if (node.type === "TEXT") return [];
  if (node.type === "io-message") return [node];
  return node.children.flatMap(findMessageNodes);
}

function hasContentOutsideMessages(node: OutputNode): boolean {
  if (node.type === "TEXT") return node.text.trim().length > 0;
  if (node.type === "io-message") return false;
  if (node.type === "io-root") return node.children.some(hasContentOutsideMessages);
  return true;
}

export interface RendererOptions {
  /** How often commits are allowed to happen while rendering continuously, in ms. */
  throttleMs?: number;
  /** Optional logger surface for warnings/errors. Defaults to console. */
  logger?: RendererLogger;
}

export interface RendererLogger {
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

const defaultLogger: RendererLogger = {
  warn(message, meta) {
    if (meta !== undefined) console.warn(message, meta);
    else console.warn(message);
  },
  error(message, meta) {
    if (meta !== undefined) console.error(message, meta);
    else console.error(message);
  },
};

export interface IRenderer {
  render(element: ReactNode): Promise<void>;
}

export abstract class Renderer implements IRenderer {
  private readonly throttleMs: number;
  protected readonly logger: RendererLogger;
  private throttleTimer?: ReturnType<typeof setTimeout>;
  private currentRoot?: ElementNode;
  private commitChain: Promise<void> = Promise.resolve();

  constructor({ throttleMs = 800, logger = defaultLogger }: RendererOptions = {}) {
    this.throttleMs = throttleMs;
    this.logger = logger;
  }

  render(element: ReactNode): Promise<void> {
    const root: ElementNode = { type: "io-root", props: {}, children: [] };
    this.currentRoot = root;

    const container: Container = {
      root,
      commitUpdate: () => this.scheduleCommit(),
    };

    const fiberRoot = reconciler.createContainer(
      container,
      1,
      null,
      false,
      false,
      "",
      (error) => {
        this.logger.error("React uncaught error", error);
      },
      (error) => {
        this.logger.error("React caught error", error);
      },
      (error) => {
        this.logger.warn("React recoverable error", error);
      },
      () => this.logger.error("React scheduler error"),
    );

    const unmount = () => reconciler.updateContainer(null, fiberRoot, null, null);

    return new Promise<void>((resolve) => {
      const wrappedElement = (
        <FinishRenderProvider
          onFinish={async () => {
            // Drain pending setStates into currentRoot before reading it for the
            // final commit. flushSyncFromReconciler handles sync-priority work;
            // the macrotask yield covers any work the Scheduler still has queued
            // (e.g. effects that fire post-commit and dispatch their own state).
            reconciler.flushSyncFromReconciler();
            await new Promise<void>((r) => setTimeout(r, 0));
            reconciler.flushSyncFromReconciler();
            await this.flushCommit();
            this.currentRoot = undefined;
            unmount();
            resolve();
          }}
        >
          {element}
        </FinishRenderProvider>
      );

      reconciler.updateContainer(wrappedElement, fiberRoot, null, null);
      this.scheduleCommit();
    });
  }

  /** Schedule a commit at a fixed rate (throttleMs). */
  private scheduleCommit(): void {
    if (this.throttleTimer) return;
    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = undefined;
      this.commitChain = this.commitChain.then(() => this.doCommit());
    }, this.throttleMs);
  }

  /** Flush any pending commit immediately, waiting for any in-flight commit to drain first. */
  private async flushCommit(): Promise<void> {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = undefined;
    }
    this.commitChain = this.commitChain.then(() => this.doCommit());
    await this.commitChain;
  }

  /** One commit pass. Errors are logged so the serialized chain never breaks. */
  private async doCommit(): Promise<void> {
    if (!this.currentRoot) return;
    try {
      const messageNodes = findMessageNodes(this.currentRoot);

      if (messageNodes.length === 0 && hasContentOutsideMessages(this.currentRoot)) {
        this.logger.warn(
          "Content rendered outside of <Message> components will not be displayed. Wrap your content in <Message>.",
        );
      }

      await this.renderMessages(messageNodes);
    } catch (error) {
      this.logger.error("Failed to commit messages", error);
    }
  }

  protected abstract renderMessages(messageNodes: ElementNode[]): Promise<void>;
}
