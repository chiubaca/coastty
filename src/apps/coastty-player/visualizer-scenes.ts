import { THREE } from "@opentui/three";
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";
import { mix, normalLocal, positionLocal, uniform } from "three/tsl";
import type { ThemeColors } from "../../ui/theme";
import { createMusicMotion, spectrumBands, type MusicFrame } from "./visualizer-motion";

export type MusicScene = ReturnType<typeof createBarsScene> | ReturnType<typeof createBlobScene>;

function luminous(color: string, opacity = 1) {
  return new MeshBasicNodeMaterial({
    color, transparent: opacity < 1, opacity, depthWrite: opacity === 1,
  });
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  scene.clear();
}

// Keep the entire composition in view even with the library open in a narrow window.
function fitCamera(
  camera: THREE.PerspectiveCamera,
  halfWidth: number,
  halfHeight: number,
  depth: number,
  direction: THREE.Vector3,
  zoom = 1,
) {
  const halfFov = camera.fov * Math.PI / 360;
  const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right);
  const corner = new THREE.Vector3();
  let distance = 0;
  // Fit all eight camera-space corners, including the nearer side of an angled composition.
  for (const x of [-halfWidth, halfWidth]) for (const y of [-halfHeight, halfHeight]) for (const z of [-depth, depth]) {
    corner.set(x, y, z);
    const framing = Math.max(Math.abs(corner.dot(up)), Math.abs(corner.dot(right)) / Math.max(0.05, camera.aspect));
    distance = Math.max(distance, corner.dot(direction) + framing / Math.tan(halfFov));
  }
  distance *= 1.03 * zoom;
  camera.far = Math.max(100, distance + 20);
  camera.updateProjectionMatrix();
  camera.position.copy(direction).multiplyScalar(distance);
  camera.lookAt(0, 0, 0);
}

function ringDisplacement(angle: number, music: MusicFrame) {
  // Mirror the spectrum around the ring: bass meets bass at the seam, not treble.
  const position = (0.5 - Math.cos(angle) * 0.5) * (music.heights.length - 1);
  const index = Math.floor(position);
  const fraction = position - index;
  const level = music.heights[index]! * (1 - fraction)
    + music.heights[Math.min(index + 1, music.heights.length - 1)]! * fraction;
  return {
    radius: 1.32 + music.bass * 0.12 + music.beat * 0.16
      + level * (0.2 + Math.sin(angle * 6 - music.phase * 3.5) * 0.14),
    depth: Math.sin(angle * 3 + music.phase * 2) * level * (0.04 + music.treble * 0.1),
  };
}

function deformWaveformRing(
  target: THREE.BufferGeometry,
  base: Float32Array,
  music: MusicFrame,
) {
  const positions = target.attributes.position!;

  for (let i = 0; i < positions.count; i++) {
    const x = base[i * 3]!;
    const y = base[i * 3 + 1]!;
    const z = base[i * 3 + 2]!;
    // TorusGeometry lies in X/Y; Z is the tube depth, not a radial axis.
    const originalRadius = Math.hypot(x, y);
    const displacement = ringDisplacement(Math.atan2(y, x), music);
    const thickness = 1 + music.treble * 0.5 + music.beat * 0.3;
    const radius = displacement.radius + (originalRadius - 1.32) * thickness;
    positions.setXYZ(i, x / originalRadius * radius, y / originalRadius * radius, z * thickness + displacement.depth);
  }
  positions.needsUpdate = true;
}

export function createBarsScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  // Look across the array instead of straight at it. The x component exposes
  // the side faces, while the y component lets the rows recede into a floor.
  const direction = new THREE.Vector3(0.62, 0.52, 1).normalize();
  const visual = new THREE.Group();
  const barsVisual = new THREE.Group();
  scene.add(visual);
  visual.add(barsVisual);
  const motion = createMusicMotion();
  const count = 12;
  const depthRows = 3;
  const depthSpacing = 0.48;
  const geometry = new THREE.BoxGeometry(0.3, 1, 0.28);
  const capGeometry = new THREE.BoxGeometry(0.305, 0.09, 0.285);
  const bottom = uniform(new THREE.Color());
  const top = uniform(new THREE.Color());
  const barMaterial = new MeshBasicNodeMaterial();
  barMaterial.colorNode = mix(bottom, top, positionLocal.y.add(0.5).mul(0.75).add(0.25))
    .mul(normalLocal.x.abs().mul(-0.58).add(1));
  const capMaterial = luminous("#ffffff");
  const stageMaterial = luminous("#ffffff", 0.34);
  const bars = Array.from({ length: depthRows }, (_, row) => Array.from({ length: count }, (_, index) => {
    const mesh = new THREE.Mesh(geometry, barMaterial);
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    mesh.rotation.y = cap.rotation.y = 0.24 + row * 0.025;
    mesh.scale.y = 0.025;
    barsVisual.add(mesh, cap);
    return { mesh, cap, row, index };
  })).flat();

  // A sparse floor grid gives the terminal-sized prisms a vanishing point and
  // makes the depth motion readable without competing with the spectrum.
  const floor = new THREE.Group();
  const floorLines: THREE.Mesh[] = [];
  for (let row = 0; row < 7; row++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.018, 0.018), stageMaterial);
    line.userData.role = "grid";
    line.position.set(0, -0.98, -1.35 + row * 0.45);
    floor.add(line);
    floorLines.push(line);
  }
  for (let column = 0; column < 9; column++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 3.05), stageMaterial);
    line.userData.role = "grid";
    line.position.set(-3.15 + column * 0.7875, -0.98, 0);
    floor.add(line);
    floorLines.push(line);
  }
  visual.add(floor);
  const horizon = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.035, 0.04), stageMaterial);
  horizon.userData.role = "grid";
  horizon.position.set(0, -0.97, 1.35);
  visual.add(horizon);
  let time = 0;

  return {
    scene, camera,
    setColors(colors: ThemeColors) {
      // OpenTUI emits linear RGB directly to terminal cells; keep the surrounding theme exact.
      scene.background = new THREE.Color(colors.background).convertLinearToSRGB();
      bottom.value.set(colors.accent).multiplyScalar(0.12);
      top.value.set(colors.accent);
      capMaterial.color.set(colors.glowSoft);
      stageMaterial.color.set(colors.secondary);
    },
    update(spectrum: readonly number[], seconds: number, columns = 64, rows = 24) {
      const music = motion.update(spectrum, seconds);
      // Keep silent scenes idle so OpenTUI can stop scheduling frames. Audio
      // energy, rather than wall-clock time, drives the parallax animation.
      time += music.seconds * Math.min(1, music.peak * 2);
      const visibleCount = columns < 32 ? 6 : columns < 54 ? 8 : count;
      const baseSpread = columns < 54 ? 4.8 : 5.6;
      const aspectScale = Math.pow(
        THREE.MathUtils.clamp(camera.aspect / 1.6, 0.5, 4),
        0.85,
      );
      const spread = THREE.MathUtils.clamp(baseSpread * aspectScale, 2.6, 12);
      const heights = spectrumBands(music.heights, visibleCount);
      const visibleDepth = columns < 40 || rows < 14 || columns <= 54 ? 1 : columns < 90 ? 2 : depthRows;
      const spacing = spread / visibleCount;

      // Slowly turn the bars against the stationary floor. This tiny parallax
      // movement makes the perspective feel alive even between audio onsets.
      barsVisual.rotation.y = -0.11 + Math.sin(time * 0.38) * 0.075;
      barsVisual.rotation.x = Math.sin(time * 0.21) * 0.018;
      bars.forEach(({ mesh, cap, row, index }) => {
        mesh.visible = cap.visible = row < visibleDepth && index < visibleCount;
        if (!mesh.visible) return;
        const depthRatio = visibleDepth === 1 ? 1 : row / (visibleDepth - 1);
        const z = (row - (visibleDepth - 1) / 2) * depthSpacing;
        const sourceIndex = (index + row * 2) % visibleCount;
        const depthPulse = 0.94 + Math.sin(music.phase * 1.45 + index * 0.24 - row * 0.8)
          * (0.025 + music.peak * 0.045);
        const height = 0.025 + Math.pow(heights[sourceIndex]!, 0.7) * (2.1 + depthRatio * 0.55) * depthPulse;
        mesh.position.set((index - (visibleCount - 1) / 2) * spacing, -0.95 + height / 2, z);
        cap.position.set(mesh.position.x, -0.95 + height, z);
        mesh.scale.x = cap.scale.x = spacing * 0.53 / 0.3;
        mesh.scale.z = cap.scale.z = 0.82 + depthRatio * 0.15;
        mesh.scale.y = height;
        cap.visible = heights[sourceIndex]! > 0.01;
      });
      // Match the floor to the camera's horizontal composition at every bar spread.
      // Let the plane run past the frustum so its clipped edges always reach
      // the sides of the viewport, including wide and tall aspect ratios.
      floor.scale.set((spread + 0.7) / 6.3 * 1.15, 1, 1.15);
      horizon.scale.x = (spread + 0.7) / 6.3 * 1.15;
      const gridQuality = columns < 40 || rows < 14 ? 1 : columns < 72 ? 2 : 3;
      floorLines.forEach((line, index) => {
        line.visible = gridQuality === 3 || index % gridQuality === 0;
      });
      horizon.visible = true;
      fitCamera(camera, spread / 2 + 0.35, 1.75, 1.45, direction, 0.87);
      return music;
    },
    dispose() { disposeScene(scene); },
  };
}

export function createBlobScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const direction = new THREE.Vector3(0, 0.14, 1).normalize();
  const motion = createMusicMotion("blob");
  const visual = new THREE.Group();
  scene.add(visual);

  const geometry = new THREE.SphereGeometry(0.88, 48, 32);
  const original = Float32Array.from(geometry.attributes.position!.array);
  const material = new MeshStandardNodeMaterial({ metalness: 0.25, roughness: 0.32, emissiveIntensity: 0.04 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "blob";
  visual.add(mesh);
  const orbit = new THREE.Group();
  orbit.rotation.set(1.12, 0.28, -0.35);
  const ringGeometry = new THREE.TorusGeometry(1.32, 0.035, 8, 96);
  const ringOriginal = Float32Array.from(ringGeometry.attributes.position!.array);
  const ring = new THREE.Mesh(ringGeometry, luminous("#ffffff", 0.65));
  ring.name = "spectrum-ring";
  orbit.add(ring);
  const beadGeometry = new THREE.SphereGeometry(0.032, 8, 6);
  const beads = Array.from({ length: 3 }, () => {
    const bead = new THREE.Mesh(beadGeometry, luminous("#ffffff"));
    bead.name = "orbit-bead";
    orbit.add(bead);
    return bead;
  });
  scene.add(orbit);

  // Eight slots cover the 4/3-second fade at the detector's 180ms minimum beat spacing.
  const pulses = Array.from({ length: 8 }, () => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.012, 8, 96), luminous("#ffffff", 0));
    mesh.name = "beat-ripple";
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, age: 1, expansion: 1 };
  });
  const pulseOriginal = Float32Array.from(pulses[0]!.mesh.geometry.attributes.position!.array);
  let beadPhase = 0;
  const ambient = new THREE.AmbientLight("#ffffff", 0.35);
  const key = new THREE.DirectionalLight("#ffffff", 3);
  key.position.set(-2, 3, 3);
  const rim = new THREE.PointLight("#ffffff", 16, 10);
  rim.position.set(2, 1, -1);
  scene.add(ambient, key, rim);
  const cool = new THREE.Color();
  const warm = new THREE.Color();

  function deform(target: THREE.BufferGeometry, base: Float32Array, phase: number, bass: number, mid: number, treble: number) {
    const positions = target.attributes.position!;
    for (let i = 0; i < positions.count; i++) {
      const x = base[i * 3]!;
      const y = base[i * 3 + 1]!;
      const z = base[i * 3 + 2]!;
      // Cartesian waves stay continuous across the sphere's seam and poles.
      // Broad bass lobes, flowing mid folds, and finer treble ripples read separately.
      const swell = Math.sin(x * 3.2 + phase * 2.4) * Math.cos(y * 2.8 - phase * 1.7)
        * Math.cos(z * 2.6 + phase * 1.3);
      const fold = Math.sin(x * 5 + y * 3 - phase * 3.1) * Math.cos(z * 4 - y * 2 + phase * 1.9);
      const ripple = Math.sin(x * 9 - z * 5 + phase * 4.2) * Math.cos(y * 8 + z * 3 - phase * 3.3);
      const radius = 1 + bass * 0.18 + swell * bass * 0.32 + fold * mid * 0.22 + ripple * treble * 0.075;
      positions.setXYZ(i, x * radius, y * radius, z * radius);
    }
    positions.needsUpdate = true;
  }

  return {
    scene, camera,
    setColors(colors: ThemeColors) {
      scene.background = new THREE.Color(colors.background).convertLinearToSRGB();
      cool.set(colors.accent);
      warm.set(colors.highlight);
      ring.material.color.set(colors.glow);
      pulses.forEach(({ mesh }) => mesh.material.color.set(colors.highlight));
      beads.forEach((bead) => bead.material.color.set(colors.glowSoft));
      key.color.set(colors.white);
      rim.color.set(colors.secondary);
    },
    update(spectrum: readonly number[], seconds: number, columns = 64, rows = 24) {
      const music = motion.update(spectrum, seconds);
      deform(geometry, original, music.phase, music.bass, music.mid, music.treble);
      deformWaveformRing(ringGeometry, ringOriginal, music);
      geometry.computeVertexNormals();
      material.color.copy(cool).lerp(warm, music.mid * 0.35 + music.beat * 0.2);
      material.emissive.copy(cool);
      material.emissiveIntensity = 0.025 + music.treble * 0.12 + music.beat * 0.08;
      material.roughness = 0.36 - music.mid * 0.13;
      visual.rotation.set(Math.sin(music.phase * 0.6) * 0.24, music.phase * 0.38, -0.12);
      visual.scale.set(1 + music.beat * 0.16, 1 - music.beat * 0.1, 1 + music.beat * 0.16);
      orbit.rotation.set(
        1.02 + Math.sin(music.phase * 0.55) * 0.16 + music.mid * 0.12,
        0.28 + Math.sin(music.phase * 0.4) * 0.24,
        -0.35 + Math.sin(music.phase * 0.35) * 0.3,
      );
      ring.material.opacity = 0.5 + music.peak * 0.25 + music.beat * 0.2;
      orbit.visible = columns >= 54 && rows >= 14;
      beadPhase += music.seconds * music.peak * (0.8 + music.treble * 1.8 + music.beat);
      beads.forEach((bead, i) => {
        const angle = beadPhase + i * Math.PI * 2 / 3;
        const displacement = ringDisplacement(angle, music);
        bead.position.set(Math.cos(angle) * displacement.radius, Math.sin(angle) * displacement.radius, displacement.depth);
        bead.scale.setScalar(0.65 + music.treble * 1.2);
      });
      pulses.forEach((pulse) => { pulse.age = Math.min(1, pulse.age + music.seconds * 0.75); });
      if (music.onset) {
        const pulse = pulses.find((pulse) => pulse.age === 1);
        if (pulse) {
          pulse.age = 0;
          pulse.mesh.rotation.copy(orbit.rotation);
          // Freeze this beat's contour in its own geometry; only its scale changes during the fade.
          deformWaveformRing(pulse.mesh.geometry, pulseOriginal, music);
          pulse.mesh.geometry.computeBoundingSphere();
          const positions = pulse.mesh.geometry.attributes.position!;
          let radius = 0;
          for (let i = 0; i < positions.count; i++) {
            radius = Math.max(radius, Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i)));
          }
          // Double the outward travel, not the starting size of the captured waveform.
          pulse.expansion = 1 + (2 / radius - 1) * 2;
        }
      }
      pulses.forEach(({ mesh, age, expansion }) => {
        const fade = Math.pow(1 - age, 2);
        mesh.scale.setScalar(1 + (1 - fade) * (expansion - 1));
        mesh.material.opacity = fade * 0.65;
        mesh.visible = orbit.visible && age < 1;
      });
      // Fixed bounds leave room for strong hits without beat-driven camera zoom.
      fitCamera(camera, 2.05, 1.4, 1.15, direction);
      return music;
    },
    dispose() { disposeScene(scene); },
  };
}
