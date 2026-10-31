import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

/**
 * Modern High-Fidelity 3D Asset Pipeline Helper.
 * Configures DRACO geometry decompression, KHR material extensions,
 * and automated GPU mesh instancing for fast design-to-deployment iteration.
 */
export class ModelPipeline {
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;

  constructor() {
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    this.dracoLoader.preload();
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  /**
   * Load an optimized glTF / GLB binary asset.
   */
  async loadModel(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          resolve(gltf.scene);
        },
        undefined,
        reject,
      );
    });
  }

  /**
   * Convert a single prototype mesh into a GPU-instanced mesh across multiple transforms.
   * This collapses hundreds of draw calls into exactly 1 draw call.
   */
  static createInstancedMesh(
    prototypeMesh: THREE.Mesh,
    transforms: { position: THREE.Vector3; rotation?: THREE.Euler; scale?: THREE.Vector3 }[],
  ): THREE.InstancedMesh {
    const count = transforms.length;
    const instancedMesh = new THREE.InstancedMesh(
      prototypeMesh.geometry,
      prototypeMesh.material,
      count,
    );
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    transforms.forEach((t, i) => {
      dummy.position.copy(t.position);
      if (t.rotation) dummy.rotation.copy(t.rotation);
      if (t.scale) dummy.scale.copy(t.scale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    return instancedMesh;
  }

  dispose() {
    this.dracoLoader.dispose();
  }
}
