import * as THREE from "three";
import type { VenueObstacle } from "../maps/venue-types";

const EYE_HEIGHT = 1.7;
const COLLIDER_CENTER_TO_EYES = 0.85;
const WALK_SPEED = 4.2;
const SPRINT_SPEED = 6.2;

export interface MovementInput {
  forward: number;
  sideways: number;
  sprint: boolean;
  jump: boolean;
}

export interface PlayerController {
  update(camera: THREE.Camera, input: MovementInput, delta: number): void;
  syncFromCamera(camera: THREE.Camera): void;
  dispose(): void;
}

export async function createPlayerController(
  obstacles: VenueObstacle[],
  initialPosition: THREE.Vector3,
): Promise<PlayerController> {
  const RAPIER = (await import("@dimforge/rapier3d-compat")).default;
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });

  for (const obstacle of obstacles) {
    const [x = 0, y = 0, z = 0, w = 1] = obstacle.rotation ?? [0, 0, 0, 1];
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(obstacle.size[0] / 2, obstacle.size[1] / 2, obstacle.size[2] / 2)
        .setTranslation(...obstacle.position)
        .setRotation({ x, y, z, w }),
    );
  }
  // The character controller reads the world's scene-query snapshot.
  world.updateSceneQueries();

  const controller = world.createCharacterController(0.025);
  controller.setSlideEnabled(true);
  controller.setMaxSlopeClimbAngle(Math.PI / 4);
  controller.setMinSlopeSlideAngle(Math.PI / 3);
  controller.enableAutostep(0.3, 0.2, true);
  controller.enableSnapToGround(0.18);
  const collider = world.createCollider(
    RAPIER.ColliderDesc.capsule(0.55, 0.3).setTranslation(
      initialPosition.x,
      initialPosition.y - COLLIDER_CENTER_TO_EYES,
      initialPosition.z,
    ),
  );
  let verticalVelocity = 0;
  let horizontalSpeed = 0;
  let grounded = false;
  let jumpBuffer = 0;
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const desired = new THREE.Vector3();

  function syncFromCamera(camera: THREE.Camera) {
    collider.setTranslation({
      x: camera.position.x,
      y: camera.position.y - COLLIDER_CENTER_TO_EYES,
      z: camera.position.z,
    });
    verticalVelocity = 0;
    horizontalSpeed = 0;
    grounded = false;
  }

  return {
    update(camera, input, delta) {
      const step = Math.min(delta, 0.05);
      if (input.jump) jumpBuffer = 0.14;
      else jumpBuffer = Math.max(0, jumpBuffer - step);
      if (jumpBuffer > 0 && grounded) {
        verticalVelocity = 7.8;
        grounded = false;
        jumpBuffer = 0;
      }
      if (grounded && verticalVelocity < 0) verticalVelocity = 0;
      verticalVelocity = Math.max(verticalVelocity - 18 * step, -28);

      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() > 0) forward.normalize();
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0;
      if (right.lengthSq() > 0) right.normalize();

      desired.set(0, 0, 0)
        .addScaledVector(forward, input.forward)
        .addScaledVector(right, input.sideways);
      const hasInput = desired.lengthSq() > 0;
      if (hasInput) desired.normalize();
      const targetSpeed = hasInput ? (input.sprint ? SPRINT_SPEED : WALK_SPEED) : 0;
      const acceleration = hasInput ? 14 : 18;
      horizontalSpeed = THREE.MathUtils.damp(horizontalSpeed, targetSpeed, acceleration, step);

      const movement = {
        x: desired.x * horizontalSpeed * step,
        y: verticalVelocity * step,
        z: desired.z * horizontalSpeed * step,
      };
      controller.computeColliderMovement(collider, movement);
      const applied = controller.computedMovement();
      const position = collider.translation();
      const next = {
        x: position.x + applied.x,
        y: position.y + applied.y,
        z: position.z + applied.z,
      };
      collider.setTranslation(next);
      grounded = controller.computedGrounded();
      if (grounded && verticalVelocity < 0) verticalVelocity = 0;
      camera.position.set(next.x, next.y + COLLIDER_CENTER_TO_EYES, next.z);
    },
    syncFromCamera,
    dispose() {
      world.removeCharacterController(controller);
      world.free();
    },
  };
}

export function cameraEyeHeight() {
  return EYE_HEIGHT;
}
