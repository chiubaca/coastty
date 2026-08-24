import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { extname } from "node:path";
import { loadGallery } from "../apps/image-viewer";

describe("image viewer gallery", () => {
  test("discovers every supported image in the gallery directory", async () => {
    const images = await loadGallery();
    const names = await readdir(new URL("../assets/gallery/", import.meta.url));
    const expected = names
      .filter((name) => [".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"].includes(extname(name).toLowerCase()))
      .sort((left, right) => left.localeCompare(right));

    expect(images.map((image) => image.name)).toEqual(expected);
    expect(images.every((image) => image.path.startsWith("/"))).toBe(true);
  });
});
