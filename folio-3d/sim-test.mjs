// Prueba de física aislada: ¿se mueve el cuerpo del coche al acelerar?
import RAPIER from '@dimforge/rapier3d-compat';
import Physics from './src/experience/Physics.js';
import Vehicle from './src/experience/Vehicle.js';

await RAPIER.init();

const physics = new Physics();

// Suelo estático (réplica de World._ground)
const ARENA = 60;
const gd = RAPIER.RigidBodyDesc.fixed();
const gc = RAPIER.ColliderDesc.cuboid(ARENA, 0.1, ARENA).setTranslation(0, -0.1, 0).setFriction(1.0);
physics.addBody(gd, gc, null);

// Escena falsa: solo necesita .add()
const fakeScene = { add() {} };
const vehicle = new Vehicle(fakeScene, physics);

const dt = 1 / 60;
const input = { forward: 1, steer: 0, boost: false };

// Dejar caer 30 frames para asentar sobre el suelo
for (let i = 0; i < 30; i++) { vehicle.update(dt, { forward: 0, steer: 0, boost: false }); physics.step(); }

console.log('Tras asentar:', vehicle.group.position.toArray().map(n => n.toFixed(3)));

for (let i = 1; i <= 120; i++) {
  vehicle.update(dt, input);
  physics.step();
  if (i % 20 === 0) {
    const p = vehicle.group.position;
    const v = vehicle.body.linvel();
    console.log(`frame ${i}: pos=(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})  vel=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})  speed=${vehicle.speed.toFixed(2)}`);
  }
}
