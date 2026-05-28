const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const koffi = require('koffi');

const server = http.createServer();
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });


// 1. MEMORY MAPPING FOR C STRUCTS (Koffi)

const Point = koffi.struct('Point', { row: 'int8', col: 'int8' });
const Route = koffi.struct('Route', { points: koffi.array(Point, 100), numPoints: 'int', routeSymbol: 'int8' });
const IntArray25 = koffi.array('int', 25);
const MapStruct = koffi.struct('Map', { squares: koffi.array(IntArray25, 25), numRows: 'int', numCols: 'int' });

const TruckInfo = koffi.struct('TruckInfo', {
  routeSymbol: 'int8',
  maxWeight: 'int',
  maxVolume: 'int',
  currentWeight: 'int',
  currentVolume: 'int',
  route: Route,
  currentLocation: Point
});

const ShipmentInfo = koffi.struct('ShipmentInfo', { weight: 'int', volume: 'int', destination: Point });


// 2. LOAD ENGINE

const engineLibPath = process.platform === 'win32'
  ? path.join(__dirname, '../engine/build/engine.dll')
  : path.join(__dirname, '../engine/build/libengine.so');
const engineLib = koffi.load(engineLibPath);

const populateMap = engineLib.func('populateMap', MapStruct, []);
const getBlueRoute = engineLib.func('getBlueRoute', Route, []);
const getGreenRoute = engineLib.func('getGreenRoute', Route, []);
const getYellowRoute = engineLib.func('getYellowRoute', Route, []);
const calculateDiversionPath = engineLib.func('calculateDiversionPath', Route, [koffi.pointer(MapStruct), Point, Point]);

function parseRoute(cRoute) {
  const jsRoute = [];
  for (let i = 0; i < cRoute.numPoints; i++) {
    jsRoute.push({ row: cRoute.points[i].row, col: cRoute.points[i].col });
  }
  return jsRoute;
}


// 3. INITIALIZE STATE

const mapData = populateMap();
const buildings = [];
for (let r = 0; r < 25; r++) {
  for (let c = 0; c < 25; c++) {
    if (mapData.squares[r][c] === 1) buildings.push({ row: r, col: c });
  }
}

const cBlueRoute = getBlueRoute();
const cGreenRoute = getGreenRoute();
const cYellowRoute = getYellowRoute();

const trucksPtr = koffi.alloc(TruckInfo, 3);
const trucksState = [
  { id: 'blue', routeSymbol: 2, maxWeight: 2000, maxVolume: 20, currentWeight: 0, currentVolume: 0, route: cBlueRoute, currentLocation: { row: cBlueRoute.points[0].row, col: cBlueRoute.points[0].col }, activePath: [], targetDestination: null, waypointQueue: [] },
  { id: 'green', routeSymbol: 4, maxWeight: 2000, maxVolume: 20, currentWeight: 0, currentVolume: 0, route: cGreenRoute, currentLocation: { row: cGreenRoute.points[0].row, col: cGreenRoute.points[0].col }, activePath: [], targetDestination: null, waypointQueue: [] },
  { id: 'yellow', routeSymbol: 8, maxWeight: 2000, maxVolume: 20, currentWeight: 0, currentVolume: 0, route: cYellowRoute, currentLocation: { row: cYellowRoute.points[0].row, col: cYellowRoute.points[0].col }, activePath: [], targetDestination: null, waypointQueue: [] }
];

function syncTrucksToC() {
  const cArray = trucksState.map(t => ({
    routeSymbol: t.routeSymbol,
    maxWeight: t.maxWeight,
    maxVolume: t.maxVolume,
    currentWeight: t.currentWeight,
    currentVolume: t.currentVolume,
    route: t.route,
    currentLocation: t.currentLocation
  }));
  koffi.encode(trucksPtr, koffi.array(TruckInfo, 3), cArray);
}

syncTrucksToC();


// 4. (TRAFFIC & TRUCKS)

function getRandomOpenSpot(map) {
  const openSpots = [];
  for (let r = 0; r < map.numRows; r++) {
    for (let c = 0; c < map.numCols; c++) {
      if (map.squares[r][c] === 0) openSpots.push({ row: r, col: c });
    }
  }
  if (openSpots.length === 0) return { row: 0, col: 0 };
  return openSpots[Math.floor(Math.random() * openSpots.length)];
}

let trafficDensityState = 'Mid';
let modeState = 'vectorLock';
let lastTraffic = [];

function isRestrictedCell(r, c) {
  if (r === 0 && c === 0) return true;
  for (const truck of trucksState) {
    if (truck.currentLocation.row === r && truck.currentLocation.col === c) return true;
    if (truck.targetDestination && truck.targetDestination.row === r && truck.targetDestination.col === c) return true;
    for (const wp of truck.waypointQueue) {
      if (wp.row === r && wp.col === c) return true;
    }
  }
  return false;
}

// MEMORY BFS
function isSolvable(trafficArray) {
  const tempGrid = new Uint8Array(625);
  for(let i=0; i<buildings.length; i++) tempGrid[buildings[i].row * 25 + buildings[i].col] = 1;
  for(let i=0; i<trafficArray.length; i++) tempGrid[trafficArray[i].row * 25 + trafficArray[i].col] = 1;

  for (const truck of trucksState) {
    let target = truck.targetDestination;
    if (!target && truck.waypointQueue.length > 0) target = truck.waypointQueue[0];
    if (!target) continue; 

    const visited = new Uint8Array(625);
    const queueRow = new Int8Array(625);
    const queueCol = new Int8Array(625);
    let head = 0, tail = 0;

    queueRow[tail] = truck.currentLocation.row;
    queueCol[tail++] = truck.currentLocation.col;
    visited[truck.currentLocation.row * 25 + truck.currentLocation.col] = 1;

    let found = false;

    while (head < tail) {
      const r = queueRow[head];
      const c = queueCol[head++];

      if (r === target.row && c === target.col) {
        found = true;
        break;
      }

      if (r > 0 && visited[(r - 1) * 25 + c] === 0 && tempGrid[(r - 1) * 25 + c] === 0) {
        visited[(r - 1) * 25 + c] = 1; queueRow[tail] = r - 1; queueCol[tail++] = c;
      }
      if (r < 24 && visited[(r + 1) * 25 + c] === 0 && tempGrid[(r + 1) * 25 + c] === 0) {
        visited[(r + 1) * 25 + c] = 1; queueRow[tail] = r + 1; queueCol[tail++] = c;
      }
      if (c > 0 && visited[r * 25 + (c - 1)] === 0 && tempGrid[r * 25 + (c - 1)] === 0) {
        visited[r * 25 + (c - 1)] = 1; queueRow[tail] = r; queueCol[tail++] = c - 1;
      }
      if (c < 24 && visited[r * 25 + (c + 1)] === 0 && tempGrid[r * 25 + (c + 1)] === 0) {
        visited[r * 25 + (c + 1)] = 1; queueRow[tail] = r; queueCol[tail++] = c + 1;
      }
    }
    if (!found) return false;
  }
  return true;
}

function manageTrafficLoop() {
  if (global.trafficInterval) clearInterval(global.trafficInterval);

  function triggerRecalculation() {
    for (const truck of trucksState) {
      if (truck.targetDestination) {
        const diversionRoute = calculateDiversionPath(mapData, truck.currentLocation, truck.targetDestination);
        if (diversionRoute.numPoints > 0) truck.activePath = parseRoute(diversionRoute);
        else truck.activePath = [];
      }
    }
  }

  function generateStaticTraffic() {
    const openSpots = [];
    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < 25; c++) {
        const isBuilding = buildings.some(b => b.row === r && b.col === c);
        if (!isBuilding && !isRestrictedCell(r, c)) {
          openSpots.push({ row: r, col: c });
        }
      }
    }

    let percentage;
    if (trafficDensityState === 'Low') percentage = 0.01;
    else if (trafficDensityState === 'High') percentage = 0.07;
    else if (trafficDensityState === 'Critical') percentage = 0.22; 
    else percentage = 0.03;

    const numBlocks = Math.floor((625 - buildings.length) * percentage);

    let validTraffic = null;
    for (let attempts = 0; attempts < 100; attempts++) { 
      const tempOpen = [...openSpots];
      const tempTraffic = [];
      for (let i = 0; i < numBlocks; i++) {
        if (tempOpen.length === 0) break;
        const spot = tempOpen.splice(Math.floor(Math.random() * tempOpen.length), 1)[0];
        tempTraffic.push(spot);
      }

      if (isSolvable(tempTraffic)) {
        validTraffic = tempTraffic;
        break;
      }
    }

    if (!validTraffic) validTraffic = [];

    lastTraffic.forEach(t => { mapData.squares[t.row][t.col] = 0; });
    validTraffic.forEach(t => { mapData.squares[t.row][t.col] = 1; });

    lastTraffic = validTraffic;
    io.emit('traffic_update', lastTraffic);
    triggerRecalculation();
  }

  function shiftSwarmTraffic() {
    const ratio = trafficDensityState === 'Critical' ? 0.95 : 0.2; 
    const blocksToMove = Math.max(1, Math.floor(lastTraffic.length * ratio));

    let indices = new Array(lastTraffic.length);
    for(let i=0; i<indices.length; i++) indices[i] = i;
    for(let i=indices.length-1; i>0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    indices = indices.slice(0, blocksToMove);

    for (let i = 0; i < indices.length; i++) {
      if (lastTraffic.length === 0) break;
      const randIdx = indices[i];
      const block = lastTraffic[randIdx];

      const adjacent = [
        { row: block.row - 1, col: block.col },
        { row: block.row + 1, col: block.col },
        { row: block.row, col: block.col - 1 },
        { row: block.row, col: block.col + 1 }
      ].filter(p => {
        if (p.row < 0 || p.row >= 25 || p.col < 0 || p.col >= 25) return false;
        const isBuilding = buildings.some(b => b.row === p.row && b.col === p.col);
        if (isBuilding || isRestrictedCell(p.row, p.col)) return false;
        return !lastTraffic.some(t => t.row === p.row && t.col === p.col);
      });

      if (adjacent.length > 0) {
        const newSpot = adjacent[Math.floor(Math.random() * adjacent.length)];
        const tempTraffic = [...lastTraffic];
        tempTraffic[randIdx] = newSpot;

        if (isSolvable(tempTraffic)) {
          mapData.squares[block.row][block.col] = 0;
          mapData.squares[newSpot.row][newSpot.col] = 1;
          lastTraffic[randIdx] = newSpot;
        }
      }
    }

    io.emit('traffic_update', lastTraffic);
    triggerRecalculation();
  }

  generateStaticTraffic();

  if (modeState === 'swarm') {
    const interval = trafficDensityState === 'Critical' ? 150 : 1500; 
    global.trafficInterval = setInterval(() => {
      shiftSwarmTraffic();
    }, interval);
  } else {
    global.trafficInterval = setInterval(() => {
      generateStaticTraffic();
    }, 5000);
  }

  manageTruckLoop(); 
}

// STATE MACHINE
function manageTruckLoop() {
  if (global.truckInterval) clearInterval(global.truckInterval);
  
  const interval = (modeState === 'swarm' && trafficDensityState === 'Critical') ? 150 : 500;

  global.truckInterval = setInterval(() => {
    const currentPositions = [];

    for (const truck of trucksState) {
      if (truck.dispatchDelayTicks > 0) {
        truck.dispatchDelayTicks--;
        currentPositions.push({
          id: truck.id, row: truck.currentLocation.row, col: truck.currentLocation.col,
          path: [...truck.activePath], isIdle: truck.activePath.length === 0 && truck.waypointQueue.length === 0 && !truck.targetDestination
        });
        continue;
      }

      // 1. Path Invalidation (Dynamic Obstacle Detection)
      if (truck.activePath.length > 0) {
        const nextNode = truck.activePath[0];
        if (mapData.squares[nextNode.row][nextNode.col] === 1) {
          truck.activePath = []; 
        }
      }

      // 2. Movement Execution 
      if (truck.activePath.length > 0) {
          truck.currentLocation = truck.activePath.shift();
      }

      // 3. Routing & Arrival
      if (truck.activePath.length === 0) {
          
          // Reached Final Target
          if (truck.targetDestination) {
            if (truck.currentLocation.row === truck.targetDestination.row && truck.currentLocation.col === truck.targetDestination.col) {
                if (truck.targetDestination.weight || truck.targetDestination.volume) {
                    truck.currentWeight = Math.max(0, truck.currentWeight - truck.targetDestination.weight);
                    truck.currentVolume = Math.max(0, truck.currentVolume - truck.targetDestination.volume);
                }
                io.emit('waypoint_reached', {
                    truckId: truck.id,
                    row: truck.targetDestination.row, col: truck.targetDestination.col,
                    weight: truck.targetDestination.weight || 0, volume: truck.targetDestination.volume || 0
                });
                truck.targetDestination = null;
            } else {
                // Not reached, path was severed. ATTEMPT INFINITE RECALCULATION.
                const diversionRoute = calculateDiversionPath(mapData, truck.currentLocation, truck.targetDestination);
                if (diversionRoute.numPoints > 0) {
                    truck.activePath = parseRoute(diversionRoute);
                }
            }
          }

          // Grabbing the Next Waypoint
          if (!truck.targetDestination && truck.waypointQueue.length > 0) {
              const nextDest = truck.waypointQueue[0];
              if (truck.currentLocation.row === nextDest.row && truck.currentLocation.col === nextDest.col) {
                  truck.waypointQueue.shift();
                  if (nextDest.weight || nextDest.volume) {
                      truck.currentWeight = Math.max(0, truck.currentWeight - nextDest.weight);
                      truck.currentVolume = Math.max(0, truck.currentVolume - nextDest.volume);
                  }
                  io.emit('waypoint_reached', {
                      truckId: truck.id, row: nextDest.row, col: nextDest.col,
                      weight: nextDest.weight || 0, volume: nextDest.volume || 0
                  });
              } else {
                  const route = calculateDiversionPath(mapData, truck.currentLocation, nextDest);
                  if (route.numPoints > 0) {
                      truck.waypointQueue.shift();
                      truck.targetDestination = nextDest;
                      truck.activePath = parseRoute(route);
                  }
              }
          }
      }

      currentPositions.push({
        id: truck.id,
        row: truck.currentLocation.row,
        col: truck.currentLocation.col,
        path: [...truck.activePath],
        isIdle: truck.activePath.length === 0 && truck.waypointQueue.length === 0 && !truck.targetDestination
      });
    }

    syncTrucksToC();
    io.emit('truck_positions', currentPositions);

    io.emit('fleet_status', trucksState.map(t => ({
      id: t.id,
      currentWeight: t.currentWeight, maxWeight: t.maxWeight,
      currentVolume: t.currentVolume, maxVolume: t.maxVolume
    })));
  }, interval);
}


// 5. SOCKET CONNECTIONS

io.on('connection', (socket) => {
  socket.emit('init_map', buildings);

  socket.on('set_traffic_density', (density) => {
    trafficDensityState = density;
    manageTrafficLoop();
  });

  socket.on('set_mode', (mode) => {
    modeState = mode;
    manageTrafficLoop();
  });

  socket.on('clear_traffic', (payload) => {
    const { row, col } = payload;
    if (mapData.squares[row][col] === 1) {
      const isBuilding = buildings.some(b => b.row === row && b.col === col);
      if (!isBuilding) {
        mapData.squares[row][col] = 0;
        lastTraffic = lastTraffic.filter(t => t.row !== row || t.col !== col);
        io.emit('traffic_update', lastTraffic);
      }
    }
  });

  socket.on('reset_scene', () => {
    for (const truck of trucksState) {
      truck.currentLocation = { row: 0, col: 0 };
      truck.activePath = [];
      truck.targetDestination = null;
      truck.waypointQueue = [];
      truck.currentWeight = 0;
      truck.currentVolume = 0;
      truck.dispatchDelayTicks = 0;
    }
    syncTrucksToC();
    io.emit('truck_positions', trucksState.map(t => ({ id: t.id, row: t.currentLocation.row, col: t.currentLocation.col, path: t.activePath })));
  });

  socket.on('dispatch_manifest', (payload) => {
    const mode = payload.mode || 'vectorLock';
    syncTrucksToC();

    if (mode === 'vectorLock') {
      const truckRoutes = payload.truckRoutes || [];
      let dispatchedCount = 0;

      truckRoutes.forEach((route, i) => {
        if (i >= trucksState.length) return;
        const targetTruckState = trucksState[i];

        if (route.length > 0) {
          targetTruckState.dispatchDelayTicks = 0; 
          targetTruckState.currentWeight = 0;
          targetTruckState.currentVolume = 0;

          route.forEach(item => {
            targetTruckState.waypointQueue.push({
              row: parseInt(item.target.row), col: parseInt(item.target.col),
              weight: parseInt(item.weight) || 0, volume: parseInt(item.volume) || 0
            });

            targetTruckState.currentWeight += (parseInt(item.weight) || 0);
            targetTruckState.currentVolume += (parseInt(item.volume) || 0);
            if (item.weight > 0) dispatchedCount++;
          });
        }
      });
      syncTrucksToC();
      socket.emit('dispatch_success', { message: `Manifest dispatched successfully! (${dispatchedCount} items)` });
    }
    else if (mode === 'swarm') {
      const manifest = payload.manifest || [];
      const firstTarget = manifest.length > 0 ? manifest[0].target : { row: 0, col: 0 };
      const destination = { row: parseInt(firstTarget.row), col: parseInt(firstTarget.col) };

      for (const truck of trucksState) {
        
        // ⚡ THE FIX: Guarantee we spawn on a spot that actually has an initial path!
        let spot;
        let route;
        let attempts = 0;
        do {
          spot = getRandomOpenSpot(mapData);
          route = calculateDiversionPath(mapData, spot, destination);
          attempts++;
        } while (route.numPoints === 0 && attempts < 50);

        truck.currentLocation = spot;
        
        
        truck.targetDestination = destination; 

        if (route.numPoints > 0) {
          truck.activePath = parseRoute(route);
        } else {
          truck.activePath = []; 
        }
      }

      syncTrucksToC();
      io.emit('truck_positions', trucksState.map(t => ({ id: t.id, row: t.currentLocation.row, col: t.currentLocation.col, path: t.activePath })));
      socket.emit('dispatch_success', { message: 'A* Swarm algorithm executed!' });
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => console.log(`[vectorLock] Engine server running on port ${PORT}`));