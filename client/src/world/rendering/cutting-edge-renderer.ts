import * as THREE from "three";

export interface RendererInstance {
  domElement: HTMLCanvasElement;
  backend: "WebGPU" | "WebGL 2.0";
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  setSize(width: number, height: number): void;
  setPixelRatio(ratio: number): void;
  dispose(): void;
  getStats(): {
    backend: string;
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
    pixelRatio: number;
  };
}

/**
 * Initializes a cutting-edge 3D renderer:
 * 1. Checks for native WebGPU support (navigator.gpu).
 * 2. If WebGPU is supported, initializes Three.js WebGPURenderer.
 * 3. Otherwise, initializes an optimized WebGL2 renderer with ACESFilmicToneMapping,
 *    PCFSoftShadowMap, and sRGB color management.
 */
export async function createCuttingEdgeRenderer(): Promise<RendererInstance> {
  const isWebGPUSupported = typeof navigator !== "undefined" && Boolean((navigator as any).gpu);
  
  if (isWebGPUSupported) {
    try {
      const { WebGPURenderer } = await import("three/webgpu" as any);
      const gpuRenderer = new WebGPURenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });

      gpuRenderer.setClearColor(0x000000, 0);
      gpuRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      gpuRenderer.setSize(window.innerWidth, window.innerHeight);
      gpuRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      gpuRenderer.toneMappingExposure = 1.08;

      if (typeof gpuRenderer.init === "function") {
        await gpuRenderer.init();
      }

      console.info("[Graphics] Initialized Next-Gen WebGPU Renderer with high-performance power preference.");

      return {
        domElement: gpuRenderer.domElement as HTMLCanvasElement,
        backend: "WebGPU",
        render: (scene, camera) => gpuRenderer.render(scene, camera),
        setSize: (w, h) => gpuRenderer.setSize(w, h),
        setPixelRatio: (r) => gpuRenderer.setPixelRatio(r),
        dispose: () => gpuRenderer.dispose(),
        getStats: () => {
          const info = gpuRenderer.info;
          return {
            backend: "WebGPU",
            calls: info?.render?.calls ?? 0,
            triangles: info?.render?.triangles ?? 0,
            geometries: info?.memory?.geometries ?? 0,
            textures: info?.memory?.textures ?? 0,
            pixelRatio: gpuRenderer.getPixelRatio?.() ?? window.devicePixelRatio,
          };
        },
      };
    } catch (err) {
      console.warn("[Graphics] WebGPU initialization failed, falling back to WebGL 2.0:", err);
    }
  }

  // Optimized WebGL 2.0 Renderer with ACESFilmicToneMapping & PCFSoftShadowMap
  const glRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    precision: "highp",
  });
  glRenderer.setClearColor(0x000000, 0);
  glRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  glRenderer.setSize(window.innerWidth, window.innerHeight);
  glRenderer.shadowMap.enabled = true;
  glRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  glRenderer.outputColorSpace = THREE.SRGBColorSpace;
  glRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  glRenderer.toneMappingExposure = 1.08;

  console.info("[Graphics] Initialized Optimized WebGL 2.0 Renderer with ACES Filmic tone mapping.");

  return {
    domElement: glRenderer.domElement,
    backend: "WebGL 2.0",
    render: (scene, camera) => glRenderer.render(scene, camera),
    setSize: (w, h) => glRenderer.setSize(w, h),
    setPixelRatio: (r) => glRenderer.setPixelRatio(r),
    dispose: () => glRenderer.dispose(),
    getStats: () => ({
      backend: "WebGL 2.0",
      calls: glRenderer.info.render.calls,
      triangles: glRenderer.info.render.triangles,
      geometries: glRenderer.info.memory.geometries,
      textures: glRenderer.info.memory.textures,
      pixelRatio: glRenderer.getPixelRatio(),
    }),
  };
}
