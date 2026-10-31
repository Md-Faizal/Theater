# 🎬 Virtual Cinema & Cine-Mall Experience

A next-generation browser-based multiplayer virtual cinema and entertainment mall powered by **Three.js WebGPU**, **Rapier WebAssembly Physics**, **Axum/Rust WebSockets**, and **SQLite**.

Step inside a grand multi-level luxury entertainment complex, explore cafes, arcades, and mezzanine sky-bridges, walk through physics-driven double doors, and experience synchronized IMAX movie screenings with spatial audio and interactive VIP seating.

---

## ✨ Features

### 🏛️ The Cine-Mall Grand Atrium
- **Enclosed Luxury Mall Architecture**: $67.2\text{m} \times 64.0\text{m}$ concourse with high-gloss ivory marble terrazzo flooring, vaulted glass skylights, and warm architectural lighting.
- **Level 2 Mezzanine & Sky-Bridges**: Continuous North and South galleries with frameless glass balustrades and polished brass handrails overlooking the central atrium.
- **Twin Architectural Escalators**: Dynamic escalators connecting Level 1 to Level 2 with illuminated amber step runners.
- **Central Fountain Hub & 4-Sided Jumbotron**: $8.4\text{m}$ circular marble fountain with turquoise water, brass sculptural water spire, cognac leather banquettes, and suspended digital media cube.
- **Entertainment Lifestyle Zones**:
  - *Gourmet Food Court*: Fluted oak popcorn kiosk (*Popcorn & Co.*), Italian gelato & boba cafe (*Crema Gelato*), and bistro seating.
  - *Pixel Palace Arcade*: Neon-lit retro arcade cabinets, glowing claw machine, and air hockey table.
  - *Cine-Vault Boutique*: Movie memorabilia and collector's shop.
  - *East Concourse IMAX Portal*: Monumental $24\text{m}$ facade with illuminated neon marquee, movie poster lightboxes, digital ticketing totems, and scarlet red carpet runner.

### 🎥 Flagship Screen 1 (IMAX Palace)
- **Colossal Wall-to-Wall Curved IMAX Screen**: $24.0\text{m}$ wide $\times 11.0\text{m}$ tall screen ($R = 45.8\text{m}$) filling 90% of the front wall with top/bottom bias illumination.
- **280 Ergonomic VIP Recliners**: Symmetrical 10-tier stadium bowl (14 seats Left + 14 seats Right per row) with contoured leather cushions, headrest pillows, dual armrests, cup holders, and generous legroom.
- **Grand Center Aisle Staircase**: Aligned directly with the entrance double doors, complete with brushed-metal safety handrails and electric blue LED step nosings.
- **Physics-Based Double Doors**: Spring-damper physics with bidirectional push mechanics (`E` key or walking into the door leaves).
- **Curved Front Stage & Speaker Towers**: Elevated cinema apron with curved edge lighting and acoustic sub-bass speaker towers.
- **Dynamic Lighting Controls**: Atmospheric house lights and sidewall wash lights that smoothly dim when media playback starts.

### 🌐 Media Playback & Screen Casting
- **Full-Screen Synchronization**: Multi-user play/pause, seek, and real-time playback state synchronization.
- **Streaming Platforms**: Local MP4/WebM video playback, YouTube streams, HLS live streams (`.m3u8`), and an **Indian OTT Hub** (JioCinema, Disney+ Hotstar, SonyLIV, Zee5, Prime Video, Netflix).
- **Screen & Tab Casting**: Built-in WebRTC tab casting (60 FPS) to broadcast browser tabs or desktop media directly onto the auditorium screen.
- **3D Spatial Audio**: Web Audio API directional panner nodes simulating acoustic screen positioning.

### 🕹️ Controls & Navigation
- **HUD Radar / Minimap**: Real-time 2D radar in the bottom-left displaying mall concourses, escalators, fountain, and Screen 1 bowl with player orientation.
- **Multiplayer Avatars & Chat**: Synchronized position, orientation, sitting status, custom avatar colors, and room chat.
- **Movement Physics**: Rapier 3D character controller with grounded detection, sprint acceleration, buffered jumping, and obstacle collision.

---

## 🎮 Controls

| Action | Control |
|---|---|
| **Move** | `W` `A` `S` `D` or Arrow Keys |
| **Look Around** | Move Mouse (click canvas to lock pointer) |
| **Sprint** | Hold `Shift` |
| **Jump** | `Space` (while walking) |
| **Sit in Seat** | `E` (aim crosshair at any VIP recliner) |
| **Push Double Doors** | Walk into doors or press `E` near doors |
| **Stand Up** | `Space` (while seated) |
| **Toggle Seated Look** | `L` (unlocks / locks mouse look while seated) |
| **Release Mouse** | `Esc` |

---

## 🐳 Docker Deployment

The fastest and most reliable way to run the entire stack in production is using Docker.

### 1. Unified All-in-One Container (Recommended)
Builds the TypeScript Vite frontend and Rust Axum backend into a single self-contained, lightweight (< 60MB) container:

```bash
# Build and run with Docker Compose
docker compose up -d --build
```
*Visit `http://localhost:3000` to start exploring. SQLite database data is automatically persisted in the `threater_data` Docker volume.*

### 2. Manual Docker Build & Run
```bash
# Build unified image
docker build -t threater .

# Run with persistent volume
docker run -d \
  --name threater-app \
  -p 3000:3000 \
  -v threater_data:/app/data \
  threater
```

### 3. Split Microservice Profile (Nginx Frontend + Rust Backend)
For Kubernetes, load balancers, or custom reverse proxies:
```bash
docker compose --profile split up -d --build
```
- **Frontend (Nginx)**: `http://localhost:80`
- **Backend API & WebSockets**: `http://localhost:3001`

---

## 🚀 Local Development Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.19+ or v22.12+)
- [Rust](https://www.rust-lang.org/) (Stable toolchain)
- Modern desktop browser (Chrome, Edge, Firefox, Brave) with WebGL 2.0 / WebGPU support

### 1. Start the Rust Signaling Server
```bash
cargo run -p virtual-cinema-server
```
*The server binds to `http://127.0.0.1:3000` (configurable via `THREATER_ADDR`).*

### 2. Start the Vite Frontend Client
In a separate terminal:
```bash
cd client
npm install
npm run dev
```
*The client dev server runs at `http://127.0.0.1:5173`. Open in multiple browser tabs or share the URL to test multiplayer.*

### 3. Production Build
```bash
npm --prefix client run build
```

---

## 🏛️ Project Architecture

```
THREATER/
├── Dockerfile                            # Production multi-stage all-in-one container
├── Dockerfile.client                     # Nginx client reverse-proxy container
├── Dockerfile.server                     # Dedicated Rust backend container
├── docker-compose.yml                    # Production orchestration
├── client/
│   ├── nginx.conf                        # Nginx SPA & WebSocket proxy config
│   ├── src/
│   │   ├── main.ts                       # Application bootstrap & 144Hz render loop
│   │   ├── account/                      # SQLite-backed profile management
│   │   ├── audio/                        # 3D spatial audio nodes
│   │   ├── media/                        # Media playback, HLS, & OTT Tab Casting
│   │   ├── network/                      # WebSocket client protocol
│   │   ├── players/                      # Remote avatar meshes & interpolation
│   │   ├── world/
│   │   │   ├── assets/                   # glTF 2.0 Draco & KTX2 model pipeline
│   │   │   ├── doors/                    # Physics-based spring double doors
│   │   │   ├── maps/
│   │   │   │   ├── entertainment-mall.ts # Grand 2-story mall atrium & concourses
│   │   │   │   ├── screens/screen-1-imax/# IMAX shell, seating, aisles, & curved display
│   │   │   │   ├── venue-primitives.ts   # InstancedMesh geometry batching
│   │   │   │   └── venue.ts              # Scene assembler & lighting
│   │   │   ├── navigation/               # 2D canvas venue minimap & radar
│   │   │   ├── physics/                  # Rapier WebAssembly player controller
│   │   │   └── rendering/                # WebGPU & WebGL 2.0 dynamic renderer factory
├── server/
│   ├── src/
│   │   ├── main.rs                       # Axum HTTP/WebSocket server entry point
│   │   ├── accounts.rs                   # SQLite auth sessions & profile endpoints
│   │   ├── protocol.rs                   # Binary/JSON WebSocket message types
│   │   ├── rooms.rs                      # Multiplayer room state & media synchronization
│   │   └── media_extractor.rs            # Optional yt-dlp metadata extractor
│   └── migrations/                       # SQLite schema migrations
└── Cargo.toml                            # Rust workspace configuration
```

---

## ⚡ Cutting-Edge Tech Stack & 144Hz Optimization

1. **Next-Gen WebGPU Renderer**:
   - Built on Three.js `WebGPURenderer` (`three/webgpu`) with automatic fallback to WebGL 2.0 for maximum browser compatibility.
   - ACES Filmic Tone Mapping and linear sRGB color space for photorealistic architectural finishes.
2. **Deterministic 120Hz Physics Accumulator**:
   - Physics sub-stepping runs at a fixed $120\text{Hz}$ accumulator loop, completely decoupling collision physics and character movement from variable frame rates.
   - Provides silky-smooth traversal on 144Hz and 240Hz monitors with zero tunneling or micro-stutter.
3. **Throttled Seat Raycasting**:
   - Cursor intersection raycasting is throttled to run every 4 frames ($\approx 36\text{Hz}$), saving $1.5\text{ms}$ per frame to preserve the strict $6.94\text{ms}$ budget required for locked 144 FPS.
4. **Performance Telemetry**:
   - Inspect live GPU backend (`WebGPU` vs `WebGL 2.0`), draw calls, and triangle metrics directly in the browser console:
     ```javascript
     window.__DEV_VIRTUAL_CINEMA.getRendererStats()
     ```

---

## 📄 License

MIT License. Designed with Three.js & Rust.
