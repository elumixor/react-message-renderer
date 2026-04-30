import { Renderer, type RendererOptions } from "../Renderer";
import { serialize } from "../serializer";
import type { ElementNode } from "../types";

export interface ConsoleRendererOptions extends RendererOptions {
  /** If true, calls console.clear() before each commit. Default true. */
  clear?: boolean;
}

export class ConsoleRenderer extends Renderer {
  private readonly clear: boolean;

  constructor(options: ConsoleRendererOptions = {}) {
    super(options);
    this.clear = options.clear ?? true;
  }

  protected override renderMessages(messageNodes: ElementNode[]): Promise<void> {
    if (this.clear) console.clear();

    for (const node of messageNodes) {
      const text = serialize(node);
      if (text.trim()) console.log(text);
    }

    return Promise.resolve();
  }
}
