# VectorLock: Logistics & Routing Engine (MVP)

<p align="center">
  <img src="./assets/banner.gif" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/C-Native_Engine-blue?style=for-the-badge">
  <img src="https://img.shields.io/badge/Node.js-Realtime_Server-green?style=for-the-badge">
  <img src="https://img.shields.io/badge/Next.js-Visualization-black?style=for-the-badge">
  <img src="https://img.shields.io/badge/Socket.IO-Live_Telemetry-orange?style=for-the-badge">
</p>

---

## Overview

VectorLock is a real-time, 3D-visualized logistics dispatch and dynamic routing decision engine designed for modern urban environments.

The system orchestrates optimal delivery tracking for a fleet of simulated transport trucks across a **25x25 grid layout**, managing:

* Dynamic map structures
* Pseudo-random congestion generation
* Capacity-constrained dispatch routing
* Real-time vehicle telemetry
* Live route recalculations

---

# 1. Architectural Overview

To achieve high-frequency pathfinding simulations without blocking main event loops, VectorLock utilizes a decoupled multi-tier architecture.

---

## Logistics Core Engine (C)

A highly optimized, natively compiled shared library (`.so` / `.dll`) responsible for CPU-heavy operations.

### Responsibilities

* Spatial evaluations
* Dynamic load tracking
* Grid computations
* Integer-based routing logic
* Cache-localized pathfinding

---

## Application Server (Node.js)

A real-time Socket.IO server responsible for orchestration and synchronization.

### Responsibilities

* Client connection management
* Traffic generation
* Tick coordination
* Telemetry synchronization
* FFI bridge communication

---

## Visualization Client (Next.js)

A React Three Fiber dashboard responsible for rendering and route visualization.

### Features

* Live truck rendering
* Real-time route previews
* Dynamic congestion overlays
* Manifest optimization pipelines
* Interactive monitoring environment

---

# 2. Complete Repository File Manifest

<details>
<summary><strong>Expand Repository Structure</strong></summary>

```text
├── backend/
│   ├── ffi/
│   │   └── index.js
│   ├── tests/
│   │   └── ffi.test.js
│   ├── server.js
│   ├── test_koffi.js
│   ├── test-socket.js
│   ├── package.json
│   └── package-lock.json
│
├── engine/
│   ├── src/
│   │   ├── DeliveryRoutes.h
│   │   ├── functionSpecs.c
│   │   ├── functionSpecs.h
│   │   ├── main.c
│   │   ├── mapping.c
│   │   └── mapping.h
│   └── Makefile
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── package-lock.json
│
└── .gitignore
```

</details>

---

# 3. Core Data Structures & Memory Layout

Zero-copy memory sharing between JavaScript and C is handled through native Koffi struct bindings.

To minimize serialization overhead, properties use compact primitive types such as:

* `int8_t`
* `int`
* fixed-size arrays

---

## Memory Structures

| Structure      | Description              | Properties                                |
| -------------- | ------------------------ | ----------------------------------------- |
| `Point`        | 2D coordinate            | `row`, `col`                              |
| `Route`        | Generated path container | `points[100]`, `numPoints`, `routeSymbol` |
| `Map`          | 25x25 layout matrix      | `squares`, `numRows`, `numCols`           |
| `ShipmentInfo` | Payload metadata         | `weight`, `volume`, `destination`         |
| `TruckInfo`    | Runtime truck state      | capacities, route, location               |

---

# 4. Algorithmic Specifications

---

## 4.1 A* Pathfinding Mechanics (`mapping.c`)

### Integer Multipliers (Octile Heuristic)

Avoids floating-point overhead entirely.

| Movement Type | Cost |
| ------------- | ---- |
| Orthogonal    | `10` |
| Diagonal      | `14` |

---

### Anti-Zig-Zag Correction

Vehicle motion stability is maintained by tracking directional vectors.

If a move introduces excessive directional switching:

* A hard turn penalty of `10` is injected
* Straight paths become heavily preferred
* Route smoothing improves visual consistency

---

### Intersection Rules

Prevents illegal diagonal corner-cutting between adjacent barriers.

This ensures:

* Realistic movement constraints
* Safer obstacle navigation
* Stable routing around dense structures

---

## 4.2 Pre-Dispatch Optimization (`optimizationPipeline.ts`)

Before manifests are transmitted to the backend, a dual-pass optimization phase is executed.

---

### Strict Bin Packing (First-Fit)

Manifest arrays are packed using maximum fleet limits:

* `2000kg`
* `20m³`

One truck is fully utilized before allocating another.

Overflow payloads are redirected automatically.

---

### Empty Bin Stripping

Unused route containers are removed using:

```ts
filter(trip => trip.length > 0)
```

This prevents dispatching empty "ghost trucks."

---

### TSP Nearest Neighbor

Waypoint sequencing uses Manhattan distance calculations to:

* Minimize travel distance
* Reduce redundant movement
* Automatically append return-to-base nodes

---

## 4.3 Zero-GC Failure-Safes (`server.js`)

### Zero-GC BFS Isolation

To avoid garbage collection pauses during dense traffic cycles:

* `Uint8Array` visitation buffers are reused
* `Int8Array` coordinate queues are preallocated
* No dynamic array allocations occur during BFS traversal

---

### 100-Attempt Guard

If randomized congestion blocks all valid routes:

* Generation loops terminate safely at 100 attempts
* Empty arrays are assigned instead of deadlocking the server

---

# 5. WebSocket Protocol API

| Event Name            | Type     | Description                   |
| --------------------- | -------- | ----------------------------- |
| `init_map`            | Outgoing | Sends building coordinates    |
| `traffic_update`      | Outgoing | Broadcasts congestion updates |
| `fleet_status`        | Outgoing | Sends fleet metrics           |
| `truck_positions`     | Outgoing | Sends live positional data    |
| `waypoint_reached`    | Outgoing | Updates completed deliveries  |
| `dispatch_success`    | Outgoing | Confirms dispatch success     |
| `dispatch_manifest`   | Incoming | Sends routing manifests       |
| `set_traffic_density` | Incoming | Updates congestion thresholds |
| `set_mode`            | Incoming | Switches runtime modes        |
| `reset_scene`         | Incoming | Clears simulation state       |
| `clear_traffic`       | Incoming | Removes active roadblocks     |

---

# 6. Local Development & Deployment

---

## 6.1 Prerequisites

### Runtime Environment

* Node.js `18+`

### Compiler Environment

* GCC or Clang
* GNU Make
* WSL recommended for Windows

---

## 6.2 Launch Sequence

### 1. Compile Native Engine

```bash
cd engine

make clean
make
```

---

### 2. Validate Engine Layouts

```bash
cd ../backend

node test_koffi.js
node tests/ffi.test.js
```

---

### 3. Start Backend Server

```bash
cd ../backend
node server.js
```

Server runs on:

```text
localhost:3001
```

---

### 4. Start Frontend Dashboard

```bash
cd ../dashboard

npm install
npm run dev
```

---

# 7. Operator's Manual

---

## 7.1 Camera Controls & Visual Legend

### Camera Controls

| Action       | Input              |
| ------------ | ------------------ |
| Orbit Camera | Left Click + Drag  |
| Pan Camera   | Right Click + Drag |
| Zoom         | Mouse Wheel        |

---

### Visual Legend

| Visual              | Meaning             |
| ------------------- | ------------------- |
| Dark Grey Geometry  | Static buildings    |
| Red Floor Blocks    | Active congestion   |
| Neon Pink Cylinders | Active destinations |
| Faded Cylinders     | Queued orders       |
| Dashed Lines        | Preview routes      |
| Solid Lines         | Active routes       |

---

## 7.2 Execution Modes

---

### Mode A: vectorLock

Static logistics dispatch simulation.

#### Features

* Queue management
* Dynamic rerouting
* Capacity-aware dispatching
* Automatic traffic updates
* Real-time telemetry

---

### Mode B: Algo Test

High-frequency swarm routing stress test.

#### Features

* 150ms congestion refresh cycles
* Continuous A* recalculation
* Multi-vehicle convergence testing
* Rapid obstacle mutation

---

### Critical-Mode Override

When running Algo Test at Critical density:

* Left-clicking a red congestion block instantly clears it
* Vehicles regain trapped pathways
* Swarm deadlocks can be manually resolved

---
