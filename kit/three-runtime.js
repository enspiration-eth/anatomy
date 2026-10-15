// Browser runtime for three.js figures. Inlined as an ES module by
// scripts/inline-three.mjs; "three" comes from the page's import map.
import * as THREE from "three";

const PALETTE = {
  dark: { bg: 0x161614, lo: 0x2c2c29, mid: 0x4a4a45, hi: 0x8a8a82, faint: 0x3a3a36, lit: 0xffffff, edge: 0x0d0d0c, line: 0x9a9a92 },
  light: { bg: 0xf4f4ef, lo: 0xb9b9b1, mid: 0xd6d6cf, hi: 0xf2f2ec, faint: 0xc8c8c0, lit: 0x111111, edge: 0x3a3a36, line: 0x55554f },
};

const rad = (deg) => (deg * Math.PI) / 180;

function roundedBox([w, d, h], r) {
  if (!r) return new THREE.BoxGeometry(w, d, h).translate(0, 0, h / 2);
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const bevel = Math.min(r * 0.5, h * 0.2, 1.2);
  const geometry = new THREE.ExtrudeGeometry(s, { depth: h - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 6 });
  return geometry.translate(0, 0, bevel);
}

function tickLines(part) {
  const points = [];
  const [minor, major] = part.len ?? [1.2, 2.6];
  if (part.kind === "ticks") {
    for (let i = 0; i < part.count; i++) {
      const a = (i / part.count) * Math.PI * 2;
      const length = i % (part.every ?? 5) === 0 ? major : minor;
      points.push(Math.sin(a) * part.r, Math.cos(a) * part.r, 0, Math.sin(a) * (part.r - length), Math.cos(a) * (part.r - length), 0);
    }
  } else {
    let i = 0;
    for (let x = part.from; x <= part.to + 1e-6; x += part.step, i++) {
      const length = i % (part.every ?? 5) === 0 ? major : minor;
      points.push(x, 0, 0, x, length, 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

function geometryOf(part) {
  const seg = part.segments ?? 48;
  switch (part.kind) {
    case "box": return roundedBox(part.size, part.r ?? 0);
    case "cylinder": return new THREE.CylinderGeometry(part.r2 ?? part.r, part.r, part.h, seg).rotateX(Math.PI / 2).translate(0, 0, part.h / 2);
    case "lathe": return new THREE.LatheGeometry(part.profile.map(([r, z]) => new THREE.Vector2(r, z)), seg).rotateX(Math.PI / 2);
    case "tube": return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(part.points.map((p) => new THREE.Vector3(...p))), part.points.length * 16, part.r, 16, false);
    case "sphere": return new THREE.SphereGeometry(part.r, seg, Math.max(8, seg / 2));
    case "torus": return new THREE.TorusGeometry(part.r, part.tube, 16, seg);
    default: return null;
  }
}

/**
 * Builds the scene into `stage` (an element that becomes the canvas's parent).
 * Returns { scene, camera, renderer, parts, render, toWorld }.
 */
export function mountScene(stage, spec, { theme = "dark" } = {}) {
  const colors = PALETTE[theme] ?? PALETTE.dark;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    stage.insertAdjacentHTML("beforeend", `<p class="iso-nogl">This figure needs WebGL.</p>`);
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.cssText = "display:block;width:100%;height:auto;";
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const parts = new Map();
  const materials = {};
  const material = (tone, lit) => {
    const key = lit ? "lit" : tone;
    if (!materials[key]) {
      materials[key] = lit
        ? new THREE.MeshStandardMaterial({ color: colors.lit, emissive: colors.lit, emissiveIntensity: theme === "dark" ? 0.55 : 0, roughness: 0.35, metalness: 0.1 })
        : new THREE.MeshStandardMaterial({ color: colors[tone], roughness: 0.62, metalness: 0.15 });
    }
    return materials[key];
  };
  const edgeMaterial = new THREE.LineBasicMaterial({ color: colors.edge, transparent: true, opacity: theme === "dark" ? 0.9 : 0.55 });
  const lineMaterial = (part) => new THREE.LineBasicMaterial({ color: part.lit ? colors.lit : part.tone === "hi" ? colors.line : colors[part.tone ?? "lo"] });

  for (const part of spec.parts) {
    let node;
    if (part.kind === "group") node = new THREE.Group();
    else if (part.kind === "ticks" || part.kind === "rail") node = new THREE.LineSegments(tickLines(part), lineMaterial(part));
    else {
      const geometry = geometryOf(part);
      node = new THREE.Mesh(geometry, material(part.tone ?? "mid", part.lit));
      node.castShadow = true;
      node.receiveShadow = true;
      if (part.edges !== false) node.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, part.edgeAngle ?? 28), edgeMaterial));
    }
    node.name = part.id;
    if (part.at) node.position.set(...part.at);
    if (part.rot) node.rotation.set(...part.rot.map(rad));
    parts.set(part.id, node);
  }
  for (const part of spec.parts) (part.parent ? parts.get(part.parent) : scene).add(parts.get(part.id));

  scene.add(new THREE.HemisphereLight(0xffffff, theme === "dark" ? 0x111111 : 0x999990, theme === "dark" ? 1.1 : 1.6));
  const key = new THREE.DirectionalLight(0xffffff, theme === "dark" ? 1.9 : 1.5);
  scene.add(key, key.target);

  const box = new THREE.Box3().setFromObject(scene);
  const centre = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2 || 100;
  key.position.copy(centre).add(new THREE.Vector3(-0.5, -0.9, 1.6).multiplyScalar(radius * 2));
  key.target.position.copy(centre);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: radius * 6 });
  key.shadow.bias = -0.0005;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(radius * 6, radius * 6), new THREE.ShadowMaterial({ opacity: theme === "dark" ? 0.45 : 0.18 }));
  floor.position.set(centre.x, centre.y, box.min.z - 0.01);
  floor.receiveShadow = true;
  scene.add(floor);

  // An orthographic, isometric-style camera at the figure's azimuth and elevation, z up.
  const { azimuth, elevation } = spec.camera;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, radius * 20);
  camera.up.set(0, 0, 1);
  const az = rad(azimuth), el = rad(elevation);
  const view = new THREE.Vector3(-Math.cos(el) * Math.sin(az), -Math.cos(el) * Math.cos(az), Math.sin(el));
  camera.position.copy(centre).add(view.multiplyScalar(radius * 6));
  camera.lookAt(centre);
  camera.updateMatrixWorld();

  // Fit: project the bounding box corners into the camera and frame them with padding.
  const fit = () => {
    const width = stage.clientWidth || spec.width || 600;
    const height = Math.round(width * ((spec.height ?? 380) / (spec.width ?? 600)));
    renderer.setSize(width, height, false);
    const inverse = camera.matrixWorldInverse;
    const local = new THREE.Box3();
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) local.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(inverse));
    const pad = 1 + (spec.pad ?? 0.12);
    const w = (local.max.x - local.min.x) * pad, h = (local.max.y - local.min.y) * pad;
    const aspect = width / height;
    const halfW = Math.max(w, h * aspect) / 2, halfH = halfW / aspect;
    const cx = (local.max.x + local.min.x) / 2, cy = (local.max.y + local.min.y) / 2;
    Object.assign(camera, { left: cx - halfW, right: cx + halfW, top: cy + halfH, bottom: cy - halfH });
    camera.updateProjectionMatrix();
  };
  fit();

  const ground = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const raycaster = new THREE.Raycaster();
  const handle = {
    THREE, scene, camera, renderer, parts,
    render: () => renderer.render(scene, camera),
    /** Pointer event to a world point on the plane z = height. */
    toWorld(event, height = 0) {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      ground.constant = -height;
      return raycaster.ray.intersectPlane(ground, new THREE.Vector3());
    },
  };
  new ResizeObserver(() => { fit(); handle.render(); }).observe(stage);
  stage.dataset.ready = "true";
  handle.render();
  return handle;
}
