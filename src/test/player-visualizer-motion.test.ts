import { describe, expect, test } from "bun:test";
import { THREE } from "@opentui/three";
import { createMusicMotion, spectrumBands } from "../apps/coastty-player/visualizer-motion";
import { createBarsScene, createBlobScene } from "../apps/coastty-player/visualizer-scenes";
import { themes } from "../ui/theme";

describe("music visualizer motion", () => {
  test("every frequency bin contributes at every prism count", () => {
    for (const count of [6, 8, 12]) {
      for (let active = 0; active < 24; active++) {
        const spectrum = Array.from({ length: 24 }, (_, i) => i === active ? 1 : 0);
        expect(spectrumBands(spectrum, count).some((value) => value > 0)).toBe(true);
      }
    }
  });
  test("bass onsets produce a decaying impulse, not a held camera punch", () => {
    const motion = createMusicMotion();
    const bass = [...Array<number>(8).fill(0.9), ...Array<number>(16).fill(0)];
    const onset = motion.update(bass, 1 / 60);
    expect(onset.onset).toBe(true);
    expect(onset.beat).toBeGreaterThan(0.9);
    let held = onset;
    for (let i = 0; i < 120; i++) held = motion.update(bass, 1 / 60);
    expect(held.onset).toBe(false);
    expect(held.beat).toBeLessThan(0.001);
    expect(held.bass).toBeCloseTo(0.9);
    expect(held.mid).toBe(0);
    expect(held.treble).toBe(0);
  });

  test("silence settles every band and stops the animation phase", () => {
    const motion = createMusicMotion();
    for (let i = 0; i < 60; i++) motion.update(Array<number>(24).fill(1), 1 / 60);
    for (let i = 0; i < 600; i++) motion.update([], 1 / 60);
    const silent = motion.update([], 1 / 60);
    expect(silent.peak).toBe(0);
    expect(silent.heights.every((height) => height === 0)).toBe(true);
    expect(motion.update([], 1 / 60).phase).toBe(silent.phase);
  });

  test("envelopes are frame-rate independent and sanitize bad input", () => {
    const at30 = createMusicMotion();
    const at60 = createMusicMotion();
    for (let i = 0; i < 30; i++) at30.update([0.8, 0.4, 0.2], 1 / 30);
    for (let i = 0; i < 60; i++) at60.update([0.8, 0.4, 0.2], 1 / 60);
    expect(at30.update([0.8, 0.4, 0.2], 0).bass).toBeCloseTo(at60.update([0.8, 0.4, 0.2], 0).bass, 6);
    const invalid = at30.update([NaN, Infinity, -4], NaN);
    expect(Number.isFinite(invalid.phase)).toBe(true);
    expect(invalid.heights.every(Number.isFinite)).toBe(true);
  });
});

describe("responsive blob motion", () => {
  test("isolated quiet bass hits survive band reduction and retrigger at audio polling cadence", () => {
    const motion = createMusicMotion("blob");
    const bass = Array<number>(24).fill(0);
    bass[1] = 0.18;
    // The renderable's zero-time initialization must not swallow the first hit.
    expect(motion.update(bass, 0).onset).toBe(false);
    const hit = motion.update(bass, 0.1);
    expect(hit.onset).toBe(true);
    expect(hit.beat).toBeGreaterThan(0.6);
    expect(hit.bass).toBeGreaterThan(0.09);
    expect(hit.mid).toBe(0);
    expect(hit.treble).toBe(0);
    for (let i = 0; i < 4; i++) expect(motion.update([], 0.1).onset).toBe(false);
    expect(motion.update(bass, 0.1).onset).toBe(true);
    for (let i = 0; i < 20; i++) expect(motion.update(bass, 0.1).onset).toBe(false);
    expect(motion.update(bass, 0.1).beat).toBeLessThan(0.001);
  });

  test("quiet mids and treble remain distinct from bass impulses", () => {
    for (const [index, band] of [[10, "mid"], [20, "treble"]] as const) {
      const motion = createMusicMotion("blob");
      const spectrum = Array<number>(24).fill(0);
      spectrum[index] = 0.2;
      const frame = motion.update(spectrum, 0.04);
      expect(frame[band]).toBeGreaterThan(0.1);
      expect(frame.bass).toBe(0);
      expect(frame.beat).toBe(0);
    }
  });

  test("noise stays idle and silence settles after music", () => {
    const motion = createMusicMotion("blob");
    const noise = motion.update([0.01, NaN, Infinity, -1], 0.04);
    expect(noise.peak).toBe(0);
    expect(noise.onset).toBe(false);
    for (let i = 0; i < 30; i++) motion.update([1, 1, 1], 1 / 30);
    for (let i = 0; i < 120; i++) motion.update([], 1 / 30);
    const settled = motion.update([], 1 / 30);
    expect(settled.peak).toBe(0);
    expect(settled.heights.every((height) => height === 0)).toBe(true);
    expect(motion.update([], 1 / 30).phase).toBe(settled.phase);
  });

  test("blob envelopes agree at 30 and 60 FPS", () => {
    const frames = [30, 60].map((fps) => {
      const motion = createMusicMotion("blob");
      motion.update([0.2, 0.4, 0.1], 0.04);
      for (let i = 0; i < fps; i++) motion.update([0.2, 0.4, 0.1], 1 / fps);
      for (let i = 0; i < fps / 2; i++) motion.update([], 1 / fps);
      return motion.update([], 0);
    });
    for (const band of ["bass", "mid", "treble", "beat"] as const) {
      expect(frames[0]![band]).toBeCloseTo(frames[1]![band], 6);
    }
  });

  test("the ring keeps its X/Y torus at rest and makes smooth, bounded ripples with music", () => {
    const model = createBlobScene();
    const ring = model.scene.getObjectByName("spectrum-ring") as THREE.Mesh<THREE.TorusGeometry>;
    const positions = ring.geometry.attributes.position!;
    const original = Float32Array.from(positions.array);
    try {
      model.update([], 1 / 30);
      expect(Float32Array.from(positions.array)).toEqual(original);
      for (let i = 0; i < 30; i++) model.update(Array<number>(24).fill(0.7), 1 / 30);
      let minimumRadius = Infinity;
      let maximumRadius = 0;
      for (let i = 0; i < positions.count; i++) {
        const radius = Math.hypot(positions.getX(i), positions.getY(i));
        minimumRadius = Math.min(minimumRadius, radius);
        maximumRadius = Math.max(maximumRadius, radius);
        expect(Number.isFinite(radius)).toBe(true);
        expect(Math.abs(positions.getZ(i))).toBeLessThan(0.25);
      }
      expect(maximumRadius - minimumRadius).toBeGreaterThan(0.2);
      expect(minimumRadius).toBeGreaterThan(1.3);
      expect(maximumRadius).toBeLessThan(2);
      // First and last tubular vertices coincide for every tube cross-section.
      for (let row = 0; row <= 8; row++) {
        const start = new THREE.Vector3().fromBufferAttribute(positions, row * 97);
        const end = new THREE.Vector3().fromBufferAttribute(positions, row * 97 + 96);
        expect(start.distanceTo(end)).toBeLessThan(0.00001);
      }
    } finally {
      model.dispose();
    }
  });

  test("bass, mids and treble each deform the blob rather than only spinning a sphere", () => {
    for (const activeBand of [0, 1, 2]) {
      const model = createBlobScene();
      try {
        const mesh = model.scene.getObjectByName("blob") as THREE.Mesh;
        const spectrum = Array.from({ length: 24 }, (_, index) => Math.floor(index / 8) === activeBand ? 0.6 : 0);
        for (let i = 0; i < 30; i++) model.update(spectrum, 1 / 30);
        const positions = mesh.geometry.attributes.position!;
        const vertex = new THREE.Vector3();
        let minimumRadius = Infinity;
        let maximumRadius = 0;
        for (let i = 0; i < positions.count; i++) {
          const radius = vertex.fromBufferAttribute(positions, i).length();
          minimumRadius = Math.min(minimumRadius, radius);
          maximumRadius = Math.max(maximumRadius, radius);
        }
        expect(maximumRadius - minimumRadius).toBeGreaterThan(activeBand === 2 ? 0.07 : 0.2);
      } finally {
        model.dispose();
      }
    }
  });

  test("loud blob hits and ring ripples stay framed without camera pumping", () => {
    const model = createBlobScene();
    try {
      for (const [columns, rows] of [[64, 20], [54, 30], [120, 14], [20, 10]] as const) {
        model.camera.aspect = columns / rows / 2;
        model.update([], 0, columns, rows);
        const cameraPosition = model.camera.position.clone();
        let extent = 0;
        for (let frame = 0; frame < 90; frame++) {
          model.update(Array<number>(24).fill(frame % 15 < 3 ? 1 : 0.15), 1 / 30, columns, rows);
          model.camera.updateMatrixWorld();
          model.scene.updateMatrixWorld(true);
          model.scene.traverseVisible((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            const positions = object.geometry.attributes.position!;
            const vertex = new THREE.Vector3();
            for (let i = 0; i < positions.count; i++) {
              vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(model.camera);
              extent = Math.max(extent, Math.abs(vertex.x), Math.abs(vertex.y));
            }
          });
          expect(model.camera.position.equals(cameraPosition)).toBe(true);
        }
        expect(extent).toBeLessThanOrEqual(1);
      }
    } finally {
      model.dispose();
    }
  });

  test("a new beat leaves the previous ripple expanding and fading to completion", () => {
    const model = createBlobScene();
    const childCount = model.scene.children.length;
    const pulses = model.scene.children.filter((object) => object.name === "beat-ripple") as THREE.Mesh<THREE.TorusGeometry, THREE.Material>[];
    const bass = [...Array<number>(8).fill(0.9), ...Array<number>(16).fill(0)];
    try {
      expect(model.update(bass, 0.05).onset).toBe(true);
      const first = pulses.find((pulse) => pulse.visible && pulse.material.opacity > 0)!;
      expect(first).toBeDefined();
      model.update([], 0.1);
      model.update([], 0.1);
      const radius = first.scale.x;
      const opacity = first.material.opacity;
      const rotation = first.rotation.clone();

      expect(model.update(bass, 0.05).onset).toBe(true);
      expect(first.scale.x).toBeGreaterThan(radius);
      expect(first.material.opacity).toBeLessThan(opacity);
      expect(first.material.opacity).toBeGreaterThan(0);
      expect(first.rotation.equals(rotation)).toBe(true);
      const active = () => pulses.filter((pulse) => pulse.visible && pulse.material.opacity > 0);
      expect(active()).toHaveLength(2);
      const second = active().find((pulse) => pulse !== first)!;
      expect(second.scale.x).toBeLessThan(first.scale.x);

      for (let i = 0; i < 11; i++) model.update([], 0.1);
      expect(first.material.opacity).toBe(0);
      expect(first.visible).toBe(false);
      expect(second.visible).toBe(true);
      for (let i = 0; i < 3; i++) model.update([], 0.1);
      expect(active()).toHaveLength(0);
      expect(model.update(bass, 0.05).onset).toBe(true);
      expect(active()).toHaveLength(1);
      expect(model.scene.children).toHaveLength(childCount);
    } finally {
      model.dispose();
    }
  });

  test("ripples capture the emitted waveform and retain it while later beats change the ring", () => {
    const model = createBlobScene();
    const ring = model.scene.getObjectByName("spectrum-ring") as THREE.Mesh<THREE.TorusGeometry>;
    const pulses = model.scene.children.filter((object) => object.name === "beat-ripple") as THREE.Mesh<THREE.TorusGeometry, THREE.Material>[];
    const centerline = (geometry: THREE.TorusGeometry, angle: number) => {
      const { tubularSegments, radialSegments } = geometry.parameters;
      const column = Math.round(angle * tubularSegments);
      const positions = geometry.attributes.position!;
      return new THREE.Vector3().fromBufferAttribute(positions, column)
        .add(new THREE.Vector3().fromBufferAttribute(positions, column + radialSegments / 2 * (tubularSegments + 1)))
        .multiplyScalar(0.5);
    };
    const expectEmittedShape = (pulse: typeof pulses[number]) => {
      expect(pulse.scale.x).toBe(1);
      expect(pulse.rotation.equals(ring.parent!.rotation)).toBe(true);
      for (let i = 0; i <= 16; i++) {
        expect(centerline(pulse.geometry, i / 16).distanceTo(centerline(ring.geometry, i / 16))).toBeLessThan(0.00001);
      }
    };
    try {
      for (let i = 0; i < 5; i++) model.update([0, 0.8, 0.3], 0.1);
      expect(model.update([0.9, 0.8, 0.3], 0.05).onset).toBe(true);
      const first = pulses.find((pulse) => pulse.visible)!;
      expectEmittedShape(first);
      const captured = Float32Array.from(first.geometry.attributes.position!.array);
      const rotation = first.rotation.clone();
      model.update([0, 0.1, 0.9], 0.1);
      model.update([0, 0.1, 0.9], 0.1);
      expect(model.update([0.8, 0.1, 0.9], 0.05).onset).toBe(true);
      const second = pulses.find((pulse) => pulse.visible && pulse !== first)!;
      expectEmittedShape(second);
      expect(second.geometry).not.toBe(first.geometry);
      expect(Float32Array.from(second.geometry.attributes.position!.array)).not.toEqual(captured);
      expect(Float32Array.from(first.geometry.attributes.position!.array)).toEqual(captured);
      expect(first.rotation.equals(rotation)).toBe(true);
      expect(first.scale.x).toBeGreaterThan(1);
    } finally {
      model.dispose();
    }
  });

  test("ripples expand twice as far over a doubled 4/3-second lifetime", () => {
    const model = createBlobScene();
    try {
      expect(model.update([0.9, 0.4, 0.2], 1 / 30).onset).toBe(true);
      const pulse = model.scene.children.find((object) => object.name === "beat-ripple" && object.visible) as THREE.Mesh<THREE.TorusGeometry, THREE.Material>;
      const positions = pulse.geometry.attributes.position!;
      let initialRadius = 0;
      for (let i = 0; i < positions.count; i++) {
        initialRadius = Math.max(initialRadius, Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i)));
      }
      const doubledTravel = (2 - initialRadius) * 2;
      for (let i = 0; i < 20; i++) model.update([], 1 / 30);
      expect(pulse.visible).toBe(true);
      expect(pulse.material.opacity).toBeCloseTo(0.65 * 0.25, 6);
      expect(pulse.scale.x * initialRadius).toBeCloseTo(initialRadius + doubledTravel * 0.75, 6);
      for (let i = 0; i < 21; i++) model.update([], 1 / 30);
      expect(pulse.visible).toBe(false);
      expect(pulse.material.opacity).toBe(0);
      expect(pulse.scale.x * initialRadius).toBeCloseTo(initialRadius + doubledTravel, 6);
    } finally {
      model.dispose();
    }
  });

  test("the longer fade supports rapid overlapping beats without dropping new ripples", () => {
    const model = createBlobScene();
    const pulses = model.scene.children.filter((object) => object.name === "beat-ripple");
    const childCount = model.scene.children.length;
    try {
      for (let beat = 0; beat < 16; beat++) {
        expect(model.update([0.9, 0.1, 0.1], 0.04).onset).toBe(true);
        expect(pulses.filter((pulse) => pulse.visible)).toHaveLength(Math.min(beat + 1, 7));
        for (let frame = 0; frame < 4; frame++) model.update([], 0.04);
      }
      expect(model.scene.children).toHaveLength(childCount);
      for (let i = 0; i < 14; i++) model.update([], 0.1);
      expect(pulses.every((pulse) => !pulse.visible)).toBe(true);
    } finally {
      model.dispose();
    }
  });
});

describe("visualizer scene lifecycle", () => {
  test("every loud prism vertex stays inside the camera at normal and narrow sizes", () => {
    const model = createBarsScene();
    model.setColors(themes.phosphor.colors);
    try {
      for (const [columns, rows] of [[64, 20], [40, 10], [20, 10], [10, 20], [120, 10]] as const) {
        model.camera.aspect = columns / rows / 2;
        for (let i = 0; i < 240; i++) model.update(Array<number>(24).fill(1), 1 / 30, columns, rows);
        model.camera.updateMatrixWorld();
        model.scene.updateMatrixWorld(true);
        model.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh) || !object.visible || object.userData.role === "grid") return;
          const positions = object.geometry.attributes.position!;
          const vertex = new THREE.Vector3();
          for (let i = 0; i < positions.count; i++) {
            vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(model.camera);
            expect(Math.abs(vertex.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(vertex.y)).toBeLessThanOrEqual(1);
          }
        });
      }
    } finally {
      model.dispose();
    }
  });

  for (const [name, createScene] of [["prisms", createBarsScene], ["nacre", createBlobScene]] as const) {
    test(`${name} fits narrow cameras and disposes shared resources once`, () => {
      const model = createScene();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      let disposedGeometries = 0;
      let disposedMaterials = 0;
      model.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      });
      geometries.forEach((geometry) => geometry.addEventListener("dispose", () => disposedGeometries++));
      materials.forEach((material) => material.addEventListener("dispose", () => disposedMaterials++));
      for (const theme of Object.values(themes)) {
        model.setColors(theme.colors);
        for (const aspect of [0.3, 1, 3]) {
          model.camera.aspect = aspect;
          model.update(Array<number>(24).fill(1), 0.1, 20);
          expect(model.camera.position.toArray().every(Number.isFinite)).toBe(true);
          expect(model.camera.position.length()).toBeLessThan(model.camera.far);
        }
      }
      model.dispose();
      expect(disposedGeometries).toBe(geometries.size);
      expect(disposedMaterials).toBe(materials.size);
      expect(model.scene.children).toHaveLength(0);
    });
  }
});
