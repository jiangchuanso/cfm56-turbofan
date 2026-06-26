import * as THREE from 'three';

/**
 * Cámara de persecución suave. Sigue al coche por detrás y por encima.
 * Usa solo el "yaw" (giro horizontal) del objetivo para evitar mareos
 * cuando el coche salta o vuelca.
 */
export default class FollowCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target; // THREE.Object3D del chasis
    this.baseOffset = new THREE.Vector3(0, 5.5, 10);
    this.lookOffset = new THREE.Vector3(0, 1.2, 0);

    this._desired = new THREE.Vector3();
    this._lookAt = new THREE.Vector3();
    this._yawQuat = new THREE.Quaternion();
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
  }

  update(dt) {
    // Extraemos solo el giro en Y del objetivo.
    this._euler.setFromQuaternion(this.target.quaternion);
    this._yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._euler.y);

    this._desired.copy(this.baseOffset).applyQuaternion(this._yawQuat).add(this.target.position);
    this._lookAt.copy(this.lookOffset).add(this.target.position);

    // Suavizado independiente del framerate.
    const k = 1 - Math.pow(0.0015, dt);
    this.camera.position.lerp(this._desired, k);
    this.camera.lookAt(this._lookAt);
  }
}
