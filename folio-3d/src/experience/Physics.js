import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Envoltorio fino sobre el mundo de Rapier.
 * Mantiene una lista de pares { body, mesh } y, tras cada paso de
 * simulación, copia la transformada del cuerpo físico al mesh de Three.js.
 */
export default class Physics {
  constructor() {
    this.RAPIER = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -20, z: 0 }); // gravedad un poco "arcade"
    this.world.timestep = 1 / 60;
    this.links = [];
  }

  /** Crea un cuerpo a partir de un descriptor y lo enlaza a un mesh para sincronizar. */
  addBody(bodyDesc, colliderDesc, mesh = null) {
    const body = this.world.createRigidBody(bodyDesc);
    const collider = this.world.createCollider(colliderDesc, body);
    if (mesh) this.links.push({ body, mesh });
    return { body, collider };
  }

  step() {
    this.world.step();
    for (const { body, mesh } of this.links) {
      const t = body.translation();
      const r = body.rotation();
      mesh.position.set(t.x, t.y, t.z);
      mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
}
