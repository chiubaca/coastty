import { TextAttributes } from "@opentui/core";
import { extend, useKeyboard } from "@opentui/react";
import { THREE, ThreeRenderable } from "@opentui/three";
import { writeFile } from "node:fs/promises";
import { LineBasicNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";
import { positionLocal, time, uniform, vec3 } from "three/tsl";
import { useEffect, useState } from "react";
import type { AppComponentProps } from "../types";
import { windowFocusedAtom } from "../../desktop/window-manager";
import { useAtomValue } from "@effect-atom/atom-react/Hooks";
import { LofiText } from "../../ui/lofi-text";
import { useTheme } from "../../ui/theme";

declare module "@opentui/react" {
  interface OpenTUIComponents {
    three: typeof ThreeRenderable;
  }
}

extend({ three: ThreeRenderable });

const SHAPES = ["CUBE", "TORUS", "KNOT", "ICO"] as const;
type Shape = (typeof SHAPES)[number];
const RENDER_TYPES = ["MESH", "LINE", "SEGMENTS", "LOOP", "POINTS", "SPRITE", "INSTANCED"] as const;
type RenderType = (typeof RENDER_TYPES)[number];
const OUTLINE_WIDTHS = [
  { label: "THIN", value: 0.5 },
  { label: "NORMAL", value: 1 },
  { label: "BOLD", value: 2 },
] as const;
type OutlineWidth = (typeof OUTLINE_WIDTHS)[number]["label"];
const PALETTES = [
  { label: "CYAN", value: "#56e0e0" },
  { label: "PINK", value: "#ff4fa3" },
  { label: "VIOLET", value: "#a78bfa" },
  { label: "GOLD", value: "#ffd166" },
] as const;
type Palette = (typeof PALETTES)[number]["label"];
const SETTINGS_EXPORT_PATH = "three-demo-settings.json";
const INSPECTOR_FIELDS = ["DETAIL", "FOV", "DISTANCE", "SCALE", "ROTATION", "WAVE", "METALNESS", "ROUGHNESS", "EMISSIVE", "AMBIENT", "KEY", "RIM", "OPACITY"] as const;
type InspectorField = (typeof INSPECTOR_FIELDS)[number];
type SceneControls = {
  readonly detail: number;
  readonly fov: number;
  readonly distance: number;
  readonly scale: number;
  readonly rotation: number;
  readonly wave: number;
  readonly metalness: number;
  readonly roughness: number;
  readonly emissive: number;
  readonly ambient: number;
  readonly key: number;
  readonly rim: number;
  readonly opacity: number;
};

type SceneSettingsExport = {
  readonly shape: Shape;
  readonly renderType: RenderType;
  readonly outlineWidth: OutlineWidth;
  readonly palette: Palette;
  readonly controls: SceneControls;
  readonly paused: boolean;
};

const DEFAULT_SETTINGS: SceneSettingsExport = {
  shape: "TORUS",
  renderType: "MESH",
  outlineWidth: "THIN",
  palette: "VIOLET",
  controls: {
    detail: 5,
    fov: 28,
    distance: 3.75,
    scale: 0.7,
    rotation: 0.30000000000000004,
    wave: 0,
    metalness: 0,
    roughness: 0.20000000000000015,
    emissive: 0,
    ambient: 3.600000000000001,
    key: 7.3999999999999995,
    rim: 3,
    opacity: 1,
  },
  paused: false,
};

function settingsForExport({ shape, renderType, outlineWidth, palette, controls, paused }: SceneSettingsExport) {
  return { shape, renderType, outlineWidth, palette, controls, paused };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

type SceneModel = {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly visual: THREE.Group;
  readonly mesh: THREE.Mesh;
  readonly edges: THREE.LineSegments;
  readonly line: THREE.Line;
  readonly loop: THREE.LineLoop;
  readonly points: THREE.Points;
  readonly sprite: THREE.Sprite;
  readonly instances: THREE.InstancedMesh;
  readonly material: InstanceType<typeof MeshStandardNodeMaterial>;
  readonly edgeMaterial: InstanceType<typeof LineBasicNodeMaterial>;
  readonly pointsMaterial: THREE.PointsMaterial;
  readonly spriteMaterial: THREE.SpriteMaterial;
  readonly waveStrength: { value: number };
  readonly ambientLight: THREE.AmbientLight;
  readonly keyLight: THREE.DirectionalLight;
  readonly rimLight: THREE.PointLight;
};

function geometryFor(shape: Shape, detail = 2) {
  switch (shape) {
    case "TORUS": return new THREE.TorusGeometry(0.9, 0.28, 8 + detail * 5, 16 + detail * 16);
    case "KNOT": return new THREE.TorusKnotGeometry(0.64, 0.22, 32 + detail * 32, 6 + detail * 5);
    case "ICO": return new THREE.IcosahedronGeometry(1.15, detail);
    default: return new THREE.BoxGeometry(1.35, 1.35, 1.35, 4 + detail * 6, 4 + detail * 6, 4 + detail * 6);
  }
}

function createScene(): SceneModel {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
  camera.position.set(0, 0.35, 4);
  camera.lookAt(0, 0, 0);

  const material = new MeshStandardNodeMaterial({
    color: new THREE.Color("#56e0e0"),
    emissive: new THREE.Color("#56e0e0"),
    emissiveIntensity: 1.4,
    metalness: 0.65,
    roughness: 0.2,
    wireframe: true,
  });
  const waveStrength = uniform(1);
  const wave = positionLocal.y.mul(4).add(time.mul(2.4)).sin().mul(0.16)
    .add(positionLocal.x.mul(3).add(time.mul(1.8)).cos().mul(0.1))
    .mul(waveStrength);
  material.positionNode = positionLocal.add(vec3(wave.mul(0.25), wave.mul(0.35), wave));
  const mesh = new THREE.Mesh(geometryFor("CUBE"), material);
  const edgeMaterial = new LineBasicNodeMaterial({ color: new THREE.Color("#56e0e0") });
  edgeMaterial.positionNode = material.positionNode;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMaterial);
  edges.visible = false;
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, index) => {
      const progress = index / 63;
      const angle = progress * Math.PI * 8;
      return new THREE.Vector3(Math.cos(angle) * (1 - progress * 0.75), (progress - 0.5) * 2.4, Math.sin(angle) * (1 - progress * 0.75));
    })),
    edgeMaterial,
  );
  line.visible = false;
  const loop = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1, -1, 0),
      new THREE.Vector3(1, -1, 0),
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(-1, 1, 0),
    ]),
    edgeMaterial,
  );
  loop.visible = false;
  const pointsMaterial = new THREE.PointsMaterial({ color: new THREE.Color("#56e0e0"), size: 0.06, sizeAttenuation: true });
  const points = new THREE.Points(geometryFor("CUBE"), pointsMaterial);
  points.visible = false;
  const spriteMaterial = new THREE.SpriteMaterial({ color: new THREE.Color("#56e0e0") });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(1.6, 1.6, 1);
  sprite.visible = false;
  const instances = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), material, 27);
  const instanceMatrix = new THREE.Matrix4();
  for (let index = 0; index < instances.count; index += 1) {
    const x = (index % 3) - 1;
    const y = (Math.floor(index / 3) % 3) - 1;
    const z = Math.floor(index / 9) - 1;
    instanceMatrix.makeTranslation(x * 0.6, y * 0.6, z * 0.6);
    instances.setMatrixAt(index, instanceMatrix);
  }
  instances.instanceMatrix.needsUpdate = true;
  instances.visible = false;
  const visual = new THREE.Group();
  visual.add(mesh, edges, line, loop, points, sprite, instances);
  scene.add(visual);

  const ambientLight = new THREE.AmbientLight(new THREE.Color("#7868c7"), 1.8);
  scene.add(ambientLight);
  const keyLight = new THREE.DirectionalLight(new THREE.Color("#ffd166"), 2.4);
  keyLight.position.set(2.5, 3, 3);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(new THREE.Color("#ff70b7"), 18, 10);
  rimLight.position.set(-2.5, -1, 2);
  scene.add(rimLight);

  const grid = new THREE.GridHelper(8, 12, new THREE.Color("#7868c7"), new THREE.Color("#21183f"));
  grid.position.y = -1.35;
  scene.add(grid);
  return { scene, camera, visual, mesh, edges, line, loop, points, sprite, instances, material, edgeMaterial, pointsMaterial, spriteMaterial, waveStrength, ambientLight, keyLight, rimLight };
}

export function ThreeDemo({ appId }: AppComponentProps) {
  const { theme: { colors } } = useTheme();
  const focused = useAtomValue(windowFocusedAtom(appId));
  const [model] = useState(createScene);
  const [shape, setShape] = useState<Shape>(DEFAULT_SETTINGS.shape);
  const [renderType, setRenderType] = useState<RenderType>(DEFAULT_SETTINGS.renderType);
  const [outlineWidth, setOutlineWidth] = useState<OutlineWidth>(DEFAULT_SETTINGS.outlineWidth);
  const [palette, setPalette] = useState<Palette>(DEFAULT_SETTINGS.palette);
  const [inspectorField, setInspectorField] = useState(0);
  const [controls, setControls] = useState<SceneControls>(DEFAULT_SETTINGS.controls);
  const [paused, setPaused] = useState(DEFAULT_SETTINGS.paused);
  const [exportStatus, setExportStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    model.scene.background = new THREE.Color(colors.background);
  }, [colors, model]);

  useEffect(() => {
    const color = PALETTES.find((option) => option.label === palette)?.value ?? "#56e0e0";
    model.material.color.set(color);
    model.material.emissive.set(color);
    model.edgeMaterial.color.set(color);
    model.pointsMaterial.color.set(color);
    model.spriteMaterial.color.set(color);
  }, [model, palette]);

  useEffect(() => {
    const geometry = geometryFor(shape, controls.detail);
    const previousMeshGeometry = model.mesh.geometry;
    const previousEdgeGeometry = model.edges.geometry;
    const previousPointsGeometry = model.points.geometry;
    model.mesh.geometry = geometry;
    model.edges.geometry = new THREE.EdgesGeometry(geometry);
    model.points.geometry = geometryFor(shape, controls.detail);
    previousMeshGeometry.dispose();
    previousEdgeGeometry.dispose();
    previousPointsGeometry.dispose();
  }, [controls.detail, model, shape]);

  useEffect(() => {
    const width = OUTLINE_WIDTHS.find((option) => option.label === outlineWidth)?.value ?? 1;
    model.material.wireframeLinewidth = width;
    model.edgeMaterial.linewidth = width;
    model.pointsMaterial.size = 0.06 * width;
  }, [model, outlineWidth]);

  useEffect(() => {
    model.camera.fov = controls.fov;
    model.camera.position.z = controls.distance;
    model.camera.updateProjectionMatrix();
    model.visual.scale.setScalar(controls.scale);
    model.waveStrength.value = controls.wave;
    model.material.metalness = controls.metalness;
    model.material.roughness = controls.roughness;
    model.material.emissiveIntensity = controls.emissive;
    model.material.opacity = controls.opacity;
    model.material.transparent = controls.opacity < 1;
    model.edgeMaterial.opacity = controls.opacity;
    model.edgeMaterial.transparent = controls.opacity < 1;
    model.pointsMaterial.opacity = controls.opacity;
    model.pointsMaterial.transparent = controls.opacity < 1;
    model.spriteMaterial.opacity = controls.opacity;
    model.spriteMaterial.transparent = controls.opacity < 1;
    model.ambientLight.intensity = controls.ambient;
    model.keyLight.intensity = controls.key;
    model.rimLight.intensity = controls.rim;
  }, [controls, model]);

  useEffect(() => {
    const animation = setInterval(() => {
      if (paused) return;
      model.visual.rotation.x += 0.012 * controls.rotation;
      model.visual.rotation.y += 0.019 * controls.rotation;
    }, 16);
    return () => clearInterval(animation);
  }, [controls.rotation, model, paused]);

  function selectShape(nextShape: Shape) {
    if (shape === nextShape) return;
    setShape(nextShape);
  }

  function selectRenderType(nextType: RenderType) {
    if (renderType === nextType) return;
    model.mesh.visible = nextType === "MESH";
    model.line.visible = nextType === "LINE";
    model.edges.visible = nextType === "SEGMENTS";
    model.loop.visible = nextType === "LOOP";
    model.points.visible = nextType === "POINTS";
    model.sprite.visible = nextType === "SPRITE";
    model.instances.visible = nextType === "INSTANCED";
    setRenderType(nextType);
  }

  function selectOutlineWidth(nextWidth: OutlineWidth) {
    if (outlineWidth === nextWidth) return;
    setOutlineWidth(nextWidth);
  }

  function moveInspector(direction: number) {
    setInspectorField((current) => (current + direction + INSPECTOR_FIELDS.length) % INSPECTOR_FIELDS.length);
  }

  function adjustInspector(direction: number) {
    const field = INSPECTOR_FIELDS[inspectorField] ?? "DETAIL";
    setControls((current) => {
      switch (field) {
        case "DETAIL": return { ...current, detail: clamp(current.detail + direction, 1, 5) };
        case "FOV": return { ...current, fov: clamp(current.fov + direction * 2, 20, 90) };
        case "DISTANCE": return { ...current, distance: clamp(current.distance + direction * 0.25, 2, 8) };
        case "SCALE": return { ...current, scale: clamp(current.scale + direction * 0.1, 0.5, 2) };
        case "ROTATION": return { ...current, rotation: clamp(current.rotation + direction * 0.1, 0, 3) };
        case "WAVE": return { ...current, wave: clamp(current.wave + direction * 0.1, 0, 3) };
        case "METALNESS": return { ...current, metalness: clamp(current.metalness + direction * 0.1, 0, 1) };
        case "ROUGHNESS": return { ...current, roughness: clamp(current.roughness + direction * 0.1, 0, 1) };
        case "EMISSIVE": return { ...current, emissive: clamp(current.emissive + direction * 0.2, 0, 4) };
        case "AMBIENT": return { ...current, ambient: clamp(current.ambient + direction * 0.2, 0, 4) };
        case "KEY": return { ...current, key: clamp(current.key + direction * 0.2, 0, 8) };
        case "RIM": return { ...current, rim: clamp(current.rim + direction, 0, 30) };
        case "OPACITY": return { ...current, opacity: clamp(current.opacity + direction * 0.1, 0.1, 1) };
      }
    });
  }

  async function exportSettings() {
    const settings = settingsForExport({ shape, renderType, outlineWidth, palette, controls, paused });
    try {
      await writeFile(SETTINGS_EXPORT_PATH, `${JSON.stringify(settings, null, 2)}\n`);
      setExportStatus("success");
    } catch {
      setExportStatus("error");
    }
  }

  function inspectorValue(field: InspectorField) {
    switch (field) {
      case "DETAIL": return String(controls.detail);
      case "FOV": return `${controls.fov} DEG`;
      case "DISTANCE": return controls.distance.toFixed(2);
      case "SCALE": return controls.scale.toFixed(1);
      case "ROTATION": return controls.rotation.toFixed(1);
      case "WAVE": return controls.wave.toFixed(1);
      case "METALNESS": return controls.metalness.toFixed(1);
      case "ROUGHNESS": return controls.roughness.toFixed(1);
      case "EMISSIVE": return controls.emissive.toFixed(1);
      case "AMBIENT": return controls.ambient.toFixed(1);
      case "KEY": return controls.key.toFixed(1);
      case "RIM": return controls.rim.toFixed(0);
      case "OPACITY": return controls.opacity.toFixed(1);
    }
  }

  useKeyboard((key) => {
    if (!focused) return;
    if (key.name === "space") setPaused((value) => !value);
    if (key.sequence === "1") selectShape("CUBE");
    if (key.sequence === "2") selectShape("TORUS");
    if (key.sequence === "3") selectShape("KNOT");
    if (key.sequence === "4") selectShape("ICO");
    if (key.sequence?.toLowerCase() === "m") selectRenderType("MESH");
    if (key.sequence?.toLowerCase() === "l") selectRenderType("LINE");
    if (key.sequence?.toLowerCase() === "g") selectRenderType("SEGMENTS");
    if (key.sequence?.toLowerCase() === "o") selectRenderType("LOOP");
    if (key.sequence?.toLowerCase() === "p") selectRenderType("POINTS");
    if (key.sequence?.toLowerCase() === "s") selectRenderType("SPRITE");
    if (key.sequence?.toLowerCase() === "i") selectRenderType("INSTANCED");
    if (key.sequence?.toLowerCase() === "q") selectOutlineWidth("THIN");
    if (key.sequence?.toLowerCase() === "a") selectOutlineWidth("NORMAL");
    if (key.sequence?.toLowerCase() === "z") selectOutlineWidth("BOLD");
    if (key.sequence?.toLowerCase() === "c") setPalette("CYAN");
    if (key.sequence?.toLowerCase() === "k") setPalette("PINK");
    if (key.sequence?.toLowerCase() === "v") setPalette("VIOLET");
    if (key.sequence?.toLowerCase() === "y") setPalette("GOLD");
    if (key.sequence?.toLowerCase() === "e") void exportSettings();
    if (key.name === "up" || key.sequence === "[") moveInspector(-1);
    if (key.name === "down" || key.sequence === "]") moveInspector(1);
    if (key.name === "left" || key.sequence === "-") adjustInspector(-1);
    if (key.name === "right" || key.sequence === "+" || key.sequence === "=") adjustInspector(1);
  });

  const activeInspectorField = INSPECTOR_FIELDS[inspectorField] ?? "DETAIL";

  return (
    <box flexGrow={1} minWidth={1} flexDirection="column" backgroundColor={colors.background}>
      <box height={1} paddingX={1} justifyContent="space-between" backgroundColor={colors.shadow}>
        <LofiText fg={paused ? colors.highlight : colors.accent}>{paused ? "PAUSED" : "LIVE"}</LofiText>
      </box>
      <three
        flexGrow={1}
        minHeight={4}
        scene={model.scene}
        camera={model.camera}
      />
      <box height={1} flexDirection="row" backgroundColor={colors.border}>
        {SHAPES.map((option, index) => (
          <box
            key={option}
            flexGrow={1}
            justifyContent="center"
            backgroundColor={shape === option ? colors.accent : colors.border}
            onMouseDown={() => selectShape(option)}
          >
            <LofiText fg={shape === option ? colors.background : colors.primary} attributes={shape === option ? TextAttributes.BOLD : undefined}>
              [{index + 1}] {option}
            </LofiText>
          </box>
        ))}
      </box>
      <box height={1} flexDirection="row" backgroundColor={colors.shadow}>
        {RENDER_TYPES.slice(0, 4).map((option) => (
          <box
            key={option}
            flexGrow={1}
            justifyContent="center"
            backgroundColor={renderType === option ? colors.highlight : colors.shadow}
            onMouseDown={() => selectRenderType(option)}
          >
            <LofiText fg={renderType === option ? colors.background : colors.primary} attributes={renderType === option ? TextAttributes.BOLD : undefined}>
              [{option === "SEGMENTS" ? "G" : option[0]}] {option}
            </LofiText>
          </box>
        ))}
      </box>
      <box height={1} flexDirection="row" backgroundColor={colors.shadow}>
        {RENDER_TYPES.slice(4).map((option) => (
          <box
            key={option}
            flexGrow={1}
            justifyContent="center"
            backgroundColor={renderType === option ? colors.highlight : colors.shadow}
            onMouseDown={() => selectRenderType(option)}
          >
            <LofiText fg={renderType === option ? colors.background : colors.primary} attributes={renderType === option ? TextAttributes.BOLD : undefined}>
              [{option[0]}] {option}
            </LofiText>
          </box>
        ))}
      </box>
      <box height={1} flexDirection="row" backgroundColor={colors.border}>
        {OUTLINE_WIDTHS.map((option) => (
          <box
            key={option.label}
            flexGrow={1}
            justifyContent="center"
            backgroundColor={outlineWidth === option.label ? colors.accent : colors.border}
            onMouseDown={() => selectOutlineWidth(option.label)}
          >
            <LofiText fg={outlineWidth === option.label ? colors.background : colors.primary} attributes={outlineWidth === option.label ? TextAttributes.BOLD : undefined}>
              [{option.label === "THIN" ? "Q" : option.label === "NORMAL" ? "A" : "Z"}] {option.label}
            </LofiText>
          </box>
        ))}
      </box>
      <box height={1} flexDirection="row" backgroundColor={colors.shadow}>
        {PALETTES.map((option) => (
          <box
            key={option.label}
            flexGrow={1}
            justifyContent="center"
            backgroundColor={palette === option.label ? option.value : colors.shadow}
            onMouseDown={() => setPalette(option.label)}
          >
            <LofiText fg={palette === option.label ? colors.background : colors.primary} attributes={palette === option.label ? TextAttributes.BOLD : undefined}>
              [{option.label === "CYAN" ? "C" : option.label === "PINK" ? "K" : option.label === "VIOLET" ? "V" : "Y"}] {option.label}
            </LofiText>
          </box>
        ))}
      </box>
      <box height={1} paddingX={1} flexDirection="row" justifyContent="space-between" backgroundColor={colors.background}>
        <box paddingX={1} backgroundColor={colors.accent} onMouseDown={() => void exportSettings()}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>[E] EXPORT SETTINGS</LofiText>
        </box>
        {exportStatus === "success" ? <LofiText fg={colors.glow}>EXPORTED: {SETTINGS_EXPORT_PATH}</LofiText> : null}
        {exportStatus === "error" ? <LofiText fg={colors.highlight}>EXPORT FAILED</LofiText> : null}
      </box>
      <box height={1} flexDirection="row" backgroundColor={colors.background}>
        <box width={4} justifyContent="center" backgroundColor={colors.border} onMouseDown={() => moveInspector(-1)}>
          <LofiText fg={colors.primary}>[UP]</LofiText>
        </box>
        <box width={13} paddingLeft={1} backgroundColor={colors.shadow}>
          <LofiText fg={colors.glow} attributes={TextAttributes.BOLD}>{activeInspectorField}</LofiText>
        </box>
        <box flexGrow={1} paddingLeft={1} backgroundColor={colors.background}>
          <LofiText fg={colors.primary}>{inspectorValue(activeInspectorField)}</LofiText>
        </box>
        <box width={4} justifyContent="center" backgroundColor={colors.border} onMouseDown={() => adjustInspector(-1)}>
          <LofiText fg={colors.primary}>[-]</LofiText>
        </box>
        <box width={4} justifyContent="center" backgroundColor={colors.border} onMouseDown={() => adjustInspector(1)}>
          <LofiText fg={colors.primary}>[+]</LofiText>
        </box>
        <box width={4} justifyContent="center" backgroundColor={colors.border} onMouseDown={() => moveInspector(1)}>
          <LofiText fg={colors.primary}>[DN]</LofiText>
        </box>
      </box>
      <box height={1} paddingX={1} justifyContent="center" backgroundColor={colors.background}>
        <LofiText fg={colors.muted}>UP/DOWN: FIELD // LEFT/RIGHT: VALUE // E: EXPORT // 1-4: SHAPE // M/L/G/O/P/S/I: TYPE</LofiText>
      </box>
    </box>
  );
}
