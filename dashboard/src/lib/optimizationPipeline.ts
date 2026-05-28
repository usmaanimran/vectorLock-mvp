export type ManifestItem = {
  id?: string;
  name: string;
  weight: number;
  volume: number;
  target: { row: number; col: number };
};

export type Coordinate = { row: number; col: number };

/**
 * Middleware pipeline to optimize dispatch logic before sending to A* engine.
 * 1. Strict Bin Packing: Groups manifest items by truck capacity (2000kg, 20m³), completely maxing out a truck before moving to the next.
 * 2. TSP Nearest Neighbor: Sorts the destinations for each truck to minimize travel distance, appending the Base coordinate at the end.
 * * @param manifest The list of items to dispatch
 * @param truckBases Array of starting positions for each truck
 * @returns Array of sorted routes containing full manifest item data for each truck
 */
export function optimizeDispatch(
  manifest: ManifestItem[],
  truckBases: Coordinate[] = []
): ManifestItem[][] {
  const TRUCK_MAX_WEIGHT = 2000;
  const TRUCK_MAX_VOLUME = 20;

  // 1. Strict Bin Packing (First-Fit for Max Density)
  const packedTrucks: ManifestItem[][] = [[], [], []];
  const truckWeights = [0, 0, 0];
  const truckVolumes = [0, 0, 0];
  
  if (manifest.length > 0) {
    for (const item of manifest) {
      let bestBinIdx = -1;

      // Find the FIRST truck that can fit this item and lock it in
      for (let i = 0; i < packedTrucks.length; i++) {
        if (truckWeights[i] + item.weight <= TRUCK_MAX_WEIGHT && truckVolumes[i] + item.volume <= TRUCK_MAX_VOLUME) {
          bestBinIdx = i;
          break; // <--- This break forces the engine to keep filling the same truck until it hits capacity
        }
      }

      if (bestBinIdx !== -1) {
        packedTrucks[bestBinIdx].push(item);
        truckWeights[bestBinIdx] += item.weight;
        truckVolumes[bestBinIdx] += item.volume;
      } else {
        // If all 3 default trucks are completely full, push to a new overflow queue array
        packedTrucks.push([item]);
        truckWeights.push(item.weight);
        truckVolumes.push(item.volume);
      }
    }
  }

  // Remove any empty bins so we don't dispatch empty trucks
  const finalPackedTrucks = packedTrucks.filter(trip => trip.length > 0);

  // 2. Sequencing (TSP Nearest Neighbor) & Return to Base
  const sequencedRoutes = finalPackedTrucks.map((truckManifest, i) => {
    const unvisited = [...truckManifest];
    const route: ManifestItem[] = [];
    const baseCoord = truckBases[i] || { row: 0, col: 0 };
    let currentPos = baseCoord;

    // Nearest Neighbor Pathfinding
    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let j = 0; j < unvisited.length; j++) {
        const item = unvisited[j];
        const dist = Math.abs(item.target.col - currentPos.col) + Math.abs(item.target.row - currentPos.row);
        
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = j;
        }
      }

      const nearestItem = unvisited.splice(nearestIdx, 1)[0];
      route.push(nearestItem.target ? nearestItem : { ...nearestItem }); // safety clone
      currentPos = nearestItem.target;
    }

    // Return to Base: Append base coordinate as a 0-weight/volume item at the end of the route
    route.push({
      name: 'Base (Return)',
      weight: 0,
      volume: 0,
      target: baseCoord
    });

    return route;
  });

  return sequencedRoutes;
}