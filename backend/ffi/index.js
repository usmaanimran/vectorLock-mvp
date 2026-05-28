const koffi = require('koffi');
const path = require('path');
const os = require('os');

// Load the shared library
const libExtension = os.platform() === 'win32' ? 'dll' : 'so';
const libPath = path.resolve(__dirname, `../../engine/build/engine.${libExtension}`);

let lib;
try {
  lib = koffi.load(libPath);
} catch (e) {
  console.warn(`Warning: Could not load C shared library at ${libPath}. Make sure it is compiled.`);
  // Provide mock functions for testing if DLL is not available
  lib = null;
}

// Define Structs
const Point = koffi.struct('Point', {
  row: 'int8_t',
  col: 'int8_t'
});

const Route = koffi.struct('Route', {
  points: koffi.array(Point, 100),
  numPoints: 'int',
  routeSymbol: 'int8_t'
});

const MapStruct = koffi.struct('Map', {
  squares: koffi.array(koffi.array('int', 25), 25),
  numRows: 'int',
  numCols: 'int'
});

const TruckInfo = koffi.struct('TruckInfo', {
  routeSymbol: 'int8_t',
  maxWeight: 'int',
  maxVolume: 'int',
  currentWeight: 'int',
  currentVolume: 'int',
  route: Route
});

const ShipmentInfo = koffi.struct('ShipmentInfo', {
  weight: 'int',
  volume: 'int',
  destination: Point
});

// Bind Functions
const engine = {};

if (lib) {
  engine.populateMap = lib.func('populateMap', MapStruct, []);
  engine.getBlueRoute = lib.func('getBlueRoute', Route, []);
  engine.getGreenRoute = lib.func('getGreenRoute', Route, []);
  engine.getYellowRoute = lib.func('getYellowRoute', Route, []);
  engine.calculateDiversionPath = lib.func('calculateDiversionPath', Route, [koffi.pointer(MapStruct), Point, Point]);
  engine.findTruckForShipment = lib.func('findTruckForShipment', 'int', [MapStruct, koffi.pointer(TruckInfo), 'int', ShipmentInfo]);
  engine.initializeTrucks = lib.func('initializeTrucks', 'void', [koffi.pointer(TruckInfo)]);
} else {
  // Mocks if not loaded
  engine.populateMap = () => ({ squares: Array(25).fill(Array(25).fill(0)), numRows: 25, numCols: 25 });
  engine.getBlueRoute = () => ({ points: [], numPoints: 0, routeSymbol: 2 });
  engine.getGreenRoute = () => ({ points: [], numPoints: 0, routeSymbol: 4 });
  engine.getYellowRoute = () => ({ points: [], numPoints: 0, routeSymbol: 8 });
  engine.calculateDiversionPath = () => ({ points: [{row: 0, col: 0}], numPoints: 1, routeSymbol: 16 });
  engine.findTruckForShipment = () => 0;
  engine.initializeTrucks = () => {};
}

module.exports = {
  Point,
  Route,
  MapStruct,
  TruckInfo,
  ShipmentInfo,
  engine
};
