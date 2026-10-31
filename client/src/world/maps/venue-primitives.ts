import * as THREE from "three";
import type { BoxOptions, VenueBuilder, VenueObstacle, Vec3 } from "./venue-types";

export function createVenueBuilder(scene: THREE.Scene): VenueBuilder {
  const obstacles: VenueObstacle[] = [];
  const seatMeshes: THREE.Mesh[] = [];
  const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
  interface BoxBatch {
    geometry: THREE.BoxGeometry;
    material: THREE.MeshStandardMaterial;
    matrices: THREE.Matrix4[];
    names: string[];
  }
  const boxBatches = new Map<string, BoxBatch>();
  const scaleVector = new THREE.Vector3();
  const positionVector = new THREE.Vector3();
  const rotationQuaternion = new THREE.Quaternion();
  const matrix = new THREE.Matrix4();
  let finished = false;

  function addBox(
    name: string,
    size: Vec3,
    position: Vec3,
    color: string,
    options: BoxOptions = {},
  ) {
    if (finished) throw new Error("Cannot add venue geometry after finalization");
    const roughness = options.roughness ?? 0.82;
    const metalness = options.metalness ?? 0;
    const emissive = options.emissive ?? "#000000";
    const emissiveIntensity = options.emissiveIntensity ?? 1.0;
    const key = JSON.stringify([color, roughness, metalness, emissive, emissiveIntensity]);
    let batch = boxBatches.get(key);
    if (!batch) {
      batch = {
        geometry: unitBoxGeometry,
        material: new THREE.MeshStandardMaterial({
          color,
          roughness,
          metalness,
          emissive,
          emissiveIntensity,
        }),
        matrices: [],
        names: [],
      };
      boxBatches.set(key, batch);
    }

    rotationQuaternion.identity();
    if (options.rotation) {
      rotationQuaternion.setFromEuler(new THREE.Euler(...options.rotation));
    }
    positionVector.set(...position);
    scaleVector.set(...size);
    batch.matrices.push(matrix.compose(positionVector, rotationQuaternion, scaleVector).clone());
    batch.names.push(name);

    if (options.solid) {
      if (options.rotation) {
        obstacles.push({
          size,
          position,
          rotation: [rotationQuaternion.x, rotationQuaternion.y, rotationQuaternion.z, rotationQuaternion.w],
        });
      } else {
        obstacles.push({ size, position });
      }
    }
  }

  function addObstacle(size: Vec3, position: Vec3, rotation?: [number, number, number]) {
    rotationQuaternion.identity();
    if (rotation) {
      rotationQuaternion.setFromEuler(new THREE.Euler(...rotation));
    }
    obstacles.push({
      size,
      position,
      ...(rotation
        ? { rotation: [rotationQuaternion.x, rotationQuaternion.y, rotationQuaternion.z, rotationQuaternion.w] as [number, number, number, number] }
        : {}),
    });
  }

  function finish() {
    if (finished) throw new Error("Venue geometry has already been finalized");
    finished = true;

    let batchIndex = 0;
    for (const batch of boxBatches.values()) {
      const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
      mesh.name = `venue-box-batch-${batchIndex}`;
      mesh.userData.instanceNames = batch.names;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      batch.matrices.forEach((instanceMatrix, index) => mesh.setMatrixAt(index, instanceMatrix));
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      batchIndex += 1;
    }
  }

  function addLight(position: Vec3, color: string, intensity: number, distance: number) {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(...position);
    scene.add(light);
    return light;
  }

  return { scene, obstacles, seatMeshes, finish, addBox, addObstacle, addLight };
}
