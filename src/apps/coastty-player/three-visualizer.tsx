import { CliRenderEvents, OptimizedBuffer, Renderable, type CliRenderer, type RenderableOptions, type RenderContext } from "@opentui/core";
import { extend } from "@opentui/react";
import { ThreeCliRenderer } from "@opentui/three";
import { CoasttyText } from "../../ui/coastty-text";
import type { ThemeColors } from "../../ui/theme";
import { AsciiStarfield } from "./ascii-starfield";
import { createBarsScene, createBlobScene, type MusicScene } from "./visualizer-scenes";

interface VisualizerProps {
  readonly kind: "bars" | "blob";
  readonly spectrum: readonly number[];
  readonly colors: ThemeColors;
}

export class MusicRenderable extends Renderable {
  private readonly model: MusicScene;
  private readonly host: CliRenderer;
  private readonly engine: ThreeCliRenderer;
  private readonly destroyWithHost = () => this.destroy();
  private pixels: OptimizedBuffer | null = null;
  private initialized = false;
  private drawing = false;
  private failed = false;
  private released = false;
  spectrum: readonly number[];

  constructor(ctx: RenderContext, options: RenderableOptions & VisualizerProps) {
    const { kind, spectrum, colors, ...layout } = options;
    super(ctx, { ...layout, buffered: true, live: true });
    const host = ctx as CliRenderer;
    const existingDestroyListeners = new Set(host.listeners(CliRenderEvents.DESTROY));
    const model = kind === "bars" ? createBarsScene() : createBlobScene();
    model.setColors(colors);
    model.update(spectrum, 0);
    this.host = host;
    this.model = model;
    this.spectrum = spectrum;
    this.engine = new ThreeCliRenderer(host, { width: 1, height: 1, autoResize: false });
    this.engine.setActiveCamera(model.camera);

    // @opentui/three 0.5.8 destroys the engine on host shutdown before the
    // renderable tree, and never unregisters that listener. Replace only the
    // listeners installed by the synchronous engine constructor with our owner hook.
    for (const listener of host.listeners(CliRenderEvents.DESTROY)) {
      if (!existingDestroyListeners.has(listener)) host.off(CliRenderEvents.DESTROY, listener);
    }
    host.on(CliRenderEvents.DESTROY, this.destroyWithHost);
    host.setFrameCallback(this.drawFrame);
  }

  set colors(colors: ThemeColors) {
    this.model.setColors(colors);
    this.requestRender();
  }

  getScene() {
    return this.model.scene;
  }

  private readonly drawFrame = async (deltaTime: number) => {
    if (this.isDestroyed || !this.visible || !this.parent || this.drawing || this.failed || this.width < 1 || this.height < 1) return;
    this.drawing = true;
    try {
      if (!this.initialized) {
        await this.engine.init();
        this.initialized = true;
      }
      if (this.isDestroyed) return;
      const width = this.width;
      const height = this.height;
      if (!this.pixels || this.pixels.width !== width || this.pixels.height !== height) {
        this.pixels?.destroy();
        this.pixels = OptimizedBuffer.create(width, height, this.host.widthMethod);
        this.engine.setSize(width, height, true);
      }
      const resolution = this.host.resolution;
      const cellAspect = resolution
        ? (resolution.width / this.host.terminalWidth) / (resolution.height / this.host.terminalHeight)
        : 0.5;
      this.model.camera.aspect = width / height * cellAspect;
      this.model.update(this.spectrum, deltaTime / 1_000, width, height);
      // Own the readback buffer independently of the renderable's framebuffer:
      // unmount/resize may destroy that framebuffer while the GPU is still drawing.
      await this.engine.drawScene(this.model.scene, this.pixels, deltaTime / 1_000);
      if (!this.isDestroyed) this.requestRender();
    } catch (error) {
      this.failed = true;
      this.live = false;
      console.error("Music visualizer render failed:", error);
    } finally {
      this.drawing = false;
      if (this.isDestroyed) this.release();
    }
  };

  protected override renderSelf(buffer: OptimizedBuffer) {
    if (this.pixels) buffer.drawFrameBuffer(0, 0, this.pixels);
  }

  private release() {
    if (this.released) return;
    this.released = true;
    this.model.dispose();
    this.engine.destroy();
    this.pixels?.destroy();
    this.pixels = null;
  }

  protected override destroySelf() {
    this.host.off(CliRenderEvents.DESTROY, this.destroyWithHost);
    this.host.removeFrameCallback(this.drawFrame);
    if (!this.drawing) this.release();
    super.destroySelf();
  }
}

declare module "@opentui/react" {
  interface OpenTUIComponents {
    musicScene: typeof MusicRenderable;
  }
}
extend({ musicScene: MusicRenderable });

export function ThreeVisualizer({ kind, spectrum, colors }: VisualizerProps) {
  return (
    <box flexGrow={1} minWidth={1} minHeight={1} backgroundColor={colors.background} overflow="hidden">
      <musicScene key={kind} kind={kind} spectrum={spectrum} colors={colors} flexGrow={1} minWidth={1} minHeight={1} />
      {kind === "blob" ? <AsciiStarfield spectrum={spectrum} colors={colors} /> : null}
      <box position="absolute" top={0} left={1} backgroundColor={colors.background}>
        <CoasttyText fg={colors.muted}>{kind === "bars" ? "PRISM / SPECTRUM" : "NACRE / AUDIO SCULPTURE"}</CoasttyText>
      </box>
    </box>
  );
}
