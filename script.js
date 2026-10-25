/* =========================================================
   CFM56-7B · 3D Scroll Experience
   - three.js for the engine model + rendering
   - anime.js v4 for scroll-driven choreography
   ========================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import {
  animate,
  createTimeline,
  stagger,
} from './vendor/animejs/anime.esm.js';

/* ---------- DOM shortcuts ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* =========================================================
   HUD readouts
   ========================================================= */
const pctEl       = $('#scroll-pct');
const modeReadout = $('#mode-readout');
const camReadout  = $('#cam-readout');
const rpmReadout  = $('#rpm-readout');

const onScrollTick = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  pctEl.textContent = String(Math.round((window.scrollY / Math.max(1, max)) * 100)).padStart(3, '0');
};
window.addEventListener('scroll', onScrollTick, { passive: true });
onScrollTick();

/* =========================================================
   Hero — split title + entrance timeline
   ========================================================= */
(function splitHeroTitle() {
  const root = $('#hero-title');
  const dim  = root.querySelector('.dim');
  const dimText = dim.textContent;
  const mainText = root.firstChild.textContent;
  root.removeChild(root.firstChild);
  const frag = document.createDocumentFragment();
  for (const ch of mainText) {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch;
    frag.appendChild(span);
  }
  root.insertBefore(frag, dim);
  dim.innerHTML = '';
  for (const ch of dimText) {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch;
    dim.appendChild(span);
  }
})();

createTimeline({ defaults: { ease: 'outExpo' } })
  .add('.eyebrow', { opacity: [0, 1], y: [-12, 0], duration: 700 }, 150)
  .add('#hero-title .char', {
    opacity: [0, 1], y: [80, 0], rotate: [-12, 0],
    duration: 1100, delay: stagger(45),
  }, 250)
  .add('.hero-sub',     { opacity: [0, 1], y: [24, 0], duration: 800 }, '<-=500')
  .add('.hero-meta li', { opacity: [0, 1], y: [20, 0], duration: 700, delay: stagger(90) }, '<-=300')
  .add('.hero-scroll',  { opacity: [0, 1], duration: 700 }, '<-=200');

animate('.hero-scroll svg', { y: [0, 10, 0], duration: 1900, loop: true, ease: 'inOutSine' });

/* =========================================================
   HUD fan rotor (SVG overlay) — continuous spin
   ========================================================= */
const hudFan = animate('#hud-fan-rotor', {
  rotate: '1turn', duration: 4500, loop: true, ease: 'linear',
});
let targetFanSpeed = 0.25;
let currentFanSpeed = 0.25;
(function tickHudFan() {
  currentFanSpeed += (targetFanSpeed - currentFanSpeed) * 0.04;
  hudFan.playbackRate = currentFanSpeed;
  const rpm = Math.round(currentFanSpeed * 5175);
  rpmReadout.textContent = String(rpm).padStart(4, '0');
  requestAnimationFrame(tickHudFan);
})();

/* =========================================================
   THREE.JS SCENE
   ========================================================= */
const canvas = $('#engine-canvas');
const scene  = new THREE.Scene();
// Fondo sólido oscuro: el composer (bloom) necesita un fondo opaco para no
// dejar halos; el degradado CSS original era casi negro, así que no se nota.
scene.background = new THREE.Color(0x07070a);

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* Environment map procedural (sin assets) → reflejos realistas en los metales */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 100);
camera.position.set(3.4, 1.8, 7.0);

/* ---------- OrbitControls (mouse / touch) ---------- */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping  = true;
controls.dampingFactor  = 0.08;
controls.enableZoom     = false;   // wheel keeps scrolling the page
controls.enablePan      = false;
controls.rotateSpeed    = 0.55;
controls.autoRotate      = false;   // se activa al terminar el acercamiento
controls.autoRotateSpeed = 0.6;     // giro lento y cinematográfico
controls.minDistance    = 1.2;
controls.maxDistance    = 45;    // necesario para el encuadre de vuelo (avión grande)
controls.target.set(0, 0, 0);
controls.update();

// Don't disable scroll while interacting
canvas.addEventListener('wheel', e => { /* let it bubble */ }, { passive: true });

/* ---------- Lights ---------- */
scene.add(new THREE.HemisphereLight(0xc0d0e8, 0x0c0c0a, 0.95));

const keyLight = new THREE.DirectionalLight(0xfff0d6, 1.7);
keyLight.position.set(4, 5.5, 4.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 22;
keyLight.shadow.camera.left = -3.2;
keyLight.shadow.camera.right = 3.2;
keyLight.shadow.camera.top = 3.2;
keyLight.shadow.camera.bottom = -3.2;
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x7ab0c8, 0.7);
fillLight.position.set(-4, 2, -3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffb070, 0.5);
rimLight.position.set(-1, -2, -5);
scene.add(rimLight);

// Luz frontal: entra por la admisión e ilumina la cara del fan (hélices visibles de frente)
const fanLight = new THREE.DirectionalLight(0xeaf2ff, 0.95);
fanLight.position.set(-6, 1.5, 2.5);   // delante del motor, apuntando al fan
scene.add(fanLight);

// Sol cálido del atardecer (solo en vuelo): da el reflejo naranja-rojizo al avión
const sunLight = new THREE.DirectionalLight(0xff5a24, 0);
sunLight.position.set(10, 4, -12);
scene.add(sunLight);

// Relleno blanco en vuelo: aclara el avión (lo vuelve blanco, no plateado oscuro)
const flightFill = new THREE.DirectionalLight(0xf2f6ff, 0);
flightFill.position.set(-12, 8, 14);   // desde el lado de la cámara (lado opuesto al sol)
scene.add(flightFill);

const combustorLight = new THREE.PointLight(0xff6a25, 0, 3.5, 2);
combustorLight.position.set(0.25, 0, 0);
scene.add(combustorLight);

/* =========================================================
   MATERIALS — one shared filled, one shared wireframe edges,
   cloned per part so we can highlight individually.
   ========================================================= */
// Estilo DIBUJO TÉCNICO: superficies planas y tenues (rayos-X), sin brillo
// metálico. La forma la definen los contornos (allWireMats), no el relleno.
const baseRenderMat = new THREE.MeshStandardMaterial({
  color: 0x9fb4c4,        // superficie técnica fría (azulada)
  metalness: 0.0,
  roughness: 1.0,
  envMapIntensity: 0.15,
  transparent: true,
  opacity: 0.18,          // relleno tenue
  depthWrite: false,      // deja ver los contornos de detrás (look rayos-X)
  side: THREE.DoubleSide,
});
const baseHotMat = new THREE.MeshStandardMaterial({
  color: 0xc7a08a,        // zona caliente (matiz cálido)
  metalness: 0.0,
  roughness: 1.0,
  envMapIntensity: 0.1,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const baseWireMat = new THREE.LineBasicMaterial({
  color: 0xe8e2d1,
  transparent: true,
  opacity: 0.0,
});

const allFillMats = [];
const allWireMats = [];

function makeDual(geometry, isHot = false) {
  const fillMat = (isHot ? baseHotMat : baseRenderMat).clone();
  const wireMat = baseWireMat.clone();
  allFillMats.push(fillMat);
  allWireMats.push(wireMat);

  const mesh  = new THREE.Mesh(geometry, fillMat);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 18),
    wireMat
  );
  const group = new THREE.Group();
  group.add(mesh);
  group.add(edges);
  group.userData = { fill: mesh, edges, fillMat, wireMat };
  return group;
}

/* =========================================================
   BUILDERS — every part of the CFM56-7B
   Engine axis = X. Front = -X, back = +X. Y = up.
   Scale: 1 unit ≈ 1 meter.
   ========================================================= */

/* Truncated-cone section (cylinder with optionally different radii) */
function buildCone(rTop, rBot, length, segments = 32, isHot = false) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, length, segments, 1, false);
  const group = makeDual(geo, isHot);
  group.rotation.z = -Math.PI / 2;
  return group;
}

/* Ring (annular thin disc — used for stage separators inside compressors/turbines) */
function buildRing(innerR, outerR, segments = 32) {
  const geo = new THREE.RingGeometry(innerR, outerR, segments);
  const group = makeDual(geo);
  group.rotation.y = Math.PI / 2;
  return group;
}

/* Half-shell of nacelle: half a cylinder open along thetaLength */
function buildNacelleHalf(rTop, rBot, length, isTop = true) {
  const geo = new THREE.CylinderGeometry(
    rTop, rBot, length, 32, 1, true,
    isTop ? Math.PI : 0, Math.PI
  );
  const group = makeDual(geo);
  group.rotation.z = -Math.PI / 2;
  return group;
}

/* Perfil de la góndola tipo LEAP (ref. img 38-40), ASIMÉTRICO arriba/abajo:
   - arriba (NAC_TOP) la cubierta se alarga en una COLA por encima del escape;
   - abajo (NAC_BOT) termina antes, dejando la tobera + plug al descubierto.
   Pares [yLocal, radio]; yLocal = xMundo + 0.15. Frente idéntico en ambos. */
// Cuerpo de la góndola SIMÉTRICO (ambas mitades iguales): termina en x≈1.05
// dejando la tobera de escape al descubierto detrás, por igual alrededor.
const NAC_MAIN = [
  [-0.85, 0.800], [-0.80, 0.855], [-0.70, 0.875], [-0.50, 0.885],
  [ 0.00, 0.875], [ 0.30, 0.840], [ 0.70, 0.780], [ 1.00, 0.660],
  [ 1.20, 0.520],   // borde de salida del capó
];
// Perfil de la mitad SUPERIOR: igual que el cuerpo pero ALARGADO por detrás,
// formando la cola que pasa por encima de la tobera (ref. img 39/40).
const NAC_TOP_LONG = [
  [-0.85, 0.800], [-0.80, 0.855], [-0.70, 0.875], [-0.50, 0.885],
  [ 0.00, 0.875], [ 0.30, 0.845], [ 0.70, 0.790], [ 1.00, 0.700],
  [ 1.35, 0.600], [ 1.65, 0.460], [ 1.90, 0.290], [ 2.10, 0.110],   // afterbody lleno y suave (no aguja), ref. 38-40
];
function nacR(worldX) {
  const ly = worldX + 0.15, P = NAC_MAIN;
  if (ly <= P[0][0]) return P[0][1];
  for (let i = 0; i < P.length - 1; i++) {
    if (ly <= P[i + 1][0]) {
      const t = (ly - P[i][0]) / (P[i + 1][0] - P[i][0]);
      return P[i][1] + (P[i + 1][1] - P[i][1]) * t;
    }
  }
  return P[P.length - 1][1];
}
function buildNacelleProfileHalf(isTop) {
  // isTop=true → mitad de ABAJO (corta, deja ver la tobera) ; false → ARRIBA (larga, con cola)
  const profile = isTop ? NAC_MAIN : NAC_TOP_LONG;
  const pts = profile.map(([y, r]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, 56, isTop ? 0 : Math.PI, Math.PI);
  const group = makeDual(geo);
  group.rotation.z = -Math.PI / 2;
  return group;
}

/* Fan blades — 24 radial airfoils */
function buildFanBlades(hubR, tipR, rootChord, tipChord, thickness, count = 36) {
  const group = new THREE.Group();
  const span = tipR - hubR;
  // Pala cónica fina (cuerda mayor en la raíz, menor en la punta)
  const rc = rootChord / 2, tc = tipChord / 2, t = thickness / 2;
  const bladeGeo = new THREE.BufferGeometry();
  bladeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -rc, 0, t,  rc, 0, t,  tc, span, t,  -tc, span, t,     // dorso
    -rc, 0, -t, rc, 0, -t, tc, span, -t, -tc, span, -t,    // intradós
  ]), 3));
  bladeGeo.setIndex([
    0, 1, 2, 0, 2, 3,  4, 6, 5, 4, 7, 6,  0, 3, 7, 0, 7, 4,
    1, 5, 6, 1, 6, 2,  0, 4, 5, 0, 5, 1,  3, 2, 6, 3, 6, 7,
  ]);
  bladeGeo.computeVertexNormals();
  const edgeGeo = new THREE.EdgesGeometry(bladeGeo, 20);

  const fillMat = baseRenderMat.clone();
  const wireMat = baseWireMat.clone();
  allFillMats.push(fillMat);
  allWireMats.push(wireMat);

  for (let i = 0; i < count; i++) {
    const holder = new THREE.Object3D();
    const blade  = new THREE.Mesh(bladeGeo, fillMat);
    blade.position.y = hubR;
    blade.rotation.y = -0.42;          // torsión (sweep del álabe)
    const edges = new THREE.LineSegments(edgeGeo, wireMat);
    edges.position.copy(blade.position);
    edges.rotation.copy(blade.rotation);
    holder.add(blade);
    holder.add(edges);
    holder.rotation.x = (i / count) * Math.PI * 2;
    group.add(holder);
  }
  group.userData = { fillMat, wireMat };
  return group;
}

/* Turbine blades — bigger, fewer, more visible */
function buildTurbineBlades(hubR, tipR, chord, thickness, count = 18, isHot = false) {
  const group = new THREE.Group();
  const span = tipR - hubR;
  group.add(buildStageDisc(hubR, Math.min(0.05, chord * 0.5)));   // disco/hub central
  // Álabe cónico torsionado (raíz ancha → punta algo más fina)
  const rc = chord / 2, tc = (chord * 0.62) / 2, t = thickness / 2;
  const bladeGeo = new THREE.BufferGeometry();
  bladeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -rc, 0, t,  rc, 0, t,  tc, span, t,  -tc, span, t,
    -rc, 0, -t, rc, 0, -t, tc, span, -t, -tc, span, -t,
  ]), 3));
  bladeGeo.setIndex([
    0, 1, 2, 0, 2, 3,  4, 6, 5, 4, 7, 6,  0, 3, 7, 0, 7, 4,
    1, 5, 6, 1, 6, 2,  0, 4, 5, 0, 5, 1,  3, 2, 6, 3, 6, 7,
  ]);
  bladeGeo.computeVertexNormals();
  const edgeGeo = new THREE.EdgesGeometry(bladeGeo, 20);

  const fillMat = (isHot ? baseHotMat : baseRenderMat).clone();
  const wireMat = baseWireMat.clone();
  allFillMats.push(fillMat);
  allWireMats.push(wireMat);

  for (let i = 0; i < count; i++) {
    const holder = new THREE.Object3D();
    const blade  = new THREE.Mesh(bladeGeo, fillMat);
    blade.position.y = hubR;
    blade.rotation.y = -0.35;
    const edges = new THREE.LineSegments(edgeGeo, wireMat);
    edges.position.copy(blade.position);
    edges.rotation.copy(blade.rotation);
    holder.add(blade);
    holder.add(edges);
    holder.rotation.x = (i / count) * Math.PI * 2;
    group.add(holder);
  }
  group.userData = { fillMat, wireMat };
  return group;
}

/* Stage disc — visible as a slightly fluted ring inside the casing */
function buildStageDisc(radius, thickness = 0.015) {
  const geo = new THREE.CylinderGeometry(radius, radius, thickness, 48);
  const group = makeDual(geo);
  group.rotation.z = -Math.PI / 2;
  return group;
}

/* Etapa de compresor REAL: tambor central + anillo de álabes radiales
   (como el rotor del CFM56). hubR = radio del tambor; bladeLen = alto del álabe. */
function buildCompressorStage(hubR, bladeLen, count) {
  const group = new THREE.Group();
  group.add(buildStageDisc(hubR, 0.03));                 // tambor central
  const chord = Math.max(0.026, bladeLen * 0.22);
  const bladeGeo = new THREE.BoxGeometry(chord, bladeLen, 0.012);
  bladeGeo.translate(0, bladeLen / 2, 0);
  const fillMat = baseRenderMat.clone();
  const wireMat = baseWireMat.clone();
  allFillMats.push(fillMat);
  allWireMats.push(wireMat);
  const edgeGeo = new THREE.EdgesGeometry(bladeGeo, 15);
  for (let i = 0; i < count; i++) {
    const holder = new THREE.Object3D();
    const blade = new THREE.Mesh(bladeGeo, fillMat);
    blade.position.y = hubR; blade.rotation.y = -0.16;   // ligera torsión
    const edges = new THREE.LineSegments(edgeGeo, wireMat);
    edges.position.copy(blade.position); edges.rotation.copy(blade.rotation);
    holder.add(blade); holder.add(edges);
    holder.rotation.x = (i / count) * Math.PI * 2;
    group.add(holder);
  }
  return group;
}

/* Estátor: anillo de vanes fijos entre rotores (torsión opuesta, sin tambor). */
function buildStatorRing(hubR, bladeLen, count) {
  const group = new THREE.Group();
  const chord = Math.max(0.022, bladeLen * 0.20);
  const bladeGeo = new THREE.BoxGeometry(chord, bladeLen, 0.010);
  bladeGeo.translate(0, bladeLen / 2, 0);
  const fillMat = baseRenderMat.clone();
  const wireMat = baseWireMat.clone();
  allFillMats.push(fillMat);
  allWireMats.push(wireMat);
  const edgeGeo = new THREE.EdgesGeometry(bladeGeo, 15);
  for (let i = 0; i < count; i++) {
    const holder = new THREE.Object3D();
    const blade = new THREE.Mesh(bladeGeo, fillMat);
    blade.position.y = hubR; blade.rotation.y = 0.18;     // torsión opuesta al rotor
    const edges = new THREE.LineSegments(edgeGeo, wireMat);
    edges.position.copy(blade.position); edges.rotation.copy(blade.rotation);
    holder.add(blade); holder.add(edges);
    holder.rotation.x = (i / count) * Math.PI * 2;
    group.add(holder);
  }
  return group;
}

/* =========================================================
   TORNILLOS DE BRIDA — anillos de tornillos que se "desenroscan"
   y estallan hacia fuera al despiezar (efecto exploded de fasteners).
   ========================================================= */
const boltMat = baseRenderMat.clone();
boltMat.color = new THREE.Color(0x70747a);                  // acero
boltMat.userData.realColor = new THREE.Color(0x9a9ea6);     // acero claro en realista
allFillMats.push(boltMat);
const boltHeadGeo  = new THREE.CylinderGeometry(0.028, 0.028, 0.026, 6);  // cabeza hexagonal
const boltShaftGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.085, 10); // vástago

function makeBoltRing(radius, count) {
  const ring = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const uy = Math.cos(a), uz = Math.sin(a);
    const bolt = new THREE.Group();
    const head  = new THREE.Mesh(boltHeadGeo, boltMat);  head.rotation.z  = Math.PI / 2;
    const shaft = new THREE.Mesh(boltShaftGeo, boltMat); shaft.rotation.z = Math.PI / 2; shaft.position.x = -0.05;
    bolt.add(head, shaft);
    bolt.position.set(0, uy * radius, uz * radius);
    bolt.userData = {
      by: uy * radius, bz: uz * radius, uy, uz,
      radPop: 0.12 + Math.random() * 0.13,                 // estallido radial
      axPop: -(0.05 + Math.random() * 0.11),               // salen hacia delante (-x)
      spin: (4 + Math.random() * 5) * Math.PI * 2,         // vueltas al desenroscarse
    };
    ring.add(bolt);
  }
  return ring;
}
function updateBolts(ring, e) {
  const k = e * e * (3 - 2 * e); // smoothstep
  for (const b of ring.children) {
    const d = b.userData;
    b.position.set(d.axPop * k, d.by + d.uy * d.radPop * k, d.bz + d.uz * d.radPop * k);
    b.rotation.x = d.spin * k;
  }
}

/* =========================================================
   BUILD THE ENGINE
   ========================================================= */
const engine = new THREE.Group();
scene.add(engine);

// Piezas que giran (rotores). `k` = factor de velocidad relativo:
// carrete de BAJA (fan, booster, LPT) ~1 · carrete de ALTA (HPC, HPT) más rápido.
// Los estátores NO se añaden aquí (son fijos).
const spinners = [];

/* ---- 1 · Spinner cone ---- */
const spinnerGeo = new THREE.ConeGeometry(0.075, 0.44, 28, 1, false);
const spinner = makeDual(spinnerGeo);
spinner.rotation.z = Math.PI / 2;     // tip toward -x
spinner.position.set(-1.10, 0, 0);
engine.add(spinner);

/* ---- 2 · Fan hub + blades ---- */
const fanHub = buildCone(0.10, 0.08, 0.18, 24);
fanHub.position.set(-0.84, 0, 0);
engine.add(fanHub);

// 24 álabes anchos (como la ficha y las ref. img 22/24): llenan más la cara del fan
const fanBlades = buildFanBlades(0.10, 0.78, 0.185, 0.105, 0.026, 24);
fanBlades.position.set(-0.84, 0, 0);
engine.add(fanBlades);
spinners.push({ obj: fanBlades, k: 1.0 });   // fan (carrete de baja)

/* Fan containment ring (just inside nacelle hub front) */
// Aro de contención del fan: cilindro ABIERTO (sin tapas) para no tapar las hélices de frente
const fanCasingGeo = new THREE.CylinderGeometry(0.80, 0.80, 0.22, 48, 1, true);
const fanCasing = makeDual(fanCasingGeo);
fanCasing.rotation.z = -Math.PI / 2;
fanCasing.userData.fill.material.opacity = 0.35; // semitransparente
fanCasing.position.set(-0.84, 0, 0);
engine.add(fanCasing);

/* Liner acústico turquesa alrededor de las puntas del fan (ref. img 22/24) */
const fanLinerGeo = new THREE.CylinderGeometry(0.79, 0.79, 0.16, 48, 1, true);
const fanLiner = makeDual(fanLinerGeo);
fanLiner.rotation.z = -Math.PI / 2;
fanLiner.position.set(-0.80, 0, 0);
fanLiner.userData.fillMat.userData.realColor = new THREE.Color(0x2f9f93);  // turquesa-verde
engine.add(fanLiner);

/* ---- 3 · LPC (3 stages) ---- */
const lpc = new THREE.Group();
const lpcCasing = buildCone(0.40, 0.38, 0.28, 40);
lpcCasing.position.set(-0.58, 0, 0);
lpc.add(lpcCasing);
for (let i = 0; i < 3; i++) {
  const stage = buildCompressorStage(0.18, 0.17, 30);
  stage.position.set(-0.66 + i * 0.09, 0, 0);
  lpc.add(stage);
  spinners.push({ obj: stage, k: 1.15 });        // rotor LPC (baja)
  if (i < 2) {                                   // estátor entre rotores
    const stator = buildStatorRing(0.18, 0.17, 28);
    stator.position.set(-0.66 + i * 0.09 + 0.045, 0, 0);
    lpc.add(stator);
  }
}
engine.add(lpc);

/* ---- 4 · HPC (9 stages, narrowing) ---- */
const hpc = new THREE.Group();
const hpcCasing = buildCone(0.36, 0.20, 0.60, 40);
hpcCasing.position.set(-0.10, 0, 0);
hpc.add(hpcCasing);
for (let i = 0; i < 9; i++) {
  const r = 0.32 - i * 0.014;
  const stage = buildCompressorStage(r * 0.48, r * 0.52, 28);
  stage.position.set(-0.36 + i * 0.066, 0, 0);
  hpc.add(stage);
  spinners.push({ obj: stage, k: 1.9 });         // rotor HPC (alta, gira más rápido)
  if (i < 8) {                                   // estátor entre rotores
    const rs = 0.32 - (i + 0.5) * 0.014;
    const stator = buildStatorRing(rs * 0.48, rs * 0.52, 24);
    stator.position.set(-0.36 + i * 0.066 + 0.033, 0, 0);
    hpc.add(stator);
  }
}
engine.add(hpc);

/* ---- 5 · Diffuser + combustor (annular) ---- */
const combustor = new THREE.Group();
const combOuter = buildCone(0.34, 0.34, 0.30, 40, true);
combOuter.position.set(0.30, 0, 0);
combustor.add(combOuter);
// Inner liner (annular)
const combInner = buildCone(0.22, 0.22, 0.30, 40, true);
combInner.userData.fill.material.opacity = 0.45;
combInner.position.set(0.30, 0, 0);
combustor.add(combInner);
// Burner cans / injector ring (8 small cylinders around the periphery)
for (let i = 0; i < 16; i++) {
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.06, 12),
    baseRenderMat.clone()
  );
  allFillMats.push(can.material);
  can.position.x = 0.18;
  can.position.y = 0.30;
  can.rotation.z = Math.PI / 2;
  const holder = new THREE.Object3D();
  holder.add(can);
  holder.rotation.x = (i / 16) * Math.PI * 2;
  combustor.add(holder);
}
/* Núcleo incandescente — su emisión se enciende en el paso de combustión
   y es lo que recoge el bloom para simular la llama. */
const combGlowMat = new THREE.MeshStandardMaterial({
  color: 0x140a05,
  emissive: 0xff5a1e,
  emissiveIntensity: 0,
  roughness: 0.5,
  metalness: 0.1,
  transparent: true,
  opacity: 0.92,
});
const combGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.32, 40), combGlowMat);
combGlow.rotation.z = -Math.PI / 2;
combGlow.position.set(0.30, 0, 0);
combustor.add(combGlow);
engine.add(combustor);

/* ---- 6 · HPT (1 stage) ---- */
const hpt = new THREE.Group();
const hptCasing = buildCone(0.30, 0.28, 0.15, 40, true);
hptCasing.position.set(0.52, 0, 0);
hpt.add(hptCasing);
const hptBlades = buildTurbineBlades(0.20, 0.30, 0.10, 0.020, 34, true);
hptBlades.position.set(0.52, 0, 0);
hpt.add(hptBlades);
spinners.push({ obj: hptBlades, k: 2.1 });    // turbina de alta (carrete de alta)
engine.add(hpt);

/* ---- 7 · Inter-turbine frame ---- */
const itf = buildCone(0.30, 0.30, 0.05, 32);
itf.position.set(0.62, 0, 0);
engine.add(itf);

/* ---- 8 · LPT (4 stages, widening) ---- */
const lpt = new THREE.Group();
const lptCasing = buildCone(0.30, 0.36, 0.40, 40);
lptCasing.position.set(0.85, 0, 0);
lpt.add(lptCasing);
for (let i = 0; i < 4; i++) {
  const r = 0.27 + i * 0.020;
  const blades = buildTurbineBlades(r - 0.07, r, 0.06, 0.018, 22);
  blades.position.set(0.68 + i * 0.10, 0, 0);
  lpt.add(blades);
  spinners.push({ obj: blades, k: 1.15 });       // rotor LPT (baja)
}
engine.add(lpt);

/* ---- 9 · Exhaust + tail cone ---- */
const exhaust = new THREE.Group();
const mixer = buildCone(0.36, 0.30, 0.18, 32);
mixer.position.set(1.14, 0, 0);
exhaust.add(mixer);
const tailGeo = new THREE.ConeGeometry(0.30, 0.40, 24, 1, false);
const tail = makeDual(tailGeo);
tail.rotation.z = -Math.PI / 2;
tail.position.set(1.45, 0, 0);
exhaust.add(tail);
engine.add(exhaust);

/* ---- 10 · Nacelle outer esculpida (perfil LEAP, partida arriba/abajo) ---- */
const nacelleTop = buildNacelleProfileHalf(true);
nacelleTop.position.set(-0.15, 0, 0);
engine.add(nacelleTop);
const nacelleBot = buildNacelleProfileHalf(false);   // mitad SUPERIOR (larga, con cola)
nacelleBot.position.set(-0.15, 0, 0);
engine.add(nacelleBot);

/* ---- 11 · Pylon esbelto y barrido (carenado aerodinámico, ref. img 37/40) ---- */
// Coords absolutas del motor (x = eje, y = altura). Raíz larga por el lomo que
// baja hasta JUNTARSE con la punta de la cola por detrás (ref. img 38/40).
const pylonShape = new THREE.Shape();
pylonShape.moveTo(-0.20, 0.86);                          // raíz frontal sobre el lomo
pylonShape.quadraticCurveTo(0.80, 0.82, 1.82, 0.26);     // raíz baja por el lomo hasta la cola
pylonShape.lineTo(1.30, 1.06);                           // borde de salida recto
pylonShape.lineTo(-0.05, 1.14);                          // TOP RECTO (donde se une al ala)
pylonShape.lineTo(-0.20, 0.86);                          // borde de ataque recto
const pylonGeo = new THREE.ExtrudeGeometry(pylonShape, {
  depth: 0.10, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.03, bevelSegments: 2, steps: 1,
});
pylonGeo.translate(0, 0, -0.05);       // centrar el grosor en z (perfil fino tipo ala)
const pylon = makeDual(pylonGeo);
pylon.position.set(0, 0, 0);
engine.add(pylon);

/* ---- Bridas atornilladas: un anillo de tornillos por módulo del núcleo ----
   Se enganchan a la pieza del ensamblaje para viajar con ella al despiezar. */
[
  { obj: lpc,       x: -0.72, r: 0.42, n: 20 },
  { obj: hpc,       x: -0.40, r: 0.38, n: 22 },
  { obj: combustor, x: -0.02, r: 0.46, n: 24 },
  { obj: hpt,       x:  0.43, r: 0.31, n: 18 },
  { obj: lpt,       x:  0.62, r: 0.31, n: 18 },
].forEach(s => {
  const ring = makeBoltRing(s.r, s.n);
  ring.position.x = s.x;
  engine.add(ring);
  s.obj.userData.bolts = { ring, frontX: s.x };
});

/* Bitono realista: la góndola (cubierta) BLANCA como en img 22/23;
   la capa media (fan case / booster) verde oliva, que se revela al abrir la góndola. */
const OLIVE = new THREE.Color(0x5d6346);
[fanCasing, lpcCasing].forEach(g => {
  if (g.userData && g.userData.fillMat) g.userData.fillMat.userData.realColor = OLIVE;
});
const COWL_WHITE = new THREE.Color(0xe2e4e4);
[nacelleTop, nacelleBot, pylon].forEach(g => {
  if (g.userData && g.userData.fillMat) g.userData.fillMat.userData.realColor = COWL_WHITE;
});
const BRONZE = new THREE.Color(0x9c7448);   // spinner + cono de cola metálicos (ref. img 37/40)
[spinner, tail].forEach(g => {
  if (g.userData && g.userData.fillMat) g.userData.fillMat.userData.realColor = BRONZE;
});

/* ---- Detalle de la cubierta (ref. img 22/23): labio de entrada plateado
   + líneas de panel. Solo lucen con la góndola CERRADA y realista; se
   desvanecen al abrirse para no quedar anillos sueltos. ---- */
const cowlDetail = new THREE.Group();
const cowlDetailMats = [];
const cowlLineMat = new THREE.MeshStandardMaterial({ color: 0x26282c, metalness: 0.4, roughness: 0.55, transparent: true, opacity: 0 }); // oscuro = más marcado
const cowlLipMat  = new THREE.MeshStandardMaterial({ color: 0xc9cdd3, metalness: 0.92, roughness: 0.18, transparent: true, opacity: 0, envMapIntensity: 0.6 });
cowlDetailMats.push(cowlLineMat, cowlLipMat);
// Los anillos siguen el perfil REAL de la góndola (nacR) para acoplarse al bulto/estrechamiento.
const cowlRadius = nacR;
function cowlRing(x, tube, mat, dr = 0.004) {
  const t = new THREE.Mesh(new THREE.TorusGeometry(cowlRadius(x) + dr, tube, 16, 80), mat);
  t.rotation.y = Math.PI / 2;     // anillo perpendicular al eje X
  t.position.x = x;
  cowlDetail.add(t);
}
cowlRing(-0.95, 0.040, cowlLipMat, 0.0);   // labio de entrada plateado (morro) — NO es circunferencia del cuerpo
// (sin anillos de panel circunferenciales: el cuerpo va liso por fuera)
// Línea LONGITUDINAL: unión de las dos valvas del capó (ambos costados, recorre todo el cuerpo)
function cowlSeam(side) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const x = -0.93 + 1.95 * (i / 16);
    pts.push(new THREE.Vector3(x, 0, side * (cowlRadius(x) + 0.004)));  // unión en los costados (corte arriba/abajo)
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  cowlDetail.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.013, 6, false), cowlLineMat));
}
cowlSeam(1); cowlSeam(-1);
// Línea/marca roja lateral del capó (ref. img 38/40)
const redMat = new THREE.MeshStandardMaterial({ color: 0xc02b1d, metalness: 0.2, roughness: 0.55, transparent: true, opacity: 0 });
cowlDetailMats.push(redMat);
const redLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.012), redMat);
redLine.position.set(0.28, 0, nacR(0.28) + 0.006);
cowlDetail.add(redLine);
engine.add(cowlDetail);

/* ---- Tubería / mazos externos (ref. img 25). Aparecen con el acabado
   realista, donde son visibles: núcleo trasero expuesto + conducto al pylon. ---- */
const plumbing = new THREE.Group();
const plumbingMats = [];
const hoseMat    = new THREE.MeshStandardMaterial({ color: 0x16181c, metalness: 0.15, roughness: 0.72, transparent: true, opacity: 0 });
const conduitMat = new THREE.MeshStandardMaterial({ color: 0x90949c, metalness: 0.72, roughness: 0.34, transparent: true, opacity: 0, envMapIntensity: 0.25 });
const connMat    = new THREE.MeshStandardMaterial({ color: 0xd9a521, metalness: 0.55, roughness: 0.4,  transparent: true, opacity: 0 }); // conectores dorados
plumbingMats.push(hoseMat, conduitMat, connMat);
function hose(pts, r, mat) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  plumbing.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 44, r, 8, false), mat));
}
function pbox(x, y, z, w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  plumbing.add(m);
}
// Mazo principal por el bajo del núcleo trasero (visible más allá de la góndola)
hose([[0.30, -0.36, 0.16], [0.60, -0.34, 0.14], [0.95, -0.32, 0.12], [1.30, -0.30, 0.08], [1.60, -0.30, 0.04]], 0.028, hoseMat);
// Línea de combustible/aceite por el lateral del núcleo trasero
hose([[0.35, -0.10, 0.34], [0.70, 0.04, 0.34], [1.05, 0.10, 0.30], [1.40, 0.10, 0.24]], 0.020, conduitMat);
// Segundo mazo, lado opuesto
hose([[0.30, -0.34, -0.14], [0.70, -0.30, -0.16], [1.10, -0.28, -0.12], [1.50, -0.28, -0.06]], 0.024, hoseMat);
// Conducto de sangrado: del núcleo hacia el pylon (sube por encima de la góndola)
hose([[0.20, 0.40, 0.05], [0.05, 0.70, 0.03], [-0.05, 0.95, 0.0]], 0.05, conduitMat);
// Cajas de conexión / brackets
pbox(0.55, -0.34, 0.16, 0.12, 0.10, 0.13, conduitMat);
pbox(1.05, -0.30, 0.10, 0.10, 0.08, 0.10, conduitMat);
pbox(0.70, 0.06, 0.32, 0.08, 0.08, 0.06, connMat);
pbox(1.10, 0.10, 0.27, 0.07, 0.07, 0.05, connMat);
engine.add(plumbing);

/* Todas las mallas del motor proyectan y reciben sombra */
engine.traverse((o) => {
  if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
});

/* ---- 12 · Suelo con sombra de contacto ---- */
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x0d0d12, roughness: 1.0, metalness: 0.0,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.1;
ground.receiveShadow = true;
scene.add(ground);

/* =========================================================
   ASSEMBLY OFFSETS — initial positions for the "exploded" look
   ========================================================= */
// `off` = desplazamiento al 100% de despiece. Es un DESPIECE AXIAL:
// las piezas internas se separan a lo largo del eje X (en fila, legibles)
// y las dos mitades de la góndola se abren en vertical.
const ASSEMBLY = [
  { obj: spinner,    home: [-1.10, 0, 0],    off: [-1.00, 0,    0] },
  { obj: fanHub,     home: [-0.84, 0, 0],    off: [-0.76, 0,    0] },
  { obj: fanBlades,  home: [-0.84, 0, 0],    off: [-0.31, 0,    0] },
  { obj: fanLiner,   home: [-0.80, 0, 0],    off: [-0.31, 0,    0] },
  { obj: fanCasing,  home: [-0.84, 0, 0],    off: [-0.31, 1.05, 0] },
  { obj: lpc,        home: [0, 0, 0],        off: [-0.10, 0,    0] },
  { obj: hpc,        home: [0, 0, 0],        off: [ 0.10, 0,    0] },
  { obj: combustor,  home: [0, 0, 0],        off: [ 0.90, 0,    0] },
  { obj: hpt,        home: [0, 0, 0],        off: [ 1.55, 0,    0] },
  { obj: itf,        home: [0.62, 0, 0],     off: [ 1.33, 0,    0] },
  { obj: lpt,        home: [0, 0, 0],        off: [ 2.30, 0,    0] },
  { obj: exhaust,    home: [0, 0, 0],        off: [ 3.05, 0,    0] },
  // so = inicio del despiece (override): la góndola y el pylon abren PRIMERO
  { obj: nacelleTop,  home: [-0.15, 0, 0],   off: [ 0, -1.55, 0], so: 0.0 },   // abajo (corta) → baja
  { obj: nacelleBot,  home: [-0.15, 0, 0],   off: [ 0,  1.55, 0], so: 0.0 },   // arriba (larga, cola) → sube
  { obj: pylon,      home: [ 0, 0, 0],       off: [ 0,    1.70, 0], so: 0.05 },
];

// Estado inicial: motor COMPACTO (cada pieza en su 'home')
ASSEMBLY.forEach(p => p.obj.position.set(p.home[0], p.home[1], p.home[2]));

// Motor oculto hasta que se revela tras el hero; sin wireframe (acabado sólido).
allFillMats.forEach(m => { m.opacity = 0; m.userData.techColor = m.color.clone(); });
allWireMats.forEach(m => { m.opacity = 0; });
ground.visible = false;
combGlow.visible = false;

/* =========================================================
   ETIQUETAS DE PIEZAS — callouts HUD anclados al motor
   Aparecen en el despiece técnico y se desvanecen al recompactar.
   `y` = altura del ancla (radio aprox. de la pieza); `tier` escalona
   la altura del cartel para que no se solapen entre piezas vecinas.
   ========================================================= */
const labelLayer = document.createElement('div');
labelLayer.id = 'part-labels';
document.body.appendChild(labelLayer);

// up = cartel arriba/abajo · stem = longitud de la guía (alterna para no solaparse)
const PARTS = [
  { obj: spinner,   up: true,  stem: 50,  name: '进气锥',     desc: '分配进气并防止机头部位结冰。' },
  { obj: fanBlades, up: false, stem: 64,  name: '风扇',       desc: '24 片叶片。吸入空气并产生约 80% 的推力（外涵道气流）。' },
  { obj: lpc,       up: true,  stem: 130, name: '低压压气机', desc: '3 级增压级。对进入核心机的空气进行预压缩。' },
  { obj: hpc,       up: false, stem: 132, name: '高压压气机', desc: '9 级。将空气压力提升至约 33 个大气压。' },
  { obj: combustor, up: true,  stem: 50,  name: '燃烧室',     desc: '在约 1500 °C 下混合并燃烧煤油。' },
  { obj: hpt,       up: false, stem: 64,  name: '高压涡轮',   desc: '1 级。通过高压轴驱动高压压气机。' },
  { obj: lpt,       up: true,  stem: 132, name: '低压涡轮',   desc: '4 级。通过低压轴驱动风扇与增压级。' },
  { obj: exhaust,   up: false, stem: 130, name: '尾喷管',     desc: '混合并排出燃气：核心机产生的推力。' },
];
const _lblPos = new THREE.Vector3();
PARTS.forEach(p => {
  const el = document.createElement('div');
  el.className = 'part-label ' + (p.up ? 'up' : 'down');
  el.style.setProperty('--stem', p.stem + 'px');
  el.innerHTML = '<span class="pl-stem"></span><span class="pl-dot"></span>' +
                 '<div class="pl-box"><b>' + p.name + '</b><span>' + p.desc + '</span></div>';
  p.el = el;
  labelLayer.appendChild(el);
});

// Offsets locales del centro/borde REAL de cada pieza (su pivote suele estar
// descentrado respecto a la geometría). Como los grupos no rotan en el despiece,
// estos offsets son constantes → la guía cae siempre sobre la pieza.
engine.updateWorldMatrix(true, true);
{
  const _b = new THREE.Box3(), _wp = new THREE.Vector3();
  PARTS.forEach(p => {
    _b.setFromObject(p.obj);
    p.obj.getWorldPosition(_wp);
    p.cx = (_b.min.x + _b.max.x) / 2 - _wp.x;   // centro horizontal de la pieza
    p.topY = _b.max.y - _wp.y;                  // borde superior
    p.botY = _b.min.y - _wp.y;                  // borde inferior
  });
}

/* =========================================================
   FASE 2 · AVIÓN + VUELO
   El motor pasa a un flightGroup; al avanzar el scroll encoge y cuelga del
   ala de un avión que aparece y "vuela" (cielo + nubes + balanceo).
   ========================================================= */
// Fases de escena (declaradas antes de tick(), que se llama de forma síncrona)
let revealAmt = 0;          // 0 = motor oculto (hero) · 1 = motor visible
let explodeAmt = 0;         // 0 = compacto · 1 = despiezado
let realismAmt = 0;         // 0 = técnico · 1 = realista
let planeAmount = 0;
let dollyDone = false;
let autoRotateReady = false;
let planeFramed = false;
let aircraftOpaque = false;
let realPlaneReady = false;   // modelo 737 real (.obj) cargado
let realPlane = null;
let realOpaque = false;
const realMats = [];
let hdrReady = false;         // cielo HDRI
let hdrTex = null;
const bgCol = new THREE.Color();
const _camDesired  = new THREE.Vector3(-6, 5, 26);   // encuadre de vuelo
const _camTargetPt = new THREE.Vector3(0, 0, 0);
const SPACE_BG = new THREE.Color(0x07070a);
const SKY_BG   = new THREE.Color(0x8fc1e6);
const ENG_WING = { x: -0.6, y: -1.5, z: 5.2 };       // bajo el borde de ataque del ala

const flightGroup = new THREE.Group();
scene.remove(engine);
flightGroup.add(engine);
scene.add(flightGroup);

const aircraftMats = [];
const solidMats = [];   // materiales estructurales (se vuelven opacos al revelarse)
function planeMat(color, metalness, roughness, base = 1) {
  const m = new THREE.MeshStandardMaterial({
    color, metalness, roughness, envMapIntensity: 0.18,
    transparent: true, opacity: 0, side: THREE.DoubleSide,
  });
  m.userData.baseOp = base;
  aircraftMats.push(m);
  solidMats.push(m);
  return m;
}
const bodyMat    = planeMat(0xeef1f4, 0.15, 0.62);
const wingMat    = planeMat(0xdfe3e8, 0.18, 0.65);
const accentMat  = planeMat(0x2b6cb0, 0.20, 0.60);
const nacelleMat = planeMat(0xc9ced6, 0.30, 0.55);

// Mapas procedurales del fuselaje: COLOR (panel lines, remaches, weathering,
// hollín, puertas, cheatline) + BUMP (relieve real → las líneas dan sombra).
// UV del cilindro: u = circunferencia, v = longitud. Ventanas en u≈0.061 y 0.439.
function makeFuselageMaps() {
  const W = 2048, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const bv = document.createElement('canvas'); bv.width = W; bv.height = H;
  const g = cv.getContext('2d'), b = bv.getContext('2d');
  g.fillStyle = '#eef1f4'; g.fillRect(0, 0, W, H);    // aluminio pintado (mitad superior)
  b.fillStyle = '#808080'; b.fillRect(0, 0, W, H);    // bump neutro
  // Librea Boeing: azul en el vientre, línea de flotación justo bajo las ventanas
  // (las ventanas caen en u≈0.061 y 0.439; el vientre es u 0.439→1.0 y 0→0.061).
  g.fillStyle = '#23508c';
  g.fillRect(0.439 * W, 0, (1 - 0.439) * W, H);
  g.fillRect(0, 0, 0.061 * W, H);

  for (let i = 1; i < 30; i++) {                       // anillos de panel
    const y = i * H / 30;
    g.strokeStyle = 'rgba(110,120,132,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    b.strokeStyle = 'rgba(70,70,70,1)';       b.lineWidth = 2; b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke();
  }
  for (let i = 1; i < 24; i++) {                       // largueros
    const x = i * W / 24;
    g.strokeStyle = 'rgba(110,120,132,0.20)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    b.strokeStyle = 'rgba(80,80,80,1)';       b.lineWidth = 1.5; b.beginPath(); b.moveTo(x, 0); b.lineTo(x, H); b.stroke();
  }
  for (let i = 1; i < 30; i++) {                       // remaches
    const y = i * H / 30;
    for (let x = 8; x < W; x += 22) { g.fillStyle = 'rgba(90,100,112,0.22)'; g.fillRect(x, y - 1, 2, 2); b.fillStyle = 'rgba(60,60,60,1)'; b.fillRect(x, y - 1, 2, 2); }
  }
  for (let i = 0; i < 170; i++) {                      // weathering tenue
    g.fillStyle = `rgba(70,78,86,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * W, Math.random() * H, 20 + Math.random() * 130, 5 + Math.random() * 14);
  }
  const soot = g.createLinearGradient(0, 0.8 * H, 0, H);   // hollín hacia la cola/APU
  soot.addColorStop(0, 'rgba(40,40,44,0)'); soot.addColorStop(1, 'rgba(40,40,44,0.18)');
  g.fillStyle = soot; g.fillRect(0, 0.8 * H, W, 0.2 * H);

  for (const u of [0.061, 0.439]) {                    // puertas + salida sobre ala (contornos)
    for (const vy of [0.16, 0.46, 0.82]) {
      const dx = u * W, dy = vy * H, dw = W * 0.07, dh = H * 0.05;
      g.strokeStyle = 'rgba(70,80,92,0.5)'; g.lineWidth = 2; g.strokeRect(dx - dw / 2, dy - dh / 2, dw, dh);
      b.strokeStyle = 'rgba(64,64,64,1)';   b.lineWidth = 2; b.strokeRect(dx - dw / 2, dy - dh / 2, dw, dh);
    }
  }
  g.fillStyle = '#9db4d6';                             // filete claro en la línea de flotación
  for (const u of [0.061, 0.439]) g.fillRect(u * W - 3, 0, 6, H);

  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const bump = new THREE.CanvasTexture(bv); bump.anisotropy = 4;
  return { tex, bump };
}
const fuseMaps = makeFuselageMaps();
const fuselageMat = planeMat(0xffffff, 0.2, 0.5);
fuselageMat.map = fuseMaps.tex;
fuselageMat.bumpMap = fuseMaps.bump;
fuselageMat.bumpScale = 0.012;

const trailMat = new THREE.MeshBasicMaterial({
  color: 0xffffff, transparent: true, opacity: 0,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
trailMat.userData = { baseOp: 0.22 };
aircraftMats.push(trailMat);

const aircraft = new THREE.Group();
aircraft.visible = false;
flightGroup.add(aircraft);

const windowMat = planeMat(0x0a1622, 0.1, 0.12);
windowMat.envMapIntensity = 0.6;              // reflejo suave del cielo (no espejo)
windowMat.emissive = new THREE.Color(0x12222e);
windowMat.emissiveIntensity = 0.22;
const detailMat = planeMat(0x2a2f37, 0.2, 0.6);

/* ---- Fuselaje (eje X, morro en -X) · proporciones 737-800 ---- */
const FR = 1.2;   // radio (Ø ≈ 3,76 m a escala)
const FL = 25;    // largo (≈ 39,5 m → ratio ~10,5)
const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(FR, FR, FL, 36), fuselageMat);
fuselage.rotation.z = Math.PI / 2;
aircraft.add(fuselage);
// Morro / radomo afilado
const nose = new THREE.Mesh(new THREE.SphereGeometry(FR, 28, 20), bodyMat);
nose.scale.set(1.6, 0.98, 0.98); nose.position.x = -FL / 2 - 0.1;
aircraft.add(nose);
// Cono de cola elevado (upsweep)
// Eje inclinado 15° (apex hacia arriba) → upsweep real, base unida al fuselaje
const tailCone = new THREE.Mesh(new THREE.ConeGeometry(FR, 5, 28), bodyMat);
tailCone.rotation.z = -Math.PI / 2 + 0.26;
tailCone.position.set(FL / 2 + 2.2, 0.65, 0);
aircraft.add(tailCone);
// APU (salida trasera, en la punta del cono)
const apu = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.5, 12), detailMat);
apu.rotation.z = -Math.PI / 2 + 0.26; apu.position.set(FL / 2 + 4.5, 1.25, 0);
aircraft.add(apu);
// Carenado ala-fuselaje (belly fairing)
const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bodyMat);
belly.scale.set(5.0, 0.5, 1.45); belly.position.set(0.6, -1.0, 0);   // carenado plano y discreto
aircraft.add(belly);

/* ---- Ventanas: parabrisas de cabina + dos filas de pasajeros ---- */
const yWin = 0.45;
const zWin = Math.sqrt(FR * FR - yWin * yWin) + 0.02;
const winGeo = new THREE.BoxGeometry(0.14, 0.2, 0.05);
for (let x = -FL / 2 + 4; x < FL / 2 - 4.5; x += 0.5) {
  for (const sgn of [1, -1]) {
    const w = new THREE.Mesh(winGeo, windowMat);
    w.position.set(x, yWin, sgn * zWin);
    aircraft.add(w);
  }
}
// Parabrisas frontal: casquete de esfera que ENVUELVE el morro (radio algo mayor
// que el morro → siempre por fuera y visible). Cubre el frente-superior.
const windshield = new THREE.Mesh(
  new THREE.SphereGeometry(1.24, 28, 18, -0.55, 1.1, 0.30 * Math.PI, 0.17 * Math.PI),
  windowMat,
);
windshield.scale.set(1.5, 0.98, 0.98);
windshield.position.set(-FL / 2 - 0.1, 0, 0);
aircraft.add(windshield);
// Ventanas laterales de cabina (proud sobre el fuselaje, tras el morro)
const cockGeo = new THREE.BoxGeometry(0.45, 0.3, 0.05);
for (const sgn of [1, -1]) {
  const c = new THREE.Mesh(cockGeo, windowMat);
  c.position.set(-FL / 2 + 2.0, 0.5, sgn * 1.12); c.rotation.y = sgn * 1.4;
  aircraft.add(c);
}

// Superficie con PERFIL AERODINÁMICO (airfoil NACA lofteado de raíz a punta).
// Se usa para estabilizadores y deriva (el ala principal usa makeWingWithWinglet).
function makeAirfoilWing(side, rootC, tipC, span, sweep, tRatio, rise) {
  const K = 9;
  const naca = (x) => 5 * tRatio * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
  const sec = [];
  for (let i = 0; i <= K; i++) { const x = 0.5 * (1 - Math.cos(Math.PI * i / K)); sec.push([x, naca(x)]); }   // dorso LE→TE
  for (let i = K - 1; i >= 1; i--) { const x = 0.5 * (1 - Math.cos(Math.PI * i / K)); sec.push([x, -naca(x)]); } // intradós TE→LE
  const P = sec.length, S = 8, verts = [];
  for (let j = 0; j < S; j++) {
    const s = j / (S - 1);
    const c = rootC + (tipC - rootC) * s, xs = sweep * s, ys = rise * s, zs = side * span * s;
    for (let i = 0; i < P; i++) { const p = sec[i]; verts.push(xs + (p[0] - 0.5) * c, ys + p[1] * c, zs); }
  }
  const idx = [];
  for (let j = 0; j < S - 1; j++) for (let i = 0; i < P; i++) {
    const a = j * P + i, b = j * P + (i + 1) % P, a2 = (j + 1) * P + i, b2 = (j + 1) * P + (i + 1) % P;
    idx.push(a, b, b2, a, b2, a2);
  }
  for (let i = 1; i < P - 1; i++) idx.push(0, i + 1, i);                       // cap raíz
  const base = (S - 1) * P;
  for (let i = 1; i < P - 1; i++) idx.push(base, base + i, base + i + 1);       // cap punta
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Ala COMPLETA con winglet integrado en UN solo loft: la línea media va recta
// (ala, diedro suave) y luego curva hacia arriba (winglet). Mismo perfil que
// afina sin interrupción → una única pieza continua, sin costura.
function makeWingWithWinglet(side) {
  const K = 9, tRatio = 0.12;
  const naca = (x) => 5 * tRatio * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
  const sec = [];
  for (let i = 0; i <= K; i++) { const x = 0.5 * (1 - Math.cos(Math.PI * i / K)); sec.push([x, naca(x)]); }
  for (let i = K - 1; i >= 1; i--) { const x = 0.5 * (1 - Math.cos(Math.PI * i / K)); sec.push([x, -naca(x)]); }
  const P = sec.length;
  // Estaciones (cant, cuerda, paso). Ala: diedro ~5°. Winglet: cant sube a ~80°.
  const Wn = 8, Vn = 8, wingSpan = 10.5, wgSpan = 2.6, sweepRate = 0.45;
  const rootC = 4.6, midC = 1.3, tipC = 0.45, dih = 0.09, cantMax = 1.4;
  const samples = [];
  for (let i = 0; i < Wn; i++) { const k = i / (Wn - 1); samples.push({ cant: dih, chord: rootC + (midC - rootC) * k, ds: i === 0 ? 0 : wingSpan / (Wn - 1) }); }
  for (let i = 1; i < Vn; i++) { const k = i / (Vn - 1), b = k * k * (3 - 2 * k); samples.push({ cant: dih + (cantMax - dih) * b, chord: midC + (tipC - midC) * k, ds: wgSpan / (Vn - 1) }); }
  let px = 0, py = 0, pz = 0; const verts = [];
  for (const sm of samples) {
    px += sweepRate * sm.ds; py += Math.sin(sm.cant) * sm.ds; pz += side * Math.cos(sm.cant) * sm.ds;
    const cs = Math.cos(sm.cant), sn = Math.sin(sm.cant), c = sm.chord;
    for (let i = 0; i < P; i++) { const xc = sec[i][0], yf = sec[i][1]; verts.push(px + (xc - 0.5) * c, py + yf * c * cs, pz - yf * c * side * sn); }
  }
  const S = samples.length, idx = [];
  for (let j = 0; j < S - 1; j++) for (let i = 0; i < P; i++) {
    const a = j * P + i, b = j * P + (i + 1) % P, a2 = (j + 1) * P + i, b2 = (j + 1) * P + (i + 1) % P;
    idx.push(a, b, b2, a, b2, a2);
  }
  for (let i = 1; i < P - 1; i++) idx.push(0, i + 1, i);
  const base = (S - 1) * P;
  for (let i = 1; i < P - 1; i++) idx.push(base, base + i, base + i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

for (const side of [1, -1]) {
  const wing = new THREE.Mesh(makeWingWithWinglet(side), wingMat);
  wing.position.set(0.6, -0.7, side * 0.72);
  aircraft.add(wing);
}

/* ---- Empenaje (cola): estabilizadores + deriva barrida ---- */
for (const side of [1, -1]) {
  const h = new THREE.Mesh(makeAirfoilWing(side, 2.2, 0.8, 3.4, 1.7, 0.12, 0.15), wingMat);
  h.position.set(FL / 2 + 0.1, 0.8, side * 0.5);
  aircraft.add(h);
}
const vfin = new THREE.Mesh(makeAirfoilWing(1, 3.0, 1.1, 3.4, 2.0, 0.14, 0), accentMat);
vfin.rotation.x = -Math.PI / 2;   // la envergadura pasa a ser vertical
vfin.position.set(FL / 2 - 2.0, 1.0, 0);   // arranca del techo del fuselaje rear
aircraft.add(vfin);

/* ---- Detalles finos: antenas dorsales, SATCOM, pitot ---- */
function bladeAntenna(x) {
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.34, 0.04), detailMat);
  a.position.set(x, FR + 0.13, 0); a.rotation.z = -0.15;  // ligeramente inclinada atrás
  aircraft.add(a);
}
bladeAntenna(-3); bladeAntenna(4.5);            // VHF dorsales
const satcom = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), detailMat);
satcom.scale.set(1.5, 0.4, 0.85); satcom.position.set(1.5, FR + 0.04, 0);
aircraft.add(satcom);                            // domo SATCOM
for (const sgn of [1, -1]) {                     // tubos pitot junto al morro
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), detailMat);
  pit.rotation.z = Math.PI / 2; pit.position.set(-FL / 2 + 0.7, 0.05, sgn * 0.55);
  aircraft.add(pit);
}
// AoA vanes (paletas de ángulo de ataque) junto al morro
for (const sgn of [1, -1]) {
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.04), detailMat);
  a.position.set(-FL / 2 + 1.3, 0.18, sgn * 1.0);
  aircraft.add(a);
}
// Drain masts bajo el fuselaje
for (const x of [-4, 1, 6]) {
  const d = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), detailMat);
  d.rotation.x = Math.PI / 2; d.position.set(x, -FR - 0.05, 0.3);
  aircraft.add(d);
}

// Luces de navegación + balizas (las balizas parpadean en vuelo, ver tick)
function navLight(color, x, y, z) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
  m.userData = { baseOp: 1 };
  aircraftMats.push(m);
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), m);
  s.position.set(x, y, z);
  aircraft.add(s);
  return m;
}
navLight(0xff1a1a, 6.3, 1.7, -12.5);          // roja · punta del winglet izquierdo
navLight(0x18ff3a, 6.3, 1.7, 12.5);           // verde · punta del winglet derecho
navLight(0xffffff, FL / 2 - 0.6, 3.0, 0);     // blanca · cola
const beacons = [
  navLight(0xff2a2a, -1.0, FR + 0.22, 0),     // baliza superior
  navLight(0xff2a2a, -1.0, -FR - 0.05, 0),    // baliza inferior
];

/* ---- Pilones + segunda góndola (ala opuesta al motor real) ---- */
function buildPylon(z) {
  // estrut inclinado que une el ala (arriba) con la góndola (abajo-delante)
  const p = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.32), nacelleMat);
  p.position.set(ENG_WING.x + 0.45, -0.65, z);
  p.rotation.z = 0.32;
  aircraft.add(p);
}
buildPylon(ENG_WING.z); buildPylon(-ENG_WING.z);
const lipMat    = planeMat(0xc4c8cc, 0.75, 0.28);   // labio metálico pulido
const intakeMat = planeMat(0x070a0e, 0.0, 0.85);    // interior oscuro
const fanMat    = planeMat(0x3a3d42, 0.6, 0.42);    // fan / tobera (titanio)
function buildNacelle() {
  const g = new THREE.Group();
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.46, 1.5, 30), nacelleMat);
  cowl.rotation.z = Math.PI / 2;
  g.add(cowl);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 14, 30), lipMat);
  lip.rotation.y = Math.PI / 2; lip.position.x = -0.75;
  g.add(lip);
  const intake = new THREE.Mesh(new THREE.CircleGeometry(0.47, 30), intakeMat);
  intake.rotation.y = -Math.PI / 2; intake.position.x = -0.72;
  g.add(intake);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(0.45, 30), fanMat);
  fan.rotation.y = -Math.PI / 2; fan.position.x = -0.6;
  g.add(fan);
  const plug = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 22), fanMat);
  plug.rotation.z = -Math.PI / 2; plug.position.x = 1.0;
  g.add(plug);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 16), lipMat);
  spinner.rotation.z = Math.PI / 2; spinner.position.x = -0.58;   // cono spinner hacia delante
  g.add(spinner);
  g.scale.y = 0.82;   // intake ovalado achatado por abajo (hamster pouch del CFM56-7B)
  return g;
}
const nac2 = buildNacelle();
nac2.position.set(ENG_WING.x, ENG_WING.y, -ENG_WING.z);
aircraft.add(nac2);

/* ---- Estelas (contrails) tras las góndolas ---- */
function buildTrail(z) {
  const tr = new THREE.Mesh(new THREE.BoxGeometry(18, 0.16, 0.16), trailMat);
  tr.position.set(8, ENG_WING.y, z);
  aircraft.add(tr);
}
buildTrail(ENG_WING.z); buildTrail(-ENG_WING.z);

// Nubes: sprites con textura de gradiente radial, se mueven al volar
const cloudCanvas = document.createElement('canvas');
cloudCanvas.width = cloudCanvas.height = 128;
const cctx = cloudCanvas.getContext('2d');
const cgrad = cctx.createRadialGradient(64, 64, 6, 64, 64, 62);
cgrad.addColorStop(0, 'rgba(255,255,255,0.95)');
cgrad.addColorStop(1, 'rgba(255,255,255,0)');
cctx.fillStyle = cgrad; cctx.fillRect(0, 0, 128, 128);
const SHOW_CLOUDS = true;    // nubes cálidas de atardecer sobre el HDRI

/* ---- Cielo HDRI (Poly Haven · industrial_sunset_puresky) ---- */
new RGBELoader().load('model/sky.hdr', (tex) => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  hdrTex = tex;
  hdrReady = true;
  console.log('HDRI cargada');
}, undefined, (err) => console.error('Error cargando sky.hdr:', err));
const cloudTex = new THREE.CanvasTexture(cloudCanvas);
const clouds = [];
for (let i = 0; SHOW_CLOUDS && i < 30; i++) {
  // tono cálido de atardecer: más naranjas cerca del sol (+x,-z), más rosas lejos
  const warm = Math.random();
  const col = new THREE.Color().setHSL(0.06 + warm * 0.02, 0.6, 0.62 + Math.random() * 0.1);
  const mat = new THREE.SpriteMaterial({ map: cloudTex, color: col, transparent: true, opacity: 0, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.position.set((Math.random() * 2 - 1) * 55, 2 + (Math.random() * 2 - 1) * 20, (Math.random() * 2 - 1) * 38);
  const sc = 14 + Math.random() * 24; s.scale.set(sc, sc * 0.55, 1);
  s.userData.speed = 9 + Math.random() * 12;
  scene.add(s); clouds.push(s);
}

/* ---- Escena de despegue: suelo + pista (cae y se desvanece al ascender) ---- */
const groundScene = new THREE.Group();
groundScene.visible = false;
const terrainMat = new THREE.MeshStandardMaterial({ color: 0x55603c, roughness: 1, metalness: 0, envMapIntensity: 0.1, transparent: true, opacity: 1 });
const terrain = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), terrainMat);
terrain.rotation.x = -Math.PI / 2;
groundScene.add(terrain);
const runwayMat = new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 1, metalness: 0, envMapIntensity: 0.1, transparent: true, opacity: 1 });
const runway = new THREE.Mesh(new THREE.PlaneGeometry(300, 10), runwayMat);
runway.rotation.x = -Math.PI / 2; runway.position.y = 0.05;
groundScene.add(runway);
const dashMat = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 1, metalness: 0, envMapIntensity: 0.1, transparent: true, opacity: 1 });
for (let x = -132; x <= 132; x += 12) {                    // eje central
  const d = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.45), dashMat);
  d.rotation.x = -Math.PI / 2; d.position.set(x, 0.1, 0);
  groundScene.add(d);
}
for (const z of [-4.6, 4.6]) {                              // líneas de borde
  const e = new THREE.Mesh(new THREE.PlaneGeometry(300, 0.35), dashMat);
  e.rotation.x = -Math.PI / 2; e.position.set(0, 0.08, z);
  groundScene.add(e);
}
scene.add(groundScene);
const groundMats = [terrainMat, runwayMat, dashMat];

/* ---- Atardecer: sol lejano, destellos en ventanas y tinte rojizo ---- */
const flareCanvas = document.createElement('canvas');
flareCanvas.width = flareCanvas.height = 128;
const fctx = flareCanvas.getContext('2d');
const fgrad = fctx.createRadialGradient(64, 64, 2, 64, 64, 64);
fgrad.addColorStop(0, 'rgba(255,235,190,1)');
fgrad.addColorStop(0.22, 'rgba(255,140,45,0.85)');
fgrad.addColorStop(1, 'rgba(255,80,20,0)');
fctx.fillStyle = fgrad; fctx.fillRect(0, 0, 128, 128);
const flareTex = new THREE.CanvasTexture(flareCanvas);

const sunGroup = new THREE.Group();
sunGroup.position.copy(new THREE.Vector3(10, 4, -12).normalize()).multiplyScalar(150);
const sunMat = new THREE.SpriteMaterial({ map: flareTex, transparent: true, opacity: 0, depthWrite: false }); // núcleo sólido (visible)
const sunCore = new THREE.Sprite(sunMat); sunCore.scale.set(34, 34, 1); sunGroup.add(sunCore);
const sunGlowMat = new THREE.SpriteMaterial({ map: flareTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }); // halo
const sunGlow = new THREE.Sprite(sunGlowMat); sunGlow.scale.set(120, 120, 1); sunGroup.add(sunGlow);
scene.add(sunGroup);

// (Destellos por sprites retirados: ahora el reflejo del sol es ESPECULAR,
//  aparece/desaparece según el ángulo de la cámara — más realista.)

const tintMat = new THREE.MeshBasicMaterial({ color: 0xff4a1e, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false });
const tintSphere = new THREE.Mesh(new THREE.SphereGeometry(240, 16, 12), tintMat);
scene.add(tintSphere);

/* =========================================================
   SELECTOR · 机型 (airframe GLB/OBJ) + 发动机 (engine GLB)
   Todos los assets viven en model/. Se pueden cambiar en vivo.
   ========================================================= */
const AIRFRAMES = {
  'b737-800': { url: 'model/boeing_737-800.glb',     type: 'glb', yaw: -Math.PI / 2, target: 26, label: 'Boeing 737-800', engines: ['cfm56-7b-proc', 'cfm56-7b'] },
  'b737-700': { url: 'model/boeing_737-700.glb',     type: 'glb', yaw: -Math.PI / 2, target: 26, label: 'Boeing 737-700', engines: ['cfm56-7b-proc', 'cfm56-7b'] },
  'a319':     { url: 'model/airbus_a319.glb',        type: 'glb', yaw: 0,            target: 26, label: 'Airbus A319',    engines: ['cfm56-7b-proc', 'cfm56-5b'] },
  'crj200':   { url: 'model/bombardier_crj-200.glb', type: 'glb', yaw: 0,            target: 26, label: 'Bombardier CRJ-200', engines: ['cfm56-7b-proc'] },
  'crj700':   { url: 'model/bombardier_crj-700.glb', type: 'glb', yaw: 0,            target: 26, label: 'Bombardier CRJ-700', engines: ['cfm56-7b-proc'] },
  // Nota: yaw/pitch son valores de partida — ajustar tras una pasada visual.
};
const ENGINES = {
  'cfm56-7b-proc': { type: 'procedural', spec: 'cfm56-7b', label: 'CFM56-7B（程序化解剖）' },
  'cfm56-7b':      { url: 'model/cfm56-7b.glb', type: 'glb', yaw: 0, pitch: 0, target: 3.0, spec: 'cfm56-7b', label: 'CFM56-7B（模型）' },
  'cfm56-5b':      { url: 'model/cfm56-5b.glb', type: 'glb', yaw: 0, pitch: 0, target: 3.0, spec: 'cfm56-5b', label: 'CFM56-5B（模型）' },
};

// Parámetros por familia de motor — alimentan el hero y la sección de specs.
const ENGINE_SPECS = {
  'cfm56-7b': {
    doc: 'CFM56-7B26 / SHT 01 OF 03',
    eyebrow: 'CFM INTERNATIONAL · GE × SAFRAN · 1995',
    title: 'CFM56', sub: '-7B',
    brand: 'CFM56-7B',
    source: '数据来源：CFM International、FAA TCDS E00055EN、Boeing 737NG AMM。',
    meta: [['1.55 m', '风扇直径'], ['32.8:1', '增压比'], ['1500 °C', '燃烧温度'], ['14460 RPM', '高压轴转速']],
    specs: [
      { c: 121,   u: 'kN',  l: '最大起飞推力' },
      { c: 14460, u: 'RPM', l: '高压轴转速 (100%)' },
      { c: 5175,  u: 'RPM', l: '低压轴转速 (100%)' },
      { c: 32.8,  d: 1, u: ':1', l: '增压比' },
      { c: 5.5,   d: 1, u: ':1', l: '涵道比' },
      { c: 397,   u: 'kg/s', l: '进气流量' },
      { c: 1500,  u: '°C',  l: '燃烧室温度' },
      { c: 2386,  u: 'kg',  l: '干重' },
      { c: 2.51,  d: 2, u: 'm', l: '长度' },
      { c: 1.55,  d: 2, u: 'm', l: '风扇直径' },
      { c: 24,    u: '', l: '风扇叶片数' },
      { c: 9,     u: '', l: '高压压气机级数' },
    ],
  },
  'cfm56-5b': {
    doc: 'CFM56-5B / A319 · SHT 02 OF 03',
    eyebrow: 'CFM INTERNATIONAL · GE × SAFRAN · 1988',
    title: 'CFM56', sub: '-5B',
    brand: 'CFM56-5B',
    source: '数据来源：CFM International、EASA TCDS E.046、Airbus A319 AMM。',
    meta: [['1.73 m', '风扇直径'], ['31.5:1', '增压比'], ['1450 °C', '燃烧温度'], ['15000 RPM', '高压轴转速']],
    specs: [
      { c: 120,   u: 'kN',  l: '最大起飞推力' },
      { c: 15000, u: 'RPM', l: '高压轴转速 (100%)' },
      { c: 5200,  u: 'RPM', l: '低压轴转速 (100%)' },
      { c: 31.5,  d: 1, u: ':1', l: '增压比' },
      { c: 5.7,   d: 1, u: ':1', l: '涵道比' },
      { c: 355,   u: 'kg/s', l: '进气流量' },
      { c: 1450,  u: '°C',  l: '燃烧室温度' },
      { c: 2400,  u: 'kg',  l: '干重' },
      { c: 2.43,  d: 2, u: 'm', l: '长度' },
      { c: 1.73,  d: 2, u: 'm', l: '风扇直径' },
      { c: 36,    u: '', l: '风扇叶片数' },
      { c: 9,     u: '', l: '高压压气机级数' },
    ],
  },
};

// Inyecta en el DOM los parámetros del motor seleccionado (hero + specs + HUD).
function applyEngineSpecs(key) {
  const eng = ENGINES[key];
  if (!eng) return;
  const s = ENGINE_SPECS[eng.spec] || ENGINE_SPECS['cfm56-7b'];
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('hero-eyebrow', s.eyebrow);
  const ht = document.getElementById('hero-title');
  if (ht) ht.innerHTML = s.title + '<span class="dim">' + s.sub + '</span>';
  set('hero-sub', '高涵道比涡扇发动机解剖 — 三维可视化');
  const hm = document.getElementById('hero-meta');
  if (hm) hm.innerHTML = s.meta.map(([v, l]) => `<li><b>${v}</b> ${l}</li>`).join('');
  set('doc-readout', s.doc);
  set('specs-eyebrow', '技术规格 · ' + s.title + s.sub);
  document.title = s.brand + ' · 涡扇发动机解剖';
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', '三维实景拆解一台 ' + s.brand + ' 涡扇发动机。');
  set('footer-brand', s.brand);
  set('specs-source', s.source);
  const grid = document.querySelector('.specs-grid');
  if (grid) grid.innerHTML = s.specs.map((sp) =>
    `<div class="spec"><span class="spec-num" data-count="${sp.c}"${sp.d ? ` data-decimals="${sp.d}"` : ''}>0</span><span class="spec-unit">${sp.u}</span><span class="spec-label">${sp.l}</span></div>`
  ).join('');
  runSpecCounters();
}

// Anima los contadores y la entrada de la sección specs (al entrar en viewport).
function runSpecCounters() {
  const specsEl = document.querySelector('.specs');
  if (!specsEl) return;
  const animateOnce = () => {
    $$('.specs .spec-num').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const obj = { v: 0 };
      animate(obj, {
        v: target, duration: 1600, ease: 'outExpo',
        onUpdate: () => { el.textContent = obj.v.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); },
      });
    });
    animate('.specs .eyebrow', { opacity: [0, 1], y: [16, 0], duration: 700, ease: 'outExpo' });
    animate('.specs h2',       { opacity: [0, 1], y: [24, 0], duration: 800, ease: 'outExpo' });
    animate('.spec',           { opacity: [0, 1], y: [30, 0], duration: 700, ease: 'outExpo', delay: stagger(70) });
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { animateOnce(); io.disconnect(); break; }
    }, { threshold: 0.1 });
    io.observe(specsEl);
  } else { animateOnce(); }
}

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./vendor/three/jsm/libs/draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => m.dispose());
    }
  });
}
// Centra un objeto en el origen y lo escala: su dimensión mayor queda en `target` unidades.
function centerAndScale(obj, target) {
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const k = target / (Math.max(size.x, size.y, size.z) || 1);
  obj.scale.setScalar(k);
  obj.position.set(-center.x * k, -center.y * k, -center.z * k);
}
function prepMats(obj, store) {
  obj.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    o.castShadow = false; o.receiveShadow = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      m.transparent = true; m.opacity = 0;
      if (m.shininess !== undefined) m.shininess = 55;
      if (m.specular) m.specular.setRGB(0.38, 0.17, 0.06);
      if (m.envMapIntensity !== undefined) m.envMapIntensity = 0.25;
      store.push(m);
    }
  });
}

let currentAirframeKey = 'b737-800';
let currentEngineKey = 'cfm56-7b-proc';
const glbEngine = new THREE.Group();
glbEngine.visible = false;
flightGroup.add(glbEngine);

function setAirframe(key) {
  const cfg = AIRFRAMES[key];
  if (!cfg) return;
  const onObj = (obj) => {
    if (realPlane) { flightGroup.remove(realPlane); disposeGroup(realPlane); }
    realMats.length = 0;
    centerAndScale(obj, cfg.target);
    const grp = new THREE.Group();
    grp.add(obj);
    grp.rotation.y = cfg.yaw;
    grp.visible = false;
    flightGroup.add(grp);
    prepMats(obj, realMats);
    realPlane = grp;
    aircraft.visible = false;
    realPlaneReady = true;
    currentAirframeKey = key;
    syncSelectorUI();
    console.log('airframe', key, 'listo');
  };
  if (cfg.type === 'obj') {
    new MTLLoader().load(cfg.url.replace(/\.obj$/, '.mtl'), (materials) => {
      materials.preload();
      const ol = new OBJLoader(); ol.setMaterials(materials);
      ol.load(cfg.url, (obj) => {
        // limpiar pieza outlier suelta (plane.obj tiene una a x>24)
        obj.traverse((o) => {
          if (!o.isMesh || !o.geometry) return;
          const pos = o.geometry.attributes.position, idx = o.geometry.index;
          const over = (v) => pos.getX(v) > 24;
          if (idx) {
            for (let i = 0; i < idx.count; i += 3) {
              const a = idx.getX(i);
              if (over(a) || over(idx.getX(i + 1)) || over(idx.getX(i + 2))) { idx.setX(i + 1, a); idx.setX(i + 2, a); }
            }
            idx.needsUpdate = true;
          }
        });
        onObj(obj);
      }, undefined, (e) => console.error('Error cargando', cfg.url, e));
    }, undefined, (e) => console.error('Error MTL', cfg.url, e));
  } else {
    gltfLoader.load(cfg.url, (gltf) => onObj(gltf.scene), undefined, (e) => console.error('Error GLB', cfg.url, e));
  }
}

function setEngine(key) {
  const cfg = ENGINES[key];
  if (!cfg) return;
  currentEngineKey = key;
  if (cfg.type === 'procedural') {
    glbEngine.visible = false;
    labelLayer.style.display = '';
  } else {
    engine.visible = false;
    labelLayer.style.display = 'none';
    gltfLoader.load(cfg.url, (gltf) => {
      while (glbEngine.children.length) { const c = glbEngine.children.pop(); disposeGroup(c); }
      const obj = gltf.scene;
      centerAndScale(obj, cfg.target);
      obj.rotation.set(cfg.pitch || 0, cfg.yaw || 0, 0);
      glbEngine.add(obj);
      // Prepara el "despiece falso" genérico: memoriza la posición base de cada
      // sub-malla y deduce el eje largo del motor para el estiramiento axial.
      const parts = [];
      obj.traverse((o) => { if (o.isMesh) { o.userData._bp = o.position.clone(); parts.push(o); } });
      const _b = new THREE.Box3().setFromObject(obj);
      const _s = _b.getSize(new THREE.Vector3());
      glbEngine.userData.parts = parts;
      glbEngine.userData.longAxis = (_s.x >= _s.y && _s.x >= _s.z) ? 'x' : (_s.y >= _s.z ? 'y' : 'z');
      glbEngine.userData.stretch = 1;
      glbEngine.visible = true;
      console.log('engine', key, 'listo · partes', parts.length, '· eje', glbEngine.userData.longAxis);
    }, undefined, (e) => console.error('Error engine GLB', cfg.url, e));
  }
  applyEngineSpecs(key);
  syncSelectorUI();
}

// Despiece "falso" genérico para motores GLB: sin semántica de piezas, cada
// sub-malla se aleja radialmente del centro y el grupo se estira en su eje largo.
function applyGlbExplode(e) {
  const parts = glbEngine.userData.parts;
  if (!parts || currentEngineKey === 'procedural') return;
  const spread = 1.5;
  for (const m of parts) {
    const bp = m.userData._bp;
    if (bp) m.position.copy(bp).addScaledVector(bp, spread * e);
  }
  glbEngine.userData.stretch = 1 + e * 0.6;
}
// Escala del motor activo en la fase de vuelo: para GLB aplica el estiramiento axial.
function setEngScale(g, base) {
  if (currentEngineKey === 'procedural') { g.scale.setScalar(base); return; }
  const la = glbEngine.userData.longAxis || 'x';
  g.scale.set(base, base, base);
  g.scale[la] = base * (glbEngine.userData.stretch || 1);
}

function refreshEngineOptions(airKey) {
  const eSel = document.getElementById('engine-select');
  if (!eSel) return;
  eSel.innerHTML = '';
  for (const ek of AIRFRAMES[airKey].engines) {
    const o = document.createElement('option');
    o.value = ek; o.textContent = ENGINES[ek].label;
    eSel.appendChild(o);
  }
}
function setupSelectors() {
  const aSel = document.getElementById('aircraft-select');
  const eSel = document.getElementById('engine-select');
  if (!aSel || !eSel) return;
  for (const [k, c] of Object.entries(AIRFRAMES)) { const o = document.createElement('option'); o.value = k; o.textContent = c.label; aSel.appendChild(o); }
  aSel.value = currentAirframeKey;
  refreshEngineOptions(currentAirframeKey);
  eSel.value = currentEngineKey;
  aSel.addEventListener('change', () => {
    currentAirframeKey = aSel.value;
    const def = AIRFRAMES[currentAirframeKey].engines[0];   // motor por defecto emparejado
    currentEngineKey = def;
    refreshEngineOptions(currentAirframeKey);
    eSel.value = def;
    setAirframe(currentAirframeKey);
    setEngine(def);
  });
  eSel.addEventListener('change', () => setEngine(eSel.value));
}
function syncSelectorUI() {
  const aSel = document.getElementById('aircraft-select');
  const eSel = document.getElementById('engine-select');
  if (aSel) aSel.value = currentAirframeKey;
  if (eSel) { refreshEngineOptions(currentAirframeKey); eSel.value = currentEngineKey; }
}

setAirframe('b737-800');
setEngine('cfm56-7b-proc');
setupSelectors();

/* =========================================================
   POST-PROCESSING — bloom para la llama de combustión
   ========================================================= */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength
  0.5,   // radius
  0.85,  // threshold (solo florece la llama, no los reflejos del metal)
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* =========================================================
   RENDER LOOP
   ========================================================= */
const clock = new THREE.Clock();
function tick() {
  const dt = clock.getDelta();

  // Rotación de los rotores (fan, compresores, turbinas) — visible también al despiezar
  const spin = dt * currentFanSpeed * 5.0;   // multiplicador global de visibilidad
  for (const s of spinners) s.obj.rotation.x += spin * s.k;

  // --- Vuelo (Fase 2) ---
  const et = clock.elapsedTime;
  if (planeAmount > 0.001) {
    // Secuencia: rodaje (nivel) → rotación (morro arriba) → ascenso
    const rot = Math.max(0, planeAmount - 0.12);
    const pitch = -0.13 * Math.min(rot / 0.08, 1) * Math.max(0, 1 - rot / 0.5);
    flightGroup.rotation.z = pitch + Math.sin(et * 0.6) * 0.04 * planeAmount;          // cabeceo
    flightGroup.rotation.x = Math.sin(et * 0.5) * 0.06 * planeAmount;                  // alabeo
    flightGroup.position.y = Math.sin(et * 0.6) * 0.25 * planeAmount;
    // Suelo: en la pista hasta despegar (planeAmount>0.12), luego cae y se desvanece
    const liftoff = Math.max(0, planeAmount - 0.12);
    groundScene.visible = true;
    groundScene.position.y = -4.2 - liftoff * 95;
    groundScene.position.x = (et * 38) % 12;
    const gOp = 1 - Math.max(0, Math.min(1, (liftoff - 0.28) / 0.4));
    for (const m of groundMats) m.opacity = gOp;
    for (const s of clouds) {
      s.position.x += dt * s.userData.speed * planeAmount;
      if (s.position.x > 60) s.position.x = -60;
      s.material.opacity = 0.4 * planeAmount;
    }
    const flash = Math.sin(et * 7) > 0.6 ? 1 : 0.08;   // parpadeo de balizas
    for (const bm of beacons) bm.opacity = planeAmount * flash;
  } else {
    controls.autoRotate = autoRotateReady;
    flightGroup.rotation.set(0, 0, 0);
    flightGroup.position.set(0, 0, 0);
    groundScene.visible = false;
    for (const s of clouds) s.material.opacity = 0;
  }

  controls.update();

  // --- Etiquetas de piezas: visibles solo en el despiece técnico ---
  const labelVis = (planeAmount > 0.001) ? 0 : revealAmt * explodeAmt * (1 - realismAmt);
  labelLayer.style.opacity = labelVis.toFixed(3);
  if (labelVis > 0.02) {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    for (const p of PARTS) {
      p.obj.getWorldPosition(_lblPos);
      _lblPos.x += p.cx;                          // centrar en la geometría real
      _lblPos.y += p.up ? p.topY : p.botY;        // borde superior o inferior real
      _lblPos.project(camera);
      if (_lblPos.z > 1) { p.el.style.display = 'none'; continue; }   // detrás de la cámara
      p.el.style.display = '';
      const x = (_lblPos.x * 0.5 + 0.5) * W;
      const y = (-_lblPos.y * 0.5 + 0.5) * H;
      p.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    }
  }

  composer.render();
  requestAnimationFrame(tick);
}

/* =========================================================
   RESIZE
   ========================================================= */
function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();
tick();

/* =========================================================
   SCROLL CHOREOGRAPHY — revelar el motor y despiezarlo
   Dirigido por un listener de scroll propio (robusto y fácil de depurar):
   el progreso se calcula desde la posición del #stage en el viewport.
   ========================================================= */
const cluster   = document.getElementById('cluster');
const disasmPct = $('#disasm-pct');
const posMarker = $('#pos-marker');
const stageEl   = document.getElementById('stage');
const REAL_COLOR = new THREE.Color(0xb9bdc6); // color del motor realista (titanio)

const clamp01 = (x) => Math.max(0, Math.min(1, x));

function updateEngineScroll() {
  if (!stageEl) return;
  const vh = window.innerHeight;
  const rect = stageEl.getBoundingClientRect();
  const stageTop = rect.top;

  /* (A) Revelado: stageTop va de +vh (oculto, en el hero) a 0 (visible). */
  const reveal = clamp01((vh - stageTop) / vh);
  revealAmt = reveal;
  if (cluster) cluster.style.opacity = reveal;
  combGlow.visible = reveal > 0.02;

  /* Acercamiento de cámara, una sola vez al empezar a revelar */
  if (!dollyDone && reveal > 0.01) {
    dollyDone = true;
    animate(camera.position, {
      x: 3.2, y: 1.4, z: 5.4, duration: 1700, ease: 'inOutQuad',
      onComplete: () => { autoRotateReady = true; },
    });
    animate(controls.target,  { x: 0.45, y: 0,  z: 0,   duration: 1700, ease: 'inOutQuad' });
  }

  /* (B) Progreso maestro 0→1 sobre el scroll del stage ya fijado.
       mt 0.00–0.26  despiece (0→1)
       mt 0.26–0.32  mantener despiezado
       mt 0.32–0.55  recompactar + recolorear técnico→realista
       mt 0.55–0.62  compacto y realista (motor en marcha)
       mt 0.62–1.00  el motor encoge → aparece el avión volando */
  const range = rect.height - vh;
  const mt = range > 0 ? clamp01(-stageTop / range) : 0;

  let explodeAmount, realism;
  if (mt < 0.26)      { explodeAmount = mt / 0.26;            realism = 0; }
  else if (mt < 0.32) { explodeAmount = 1;                    realism = 0; }
  else if (mt < 0.55) { const k = (mt - 0.32) / 0.23;
                        explodeAmount = 1 - k;                realism = k; }
  else                { explodeAmount = 0;                    realism = 1; }
  const plane = mt < 0.62 ? 0 : clamp01((mt - 0.62) / 0.38);
  planeAmount = plane;
  // La transformación (encoger motor, aparecer avión, opacar, cielo) ocurre en el
  // primer ~45% del vuelo; el resto es "volar". Así el avión queda SÓLIDO enseguida.
  const peRaw = clamp01(plane / 0.45);
  const pe = peRaw * peRaw * (3 - 2 * peRaw); // smoothstep

  // Al entrar en vuelo, encuadrar el avión UNA vez; luego órbita libre (ratón)
  if (plane > 0.02 && !planeFramed) {
    planeFramed = true;
    controls.autoRotate = false;
    animate(camera.position, {
      x: -6, y: 5, z: 26, duration: 1500, ease: 'inOutQuad',
      onComplete: () => { if (planeFramed) controls.autoRotate = true; },
    });
    animate(controls.target, { x: 0, y: 0, z: 0, duration: 1500, ease: 'inOutQuad' });
  } else if (plane < 0.02 && planeFramed) {
    // Al volver del vuelo al motor: reencuadrar la cámara a la vista cercana
    planeFramed = false;
    autoRotateReady = false;   // pausa el auto-giro durante el reencuadre
    animate(camera.position, {
      x: 3.2, y: 1.4, z: 5.4, duration: 1200, ease: 'inOutQuad',
      onComplete: () => { autoRotateReady = true; },
    });
    animate(controls.target, { x: 0.45, y: 0, z: 0, duration: 1200, ease: 'inOutQuad' });
  }

  explodeAmt = explodeAmount;   // expuestos para las etiquetas de piezas
  realismAmt = realism;

  // Despiece axial con escalonado pieza a pieza
  const span = 0.7;
  const n = ASSEMBLY.length;
  let nacelleOpen = 0;
  ASSEMBLY.forEach((part, i) => {
    const start = (part.so !== undefined ? part.so : (i / (n - 1)) * (1 - span));
    const local = clamp01((explodeAmount - start) / span);
    const e = local * local * (3 - 2 * local); // smoothstep
    part.obj.position.set(
      part.home[0] + part.off[0] * e,
      part.home[1] + part.off[1] * e,
      part.home[2] + part.off[2] * e,
    );
    if (part.obj === nacelleTop) nacelleOpen = e;
    // Los tornillos de la brida viajan con su módulo y estallan al despiezar
    const bd = part.obj.userData.bolts;
    if (bd) {
      bd.ring.position.set(bd.frontX + part.off[0] * e, part.off[1] * e, part.off[2] * e);
      updateBolts(bd.ring, e);
    }
  });

  // Despiece "falso" genérico para motores GLB (no tiene piezas semánticas)
  applyGlbExplode(explodeAmt);

  // Morph técnico → realista + apagar líneas
  const fillOp = reveal * (0.18 + realism * 0.79);
  for (const m of allFillMats) {
    m.opacity = fillOp;
    m.metalness = realism * 0.5;
    m.roughness = 1.0 - realism * 0.4;          // → 0.6 (mate, menos brillo)
    m.envMapIntensity = 0.1 + realism * 0.12;   // → 0.22 (reflejos suaves)
    m.depthWrite = realism > 0.4;
    if (m.userData.techColor) m.color.copy(m.userData.techColor).lerp(m.userData.realColor || REAL_COLOR, realism);
  }
  const wireOp = reveal * 0.85 * (1 - realism);
  for (const m of allWireMats) m.opacity = wireOp;
  // Tubería/mazos: solo en el acabado realista ("ya con la carcasa puesta")
  for (const m of plumbingMats) m.opacity = reveal * realism;
  // Detalle de cubierta (labio + líneas): solo con góndola cerrada y realista
  const cowlOp = reveal * realism * (1 - nacelleOpen);
  for (const m of cowlDetailMats) m.opacity = cowlOp;

  // Fase avión — usa el motor activo (procedural o GLB seleccionado)
  const eng = (currentEngineKey === 'procedural') ? engine : glbEngine;
  if (realPlaneReady) {
    // Modelo real: aparece en vuelo; el motor se oculta al despegar
    eng.visible = pe < 0.2;
    setEngScale(eng, 1); eng.position.set(0, 0, 0);
    eng.rotation.y = -0.4; eng.rotation.x = 0.12;
    realPlane.visible = pe > 0.02;
    const op = clamp01((pe - 0.05) / 0.4);
    const opq = op > 0.95;
    if (opq !== realOpaque) { realOpaque = opq; for (const m of realMats) { m.transparent = !opq; m.needsUpdate = true; } }
    for (const m of realMats) m.opacity = opq ? 1 : op;
  } else {
    // (narrativa procedural original, mientras el modelo aún carga)
    setEngScale(eng, 1 - pe * 0.4);
    eng.position.set(ENG_WING.x * pe, ENG_WING.y * pe, ENG_WING.z * pe);
    eng.rotation.y = -0.4 * (1 - pe);
    eng.rotation.x = 0.12 * (1 - pe);
    aircraft.visible = pe > 0.001;
    for (const m of aircraftMats) m.opacity = pe * m.userData.baseOp;
    const opaque = pe > 0.85;
    if (opaque !== aircraftOpaque) {
      aircraftOpaque = opaque;
      for (const m of solidMats) { m.transparent = !opaque; m.needsUpdate = true; }
    }
  }
  if (hdrReady && pe > 0.1) {
    scene.background = hdrTex;                         // cielo HDRI real en vuelo
  } else {
    scene.background = bgCol.copy(SPACE_BG).lerp(SKY_BG, pe);
  }
  renderer.toneMappingExposure = 1.05 + pe * 0.12;   // luz de vuelo
  bloomPass.strength = 0.85 * (1 - pe);              // sin bloom en vuelo (el sol del HDRI ya no quema)
  sunLight.intensity = pe * 1.6;                     // reflejo cálido del atardecer en vuelo
  flightFill.intensity = pe * 1.25;                  // relleno blanco (avión blanco, no oscuro)
  fanLight.intensity = 0.95 * (1 - pe);              // ilumina el fan en el motor; off en vuelo
  sunMat.opacity = pe;                               // disco del sol
  sunGlowMat.opacity = pe * 0.6;                     // halo del sol
  tintMat.opacity = pe * 0.15;                       // cielo un pelín rojizo (solo el cielo)

  // Combustión: arranca cuando está compacto
  const running = (1 - explodeAmount) * reveal;
  combGlowMat.emissiveIntensity = running * 3.4;
  combustorLight.intensity = running * 4.0;
  rimLight.intensity = 0.35 + running * 0.45;
  targetFanSpeed = 0.34 + running * 0.85;   // suelo alto: los rotores siguen girando visiblemente al despiezar

  /* HUD */
  if (disasmPct) disasmPct.textContent = Math.round(explodeAmount * 100) + '%';
  if (posMarker) posMarker.style.left = (explodeAmount * 100) + '%';
  modeReadout.textContent = plane > 0.5 ? '飞行'
    : (realism > 0.5 ? '实景' : (explodeAmount > 0.04 ? '分解中' : '技术'));
}
window.addEventListener('scroll', updateEngineScroll, { passive: true });
window.addEventListener('resize', updateEngineScroll);
updateEngineScroll();

/* (Los 7 pasos guiados y el morph render→wireframe se han retirado:
   ahora la exploración es libre — orbitas con el ratón — y el acabado
   es siempre sólido e hiperrealista.) */

/* =========================================================
   SPECS — contadores y entradas
   Disparados con IntersectionObserver (robusto, sin depender del
   ScrollObserver de anime.js que no se activaba en este montaje).
   ========================================================= */
function onReveal(el, cb, threshold = 0.2) {
  if (!el) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { cb(); io.disconnect(); break; }
    }
  }, { threshold });
  io.observe(el);
}

// Los contadores de specs ahora se animan desde applyEngineSpecs() → runSpecCounters()
// (se reconstruyen al cambiar de motor y se revelan al entrar en viewport).

