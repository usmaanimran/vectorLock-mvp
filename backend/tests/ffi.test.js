const koffi = require('koffi');
const { engine, TruckInfo } = require('../ffi/index.js');

console.log("=== Testing FFI Bridge to C Logistics Engine ===\n");

// 1. Initialize Map
const baseMap = engine.populateMap();
console.log(`Map loaded: ${baseMap.numRows}x${baseMap.numCols}`);

// 2. Initialize Trucks
const trucksArrayType = koffi.array(TruckInfo, 3);
const trucks = [{}, {}, {}]; 

const trucksPtr = koffi.alloc(TruckInfo, 3);
engine.initializeTrucks(trucksPtr);
console.log("Trucks initialized successfully.");



// 3. Create a mock shipment
const mockShipment = {
    weight: 50,
    volume: 2,
    destination: { row: 12, col: 12 } // M, 13 -> Row 12, Col 12
};

console.log(`\nMock Shipment: Weight ${mockShipment.weight}, Volume ${mockShipment.volume}, Dest: [${mockShipment.destination.row}, ${mockShipment.destination.col}]`);

// 4. Find the best truck
const bestTruckIndex = engine.findTruckForShipment(baseMap, trucksPtr, 3, mockShipment);

if (bestTruckIndex !== -1) {
    console.log(`\nBest Truck Assigned: Index ${bestTruckIndex}`);
    
    // 5.calculate diversion path from [0,0] 
    
    const startPoint = { row: 0, col: 0 };
    // simulate calculateDiversionPath
    try {
        const diversion = engine.calculateDiversionPath(baseMap, startPoint, mockShipment.destination);
        console.log(`Diversion Path Calculated: ${diversion.numPoints} points.`);
        if (diversion.numPoints > 0) {
            console.log(`Diversion Route ends at: [${diversion.points[diversion.numPoints - 1].row}, ${diversion.points[diversion.numPoints - 1].col}]`);
        }
    } catch (err) {
        console.log("Error calling calculateDiversionPath:", err.message);
    }
} else {
    console.log("\nNo truck could carry the shipment.");
}

console.log("\n=== Test Complete ===");
