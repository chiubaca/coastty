const JPEG_START = [0xff, 0xd8] as const;
const JPEG_END = [0xff, 0xd9] as const;
const MAX_PARTIAL_FRAME_BYTES = 8 * 1024 * 1024;

export type WebcamCapture = {
  stop: () => void;
};

type WebcamCaptureCallbacks = {
  readonly onFrame: (frame: Uint8Array) => void;
  readonly onError: (message: string) => void;
};

function findMarker(bytes: Uint8Array, marker: readonly [number, number], offset: number): number {
  for (let index = offset; index < bytes.length - 1; index += 1) {
    if (bytes[index] === marker[0] && bytes[index + 1] === marker[1]) return index;
  }
  return -1;
}

export function splitJpegFrames(bytes: Uint8Array): {
  readonly frames: readonly Uint8Array[];
  readonly remainder: Uint8Array;
} {
  const frames: Uint8Array[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const start = findMarker(bytes, JPEG_START, offset);
    if (start === -1) {
      const remainder = bytes.at(-1) === JPEG_START[0] ? bytes.slice(-1) : new Uint8Array();
      return { frames, remainder };
    }

    const end = findMarker(bytes, JPEG_END, start + JPEG_START.length);
    if (end === -1) return { frames, remainder: bytes.slice(start) };

    frames.push(bytes.slice(start, end + JPEG_END.length));
    offset = end + JPEG_END.length;
  }

  return { frames, remainder: new Uint8Array() };
}

function joinBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (left.length === 0) return right;
  const joined = new Uint8Array(left.length + right.length);
  joined.set(left);
  joined.set(right, left.length);
  return joined;
}

export function buildWebcamCommand(
  platform: string = process.platform,
  configuredDevice: string | undefined = process.env.COASTTY_CAMERA_DEVICE,
): string[] {
  const commonOutput = [
    "-vf", "fps=6,scale=480:-2,hflip",
    "-f", "image2pipe",
    "-c:v", "mjpeg",
    "-q:v", "6",
    "pipe:1",
  ];

  if (platform === "darwin") {
    return [
      "ffmpeg", "-hide_banner", "-loglevel", "error",
      "-f", "avfoundation", "-framerate", "30",
      "-video_size", "1280x720", "-pixel_format", "nv12",
      "-i", configuredDevice ?? "0:none",
      ...commonOutput,
    ];
  }

  if (platform === "linux") {
    return [
      "ffmpeg", "-hide_banner", "-loglevel", "error",
      "-f", "v4l2", "-framerate", "12",
      "-i", configuredDevice ?? "/dev/video0",
      ...commonOutput,
    ];
  }

  throw new Error(`Webcam capture is not supported on ${platform}.`);
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/enoent|not found|failed to spawn|executable/i.test(message)) {
    return "FFmpeg was not found. Install ffmpeg and restart Coastty.";
  }
  return message;
}

function describeExit(stderr: string, exitCode: number): string {
  if (/not authorized|permission|operation not permitted/i.test(stderr)) {
    return "Camera access was denied. Allow your terminal under System Settings > Privacy & Security > Camera.";
  }
  if (/selected framerate.*not supported/is.test(stderr)) {
    return "The camera does not support Coastty's 30 FPS capture mode.";
  }
  if (/no such file|could not find video device|invalid device index/i.test(stderr)) {
    return "No camera was found. Set COASTTY_CAMERA_DEVICE to a valid FFmpeg video device.";
  }

  const detail = stderr.trim().split(/\r?\n/).findLast((line) => line.length > 0);
  return detail ?? `The camera process stopped with exit code ${exitCode}.`;
}

export function startWebcamCapture(callbacks: WebcamCaptureCallbacks): WebcamCapture {
  let stopped = false;
  let failureReported = false;
  let terminate = () => {};

  function reportFailure(message: string) {
    if (stopped || failureReported) return;
    failureReported = true;
    callbacks.onError(message);
  }

  try {
    const child = Bun.spawn({
      cmd: buildWebcamCommand(),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });

    terminate = () => {
      try {
        child.kill();
      } catch {
        // The process may already have exited after a camera or permission error.
      }
    };

    void (async () => {
      const stderrPromise = new Response(child.stderr).text().catch((error) => String(error));
      const reader = child.stdout.getReader();
      let remainder: Uint8Array = new Uint8Array();

      try {
        while (!stopped) {
          const result = await reader.read();
          if (result.done) break;

          const split = splitJpegFrames(joinBytes(remainder, result.value));
          remainder = split.remainder;
          for (const frame of split.frames) callbacks.onFrame(frame);

          if (remainder.byteLength > MAX_PARTIAL_FRAME_BYTES) {
            reportFailure("The camera returned an invalid video stream.");
            terminate();
            break;
          }
        }
      } catch (error) {
        reportFailure(describeError(error));
        terminate();
      } finally {
        reader.releaseLock();
      }

      const [exitCode, stderr] = await Promise.all([child.exited, stderrPromise]);
      if (!stopped) reportFailure(describeExit(stderr, exitCode));
    })();
  } catch (error) {
    queueMicrotask(() => reportFailure(describeError(error)));
  }

  return {
    stop() {
      stopped = true;
      terminate();
    },
  };
}
