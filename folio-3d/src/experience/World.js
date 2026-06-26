import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

const ARENA = 60; // medio lado del suelo

const PROJECTS = [
  {
    pos: [-18, 0, -16],
    color: 0x4ade80,
    tag: 'WEBGL · SHADERS',
    title: 'Océano de partículas',
    desc: 'Simulación GPU de un millón de partículas reaccionando al sonido en tiempo real.',
    tags: ['Three.js', 'GLSL', 'FFT'],
  },
  {
    pos: [18, 0, -18],
    color: 0x60a5fa,
    tag: 'DATAVIZ',
    title: 'Atlas del clima',
    desc: 'Globo 3D interactivo con 40 años de datos climáticos navegables.',
    tags: ['D3', 'WebGL', 'GIS'],
  },
  {
    pos: [22, 0, 16],
    color: 0xf472b6,
    tag: 'EXPERIMENTO',
    title: 'Jardín procedural',
    desc: 'Plantas generadas con L-systems que crecen según el clima de tu ciudad.',
    tags: ['Canvas', 'L-system', 'API'],
  },
  {
    pos: [-20, 0, 14],
    color: 0xfbbf24,
    tag: 'JUEGO',
    title: 'Gravedad rota',
    desc: 'Puzzle físico donde rediriges la gravedad para llevar una esfera a la meta.',
    tags: ['Rapier', 'Three.js'],
  },
];

export default class World {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.markers = [];
    this._t = 0;

    this._environment();
    this._ground();
    this._walls();
    this._ramps();
    this._props();
    this._markers();
  }

  _environment() {
    this.scene.background = new THREE.Color(0x10141d);
    this.scene.fog = new THREE.Fog(0x10141d, 45, 110);

    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x202028, 0.7);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
    sun.position.set(25, 40, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    const s = 55;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  _ground() {
    const geo = new THREE.PlaneGeometry(ARENA * 2, ARENA * 2);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1b2130, roughness: 0.95, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const grid = new THREE.GridHelper(ARENA * 2, ARENA, 0x3a4866, 0x232a3a);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // Suelo físico estático
    const desc = RAPIER.RigidBodyDesc.fixed();
    const col = RAPIER.ColliderDesc.cuboid(ARENA, 0.1, ARENA)
      .setTranslation(0, -0.1, 0)
      .setFriction(1.0);
    this.physics.addBody(desc, col, null);
  }

  _walls() {
    const h = 2.2;
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a3346,
      roughness: 0.8,
      transparent: true,
      opacity: 0.5,
    });
    const sides = [
      [0, ARENA, ARENA, 0.5], // +z
      [0, -ARENA, ARENA, 0.5], // -z
      [ARENA, 0, 0.5, ARENA], // +x
      [-ARENA, 0, 0.5, ARENA], // -x
    ];
    for (const [x, z, hx, hz] of sides) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, h, hz * 2), wallMat);
      mesh.position.set(x, h / 2, z);
      this.scene.add(mesh);
      const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, h / 2, z);
      const col = RAPIER.ColliderDesc.cuboid(hx, h / 2, hz);
      this.physics.addBody(desc, col, null);
    }
  }

  _ramps() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x394560, roughness: 0.7 });
    const ramps = [
      { pos: [0, 0, -6], rot: -0.32, size: [8, 0.6, 7] },
      { pos: [-10, 0, 4], rot: 0.28, size: [6, 0.6, 6] },
    ];
    for (const r of ramps) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...r.size), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(...r.pos);
      mesh.rotation.x = r.rot;
      this.scene.add(mesh);

      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r.rot, 0, 0));
      const desc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(...r.pos)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      const col = RAPIER.ColliderDesc.cuboid(r.size[0] / 2, r.size[1] / 2, r.size[2] / 2);
      this.physics.addBody(desc, col, null);
    }
  }

  _props() {
    const palette = [0xef4444, 0x3b82f6, 0xeab308, 0x22c55e, 0xa855f7, 0xf97316];

    // Pirámide de cajas para embestir
    const base = new THREE.Vector3(0, 0, -22);
    let idx = 0;
    for (let layer = 0; layer < 4; layer++) {
      const count = 4 - layer;
      for (let i = 0; i < count; i++) {
        const size = 1.4;
        const x = base.x + (i - count / 2) * (size + 0.05) + size / 2;
        const y = size / 2 + layer * size;
        const color = palette[idx++ % palette.length];
        this._dynamicBox(new THREE.Vector3(x, y, base.z), size, color);
      }
    }

    // Cajas y esferas sueltas repartidas
    for (let i = 0; i < 14; i++) {
      const x = (Math.random() - 0.5) * 70;
      const z = (Math.random() - 0.5) * 70;
      const color = palette[Math.floor(Math.random() * palette.length)];
      if (Math.random() > 0.5) {
        this._dynamicBox(new THREE.Vector3(x, 1 + Math.random() * 2, z), 0.9 + Math.random(), color);
      } else {
        this._dynamicSphere(new THREE.Vector3(x, 1 + Math.random() * 2, z), 0.6 + Math.random() * 0.5, color);
      }
    }
  }

  _dynamicBox(pos, size, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
    const col = RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2)
      .setRestitution(0.25)
      .setFriction(0.7);
    this.physics.addBody(desc, col, mesh);
  }

  _dynamicSphere(pos, r, color) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 24, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
    const col = RAPIER.ColliderDesc.ball(r).setRestitution(0.55).setFriction(0.5);
    this.physics.addBody(desc, col, mesh);
  }

  _markers() {
    for (const p of PROJECTS) {
      const group = new THREE.Group();
      group.position.set(p.pos[0], 0, p.pos[2]);

      // Pilar / haz de luz
      const beamMat = new THREE.MeshBasicMaterial({
        color: p.color,
        transparent: true,
        opacity: 0.18,
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 14, 24, 1, true), beamMat);
      beam.position.y = 7;
      group.add(beam);

      // Anillo en el suelo
      const ringGeo = new THREE.RingGeometry(1.6, 2.0, 40);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
      );
      ring.position.y = 0.05;
      group.add(ring);

      // Cristal flotante (icosaedro)
      const crystal = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.1, 0),
        new THREE.MeshStandardMaterial({
          color: p.color,
          emissive: p.color,
          emissiveIntensity: 0.6,
          metalness: 0.3,
          roughness: 0.2,
          flatShading: true,
        }),
      );
      crystal.position.y = 2.6;
      crystal.castShadow = true;
      group.add(crystal);

      const light = new THREE.PointLight(p.color, 8, 14, 2);
      light.position.y = 2.6;
      group.add(light);

      this.scene.add(group);
      this.markers.push({ group, crystal, ring, data: p, active: false, base: 2.6 });
    }
  }

  update(dt) {
    this._t += dt;
    for (const m of this.markers) {
      m.crystal.rotation.y += dt * 0.8;
      m.crystal.rotation.x += dt * 0.3;
      m.crystal.position.y = m.base + Math.sin(this._t * 1.5) * 0.25;
      m.ring.rotation.z += dt * 0.5;
    }
  }
}
