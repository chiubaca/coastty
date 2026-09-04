import { describe, expect, test } from "bun:test";
import { ImageRenderable, type Renderable } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext } from "@effect-atom/atom-react/RegistryContext";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { AsciiCameraFrame, nextWebcamDisplayMode, Webcam } from "../apps/webcam";
import { ASCII_RAMP, frameToAscii } from "../apps/webcam/ascii";
import { buildWebcamCommand, splitJpegFrames, type WebcamCapture } from "../apps/webcam/capture";
import { ThemeProvider } from "../ui/theme";

function join(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function findRenderable(root: Renderable, id: string): Renderable | undefined {
  if (root.id === id) return root;
  for (const child of root.getChildren()) {
    const match = findRenderable(child, id);
    if (match) return match;
  }
  return undefined;
}

describe("webcam capture", () => {
  test("extracts complete JPEG frames and retains an incomplete frame", () => {
    const first = Uint8Array.from([0xff, 0xd8, 0x01, 0xff, 0xd9]);
    const second = Uint8Array.from([0xff, 0xd8, 0x02, 0x03, 0xff, 0xd9]);
    const partial = Uint8Array.from([0xff, 0xd8, 0x04]);

    const result = splitJpegFrames(join(Uint8Array.from([0x00]), first, second, partial));

    expect(result.frames.map((frame) => Array.from(frame))).toEqual([
      Array.from(first),
      Array.from(second),
    ]);
    expect(Array.from(result.remainder)).toEqual(Array.from(partial));
  });

  test("retains a JPEG marker split between chunks", () => {
    const firstChunk = splitJpegFrames(Uint8Array.from([0x00, 0xff]));
    const secondChunk = splitJpegFrames(join(firstChunk.remainder, Uint8Array.from([0xd8, 0x01, 0xff, 0xd9])));

    expect(secondChunk.frames.map((frame) => Array.from(frame))).toEqual([
      [0xff, 0xd8, 0x01, 0xff, 0xd9],
    ]);
    expect(secondChunk.remainder).toHaveLength(0);
  });

  test("builds platform-specific FFmpeg input commands", () => {
    const macCommand = buildWebcamCommand("darwin", "2:none");
    const frameRateFlag = macCommand.indexOf("-framerate");

    expect(macCommand).toContain("2:none");
    expect(macCommand[frameRateFlag + 1]).toBe("30");
    expect(macCommand).toContain("1280x720");
    expect(buildWebcamCommand("linux", "/dev/video4")).toContain("/dev/video4");
    expect(() => buildWebcamCommand("win32")).toThrow("not supported");
  });

  test("converts a JPEG frame to a fixed ASCII grid", async () => {
    const jpeg = await readFile(fileURLToPath(new URL("../assets/boot-logo.jpg", import.meta.url)));
    const rows = frameToAscii(new Uint8Array(jpeg), 24, 10);

    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.length === 24)).toBe(true);
    expect(Array.from(rows.join("")).every((character) => ASCII_RAMP.includes(character))).toBe(true);
    expect(new Set(rows.join("")).size).toBeGreaterThan(1);
  });

  test("toggles between image and ASCII display modes", () => {
    expect(nextWebcamDisplayMode("image")).toBe("ascii");
    expect(nextWebcamDisplayMode("ascii")).toBe("image");
  });

  test("renders an ASCII frame across its viewport", async () => {
    const jpeg = await readFile(fileURLToPath(new URL("../assets/boot-logo.jpg", import.meta.url)));
    const { renderer, flush } = await createTestRenderer({ width: 24, height: 10 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(
        "box",
        { width: 24, height: 10 },
        createElement(AsciiCameraFrame, {
          frame: new Uint8Array(jpeg),
          width: 24,
          height: 10,
          cellAspectRatio: 0.5,
          color: "#ffffff",
        }),
      )));
      await flush();

      expect(findRenderable(renderer.root, "webcam-ascii")?.width).toBe(24);
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });

  test("stretches a decoded frame across the camera viewport", async () => {
    const jpeg = await readFile(fileURLToPath(new URL("../assets/boot-logo.jpg", import.meta.url)));
    const registry = Registry.make();
    const { renderer, flush, waitFor, captureCharFrame } = await createTestRenderer({ width: 40, height: 20 });
    const root = createRoot(renderer);
    let unmounted = false;
    const startCapture = (callbacks: { readonly onFrame: (frame: Uint8Array) => void }): WebcamCapture => {
      queueMicrotask(() => callbacks.onFrame(new Uint8Array(jpeg)));
      return { stop: () => {} };
    };

    try {
      flushSync(() => root.render(createElement(
        RegistryContext.Provider,
        { value: registry },
        createElement(
          ThemeProvider,
          null,
          createElement(
            "box",
            { width: 40, height: 20 },
            createElement(Webcam, {
              appId: "webcam",
              contentSize: { width: 40, height: 20 },
              startCapture,
            }),
          ),
        ),
      )));
      await flush();
      await waitFor(() => findRenderable(renderer.root, "webcam-frame") !== undefined);

      const image = findRenderable(renderer.root, "webcam-frame") as ImageRenderable;
      await image.loadPromise;
      await flush();

      expect(image.width).toBe(40);
      expect(image.image).not.toBeNull();
      expect(image.loadError).toBeNull();
      expect(captureCharFrame()).toContain("LIVE");

      root.unmount();
      unmounted = true;
    } finally {
      if (!unmounted) root.unmount();
      renderer.destroy();
      registry.dispose();
    }
  });
});
