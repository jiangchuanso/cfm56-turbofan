import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

const SPAWN = new THREE.Vector3(0, 2.5, 14);

/**
 * Coche "arcade" con física real.
 *
 * Conducción por CONTROL DE VELOCIDAD en vez de impulsos: cada frame
 * recalculamos la velocidad horizontal del chasis (avance + agarre lateral)
 * y la fijamos con setLinvel, preservando la velocidad vertical (v.y) para
 * que la gravedad, los saltos y las rampas sigan funcionando.
 *
 * ¿Por qué? Con impulsos pequeños la fricción estática del suelo (enorme con
 * gravedad alta) "pega" el coche y no arranca. Fijar la velocidad hace que
 * los controles respondan siempre, independientemente de masa y fricción,
 * y aun así el coche puede empujar cajas y recibir golpes.
 */
export default class Vehicle {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;

    // Manejo
    this.maxSpeed = 24; // m/s
    this.maxReverse = 11;
    this.accel = 30; // m/s²
    this.boostMult = 1.6;
    this.grip = 9; // cuánto se mata el derrape lateral
    this.rollResist = 0.9; // frenado al soltar el acelerador
    this.maxYawRate = 2.5; // rad/s de giro

    // Temporales reutilizables
    this._fwd = new THREE.Vector3();
    this._hv = new THREE.Vector3();
    this._lateral = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this.speed = 0;
    this._steerVis = 0;

    this._buildMesh();
    this._buildBody();
  }

  _buildMesh() {
    this.group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff5a1f, metalness: 0.4, roughness: 0.35 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x10141d, metalness: 0.6, roughness: 0.2 });

    // Chasis (coincide con el collider: half-extents 0.9 x 0.4 x 1.6)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.2), bodyMat);
    chassis.position.y = 0.1;
    chassis.castShadow = true;
    this.group.add(chassis);

    // Cabina
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.5), cabinMat);
    cabin.position.set(0, 0.65, -0.1);
    cabin.castShadow = true;
    this.group.add(cabin);

    // Ruedas visuales
    this.wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0f, roughness: 0.8 });
    const positions = [
      [-0.95, -0.25, -1.05, 'front'],
      [0.95, -0.25, -1.05, 'front'],
      [-0.95, -0.25, 1.15, 'rear'],
      [0.95, -0.25, 1.15, 'rear'],
    ];
    for (const [x, y, z, kind] of positions) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.castShadow = true;
      pivot.add(wheel);
      pivot.userData.kind = kind;
      pivot.userData.wheel = wheel;
      this.group.add(pivot);
      this.wheels.push(pivot);
    }

    this.scene.add(this.group);
  }

  _buildBody() {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(SPAWN.x, SPAWN.y, SPAWN.z)
      .setLinearDamping(0.05)
      .setAngularDamping(0.8)
      .setCanSleep(false);

    // Centro de masa bajo => cuesta volcar.
    const collider = RAPIER.ColliderDesc.cuboid(0.9, 0.4, 1.6)
      .setTranslation(0, -0.15, 0)
      .setFriction(0.4)
      .setRestitution(0.1)
      .setDensity(2.0);

    const { body } = this.physics.addBody(desc, collider, this.group);
    this.body = body;
  }

  reset() {
    this.body.setTranslation(SPAWN, true);
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  update(dt, input) {
    // Orientación → dirección de avance proyectada al plano horizontal.
    const q = this.body.rotation();
    this._quat.set(q.x, q.y, q.z, q.w);
    this._fwd.set(0, 0, -1).applyQuaternion(this._quat);
    this._fwd.y = 0;
    this._fwd.normalize();

    // Velocidad actual.
    const v = this.body.linvel();
    this._hv.set(v.x, 0, v.z);
    const forwardSpeed = this._hv.dot(this._fwd);

    // Velocidad de avance objetivo según acelerador.
    const boost = input.boost ? this.boostMult : 1;
    let target;
    if (input.forward > 0) {
      target = Math.min(forwardSpeed + this.accel * dt * boost, this.maxSpeed * boost);
    } else if (input.forward < 0) {
      target = Math.max(forwardSpeed - this.accel * dt, -this.maxReverse);
    } else {
      target = forwardSpeed * Math.max(0, 1 - this.rollResist * dt);
    }

    // Componente lateral (derrape) → el agarre lo va matando.
    this._lateral.copy(this._hv).addScaledVector(this._fwd, -forwardSpeed);
    this._lateral.multiplyScalar(Math.max(0, 1 - this.grip * dt));

    // Nueva velocidad horizontal = avance + resto lateral. La vertical se respeta.
    this._hv.copy(this._fwd).multiplyScalar(target).add(this._lateral);
    this.body.setLinvel({ x: this._hv.x, y: v.y, z: this._hv.z }, true);
    this.speed = Math.abs(forwardSpeed);

    // Dirección: giro en Y por velocidad angular, escalado por velocidad
    // y con sentido invertido en marcha atrás. Amortigua pitch/roll (antivuelco).
    const av = this.body.angvel();
    const speedFactor = Math.min(Math.abs(forwardSpeed) / 3, 1);
    const dirSign = forwardSpeed < -0.1 ? -1 : 1;
    let yaw = av.y * 0.85;
    if (input.steer !== 0 && speedFactor > 0.01) {
      yaw = input.steer * this.maxYawRate * speedFactor * dirSign;
    }
    this.body.setAngvel({ x: av.x * 0.9, y: yaw, z: av.z * 0.9 }, true);

    this._animateWheels(dt, forwardSpeed, input.steer);
  }

  _animateWheels(dt, forwardSpeed, steer) {
    this._steerVis += (steer * 0.5 - this._steerVis) * Math.min(1, dt * 10);
    const spin = forwardSpeed * dt * 2.2;
    for (const pivot of this.wheels) {
      if (pivot.userData.kind === 'front') pivot.rotation.y = this._steerVis;
      pivot.userData.wheel.rotation.x += spin;
    }
  }
}
