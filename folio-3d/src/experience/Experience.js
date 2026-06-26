import * as THREE from 'three';
import Physics from './Physics.js';
import World from './World.js';
import Vehicle from './Vehicle.js';
import FollowCamera from './FollowCamera.js';
import Input from './Input.js';
import Interface from './Interface.js';

const MARKER_RADIUS = 6;

export default class Experience {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this._activeMarker = null;

    this._setupRenderer();
    this._setupScene();

    // Sistemas
    this.physics = new Physics();
    this.world = new World(this.scene, this.physics);
    this.vehicle = new Vehicle(this.scene, this.physics);
    this.input = new Input();
    this.input.onReset(() => this.vehicle.reset());
    this.followCamera = new FollowCamera(this.camera, this.vehicle.group);
    this.ui = new Interface();

    this._bindEvents();
    this._setupDebug();
    this._tick();
  }

  _setupDebug() {
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:9999;' +
      'font:12px/1.4 monospace;color:#0f0;background:rgba(0,0,0,.7);padding:6px 10px;' +
      'border-radius:6px;white-space:pre;pointer-events:none';
    document.body.appendChild(el);
    this._debugEl = el;
    this._frame = 0;
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      300,
    );
    this.camera.position.set(0, 8, 26);
    this.camera.lookAt(0, 0, 0);
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  _checkMarkers() {
    const carPos = this.vehicle.group.position;
    let nearest = null;
    let nearestDist = Infinity;
    for (const m of this.world.markers) {
      const dx = carPos.x - m.group.position.x;
      const dz = carPos.z - m.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < MARKER_RADIUS && d < nearestDist) {
        nearest = m;
        nearestDist = d;
      }
    }

    if (nearest && nearest !== this._activeMarker) {
      this._activeMarker = nearest;
      this.ui.showProject(nearest.data);
    } else if (!nearest && this._activeMarker) {
      this._activeMarker = null;
      this.ui.hideProject();
    }
  }

  _tick() {
    const dt = Math.min(this.clock.getDelta(), 1 / 30); // clamp por si hay lag

    try {
      this.vehicle.update(dt, this.input.state);
      this.physics.step();
      this.world.update(dt);
      this.followCamera.update(dt);
      this._checkMarkers();

      this.ui.setSpeed(this.vehicle.speed * 3.6);

      // --- DEBUG temporal ---
      if (this._debugEl && this._frame++ % 5 === 0) {
        const i = this.input.state;
        const p = this.vehicle.group.position;
        const c = this.camera.position;
        this._debugEl.textContent =
          `input  fwd=${i.forward} steer=${i.steer} boost=${i.boost}\n` +
          `coche  x=${p.x.toFixed(1)} y=${p.y.toFixed(1)} z=${p.z.toFixed(1)}  speed=${(this.vehicle.speed * 3.6).toFixed(0)}km/h\n` +
          `camara x=${c.x.toFixed(1)} y=${c.y.toFixed(1)} z=${c.z.toFixed(1)}`;
      }

      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      if (this._debugEl) this._debugEl.textContent = 'ERROR: ' + (err && err.message);
      console.error('Error en el bucle:', err);
      return; // detiene el loop para no spamear
    }

    requestAnimationFrame(() => this._tick());
  }
}
