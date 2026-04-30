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
  private isCommitting = false;
  private needsCommit = false;

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
      void this.doCommit({ flush: false });
    }, this.throttleMs);
  }

  /** Flush any pending commit immediately. */
  private async flushCommit(): Promise<void> {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = undefined;
    }
    await this.doCommit({ flush: true });
  }

  /** Execute the actual commit. Serializes concurrent calls. */
  private async doCommit({ flush }: { flush: boolean }): Promise<void> {
    if (!this.currentRoot) return;

    if (this.isCommitting) {
      this.needsCommit = true;
      return;
    }

    this.isCommitting = true;
    this.needsCommit = false;

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
    } finally {
      this.isCommitting = false;

      if (this.needsCommit) {
        this.needsCommit = false;
        if (flush) {
          await this.doCommit({ flush: true });
        } else {
          this.scheduleCommit();
        }
      }
    }
  }

  protected abstract renderMessages(messageNodes: ElementNode[]): Promise<void>;
}
