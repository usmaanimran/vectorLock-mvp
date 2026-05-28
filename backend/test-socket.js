const { io } = require('socket.io-client');

async function runTest() {
  const socket = io('http://localhost:3001');
  
  socket.on('connect', () => {
    console.log('Connected to server');
    
    // Trigger shipment via WebSocket instead of HTTP fetch!
    socket.emit('dispatch_manifest', {
      mode: 'vectorLock',
      truckRoutes: [
        [{ target: { row: 12, col: 12 }, weight: 50, volume: 2 }]
      ]
    });
    console.log('Dispatch event sent!');
  });

  let tickCount = 0;
  socket.on('truck_positions', (payload) => {
    // Look for trucks that are NOT idle
    const movingTrucks = payload.filter(t => !t.isIdle);
    
    if (movingTrucks.length > 0) {
      console.log('Moving trucks:', movingTrucks);
      tickCount++;
      if (tickCount >= 5) {
        console.log('Verified movement for 5 ticks. Exiting.');
        process.exit(0);
      }
    }
  });
}

runTest();