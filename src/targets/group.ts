import type { ReactNode } from "react";
import type { IRenderer } from "../Renderer";

export class GroupRenderer implements IRenderer {
  private readonly renderers: IRenderer[];

  constructor(...renderers: IRenderer[]) {
    this.renderers = renderers;
  }

  async render(element: ReactNode) {
    await Promise.all(this.renderers.map((r) => r.render(element)));
  }
}
