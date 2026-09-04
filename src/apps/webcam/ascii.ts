import { NativeImage } from "@opentui/core";

export const ASCII_RAMP = " .:-=+*#%@";

export function frameToAscii(
  frame: Uint8Array,
  requestedWidth: number,
  requestedHeight: number,
  cellAspectRatio = 0.5,
): readonly string[] {
  const width = Math.max(1, Math.floor(requestedWidth));
  const height = Math.max(1, Math.floor(requestedHeight));
  const cellAspect = Math.max(0.25, Math.min(1, cellAspectRatio));
  const targetAspect = (width * cellAspect) / height;
  const decoded = NativeImage.decode(frame);
  let cropped: NativeImage | undefined;
  let resized: NativeImage | undefined;

  try {
    const sourceAspect = decoded.width / decoded.height;
    if (sourceAspect > targetAspect) {
      const cropWidth = Math.max(1, Math.min(decoded.width, Math.round(decoded.height * targetAspect)));
      cropped = decoded.extract({
        left: Math.floor((decoded.width - cropWidth) / 2),
        top: 0,
        width: cropWidth,
        height: decoded.height,
      });
    } else if (sourceAspect < targetAspect) {
      const cropHeight = Math.max(1, Math.min(decoded.height, Math.round(decoded.width / targetAspect)));
      cropped = decoded.extract({
        left: 0,
        top: Math.floor((decoded.height - cropHeight) / 2),
        width: decoded.width,
        height: cropHeight,
      });
    }

    resized = (cropped ?? decoded).resize({ width, height, kernel: "area" });
    const pixels = resized.raw("rgba8");

    return Array.from({ length: height }, (_, y) => {
      let row = "";
      for (let x = 0; x < width; x += 1) {
        const offset = y * pixels.stride + x * 4;
        const red = pixels.data[offset] ?? 0;
        const green = pixels.data[offset + 1] ?? 0;
        const blue = pixels.data[offset + 2] ?? 0;
        const alpha = (pixels.data[offset + 3] ?? 255) / 255;
        const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) * alpha;
        const rampIndex = Math.min(ASCII_RAMP.length - 1, Math.floor((luminance / 256) * ASCII_RAMP.length));
        row += ASCII_RAMP[rampIndex] ?? " ";
      }
      return row;
    });
  } finally {
    resized?.dispose();
    cropped?.dispose();
    decoded.dispose();
  }
}
