"use client";

import { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Package, Truck, AlertCircle, Cpu, ShieldCheck, Plus } from 'lucide-react';
import { socket } from '@/lib/socket';

import { optimizeDispatch, ManifestItem } from '@/lib/optimizationPipeline';
import { GridMapRef } from './Dashboard';

type FleetStatus = { id: string, currentWeight: number, maxWeight: number, currentVolume: number, maxVolume: number };
type TruckPosition = { id: string, row: number, col: number, path?: { row: number, col: number }[], isIdle?: boolean };

export function CommandPanel({
  targetPos,
  setTargetPos,
  manifest,
  setManifest,
  setOptimizedRoutes,
  activeWaypoints,
  setActiveWaypoints,
  overflowQueue,
  setOverflowQueue,
  mode,
  setMode,
  trafficLevel,
  setTrafficLevel,
  gridMapRef
}: {
  targetPos: { row: number, col: number } | null,
  setTargetPos: (pos: { row: number, col: number } | null) => void,
  manifest: ManifestItem[],
  setManifest: (m: ManifestItem[]) => void,
  setOptimizedRoutes: (r: ManifestItem[][]) => void,
  activeWaypoints: ManifestItem[],
  setActiveWaypoints: (fn: (prev: ManifestItem[]) => ManifestItem[]) => void,
  overflowQueue: ManifestItem[][],
  setOverflowQueue: React.Dispatch<React.SetStateAction<ManifestItem[][]>>,
  mode: 'vectorLock' | 'swarm',
  setMode: (m: 'vectorLock' | 'swarm') => void,
  trafficLevel: 'Low' | 'Mid' | 'High' | 'Critical',
  setTrafficLevel: (t: 'Low' | 'Mid' | 'High' | 'Critical') => void,
  gridMapRef: React.RefObject<GridMapRef>
}) {

  const [itemName, setItemName] = useState('');
  
  // Empty string allowed to prevent the '0' backspace lock
  const [weight, setWeight] = useState<number | ''>(100);
  const [volume, setVolume] = useState<number | ''>(5);

  const [fleetStatus, setFleetStatus] = useState<FleetStatus[]>([]);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const overflowQueueRef = useRef<ManifestItem[][]>([]);
  const fleetStatusRef = useRef<FleetStatus[]>([]);
  const truckPositionsRef = useRef<TruckPosition[]>([]);

  useEffect(() => {
    overflowQueueRef.current = overflowQueue;
  }, [overflowQueue]);

  useEffect(() => {
    fleetStatusRef.current = fleetStatus;
  }, [fleetStatus]);

  useEffect(() => {
    const handleFleetStatus = (data: FleetStatus[]) => setFleetStatus(data);

    const handleTruckPositions = (data: TruckPosition[]) => {
      truckPositionsRef.current = data;
      if (overflowQueueRef.current.length === 0) return;

      let updatedFleetStatus = [...fleetStatusRef.current];
      let didReset = false;
      let currentQueue = [...overflowQueueRef.current];
      let queueChanged = false;
      let shouldDispatch = false;

      const truckRoutes: ManifestItem[][] = new Array(3).fill([]);

      data.forEach((truck, index) => {
        // Use definitive server-side isIdle flag
        const isAvailable = truck.isIdle !== undefined ? truck.isIdle : (!truck.path || truck.path.length === 0);
        
        if (isAvailable) {
          const fStatusIndex = updatedFleetStatus.findIndex(f => f.id === truck.id);
          if (fStatusIndex !== -1) {
            const fStatus = updatedFleetStatus[fStatusIndex];

            if (fStatus.currentWeight > 0 || fStatus.currentVolume > 0) {
              updatedFleetStatus[fStatusIndex] = { ...fStatus, currentWeight: 0, currentVolume: 0 };
              didReset = true;
            }

            if (currentQueue.length > 0) {
              const nextTrip = currentQueue.shift();
              if (nextTrip) {
                queueChanged = true;
                truckRoutes[index] = nextTrip; 
                shouldDispatch = true;

                setActiveWaypoints(prev => [...prev, ...nextTrip]);

                if (gridMapRef.current) {
                  gridMapRef.current.activateQueuedMarkers(nextTrip);
                }
              }
            }
          }
        }
      });

      if (shouldDispatch) {
        socket.emit('dispatch_manifest', {
          mode: 'vectorLock',
          truckRoutes
        });
      }

      if (queueChanged) {
        setOverflowQueue(currentQueue);
      }

      if (didReset) {
        setFleetStatus(updatedFleetStatus);
        fleetStatusRef.current = updatedFleetStatus;
      }
    };

    const handleWaypointReached = (payload: { truckId: string, row: number, col: number, weight: number, volume: number }) => {
      setFleetStatus(prev => {
        const next = prev.map(f => {
          if (f.id === payload.truckId) {
            return {
              ...f,
              currentWeight: Math.max(0, f.currentWeight - payload.weight),
              currentVolume: Math.max(0, f.currentVolume - payload.volume)
            };
          }
          return f;
        });
        fleetStatusRef.current = next;
        return next;
      });
    };

    socket.on('fleet_status', handleFleetStatus);
    socket.on('truck_positions', handleTruckPositions);
    socket.on('waypoint_reached', handleWaypointReached);
    return () => {
      socket.off('fleet_status', handleFleetStatus);
      socket.off('truck_positions', handleTruckPositions);
      socket.off('waypoint_reached', handleWaypointReached);
    };
  }, [setActiveWaypoints]);

  const handleAddToManifest = () => {
    if (!targetPos || !itemName) {
      setError('Please provide an item name and click the map to set a target.');
      return;
    }

    const parsedWeight = Number(weight) || 0;
    const parsedVolume = Number(volume) || 0;

    if (mode === 'vectorLock') {
      let errorMsg = '';
      if (parsedWeight <= 0 || parsedVolume <= 0) {
        errorMsg = 'Weight and Volume must be greater than 0.';
      } else if (parsedWeight > 2000 && parsedVolume > 20) {
        errorMsg = 'Limit Exceeded: Weight > 2000kg and Volume > 20m³.';
      } else if (parsedWeight > 2000) {
        errorMsg = 'Limit Exceeded: Weight cannot exceed 2000kg.';
      } else if (parsedVolume > 20) {
        errorMsg = 'Limit Exceeded: Volume cannot exceed 20m³.';
      }

      if (errorMsg) {
        setError(errorMsg);
        return;
      }
    }
    
    const id = crypto.randomUUID();
    const newManifest = [...manifest, { id, name: itemName, weight: parsedWeight, volume: parsedVolume, target: targetPos }];
    setManifest(newManifest);

    const bases = [{ row: 0, col: 0 }, { row: 0, col: 0 }, { row: 0, col: 0 }];
    const routes = optimizeDispatch(newManifest, bases);
    setOptimizedRoutes(routes);

    // Reset all states
    setItemName('');
    setWeight(100); 
    setVolume(5);
    setTargetPos(null); // This clears the target coordinates!
    setError(null);
    setStatus('Item added to manifest.');
    setTimeout(() => setStatus(null), 3000);
  };

  const handleMassDispatch = async () => {
    if (mode === 'swarm') {
      if (!targetPos) {
        setError('Please select a target on the map for Swarm Test.');
        return;
      }
      setLoading(true);
      setStatus(null);
      setError(null);

      socket.emit('dispatch_manifest', {
        mode: 'swarm',
        manifest: [{ target: targetPos }]
      });

      const handleSuccess = (data: any) => {
        setStatus(data.message || 'A* Swarm algorithm executed!');
        setTimeout(() => setStatus(null), 4000);
        setLoading(false);
        socket.off('dispatch_success', handleSuccess);
        socket.off('dispatch_error', handleError);
      };
      const handleError = (data: any) => {
        setError(data.error);
        setLoading(false);
        socket.off('dispatch_success', handleSuccess);
        socket.off('dispatch_error', handleError);
      };
      socket.on('dispatch_success', handleSuccess);
      socket.on('dispatch_error', handleError);
      return;
    }

    if (manifest.length === 0 && overflowQueue.length === 0) return;

    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      const pendingItems = overflowQueueRef.current.flat();
      const combinedManifest = [...pendingItems, ...manifest];

      const bases = [{ row: 0, col: 0 }, { row: 0, col: 0 }, { row: 0, col: 0 }];
      const finalRoutes = optimizeDispatch(combinedManifest, bases);

      const truckRoutes: ManifestItem[][] = new Array(3).fill([]);
      const availableTruckIndexes: number[] = [];

      truckPositionsRef.current.forEach((truck, index) => {
        const isAvailable = truck.isIdle !== undefined ? truck.isIdle : (!truck.path || truck.path.length === 0);
        if (isAvailable) {
          availableTruckIndexes.push(index);
        }
      });

      const initialDispatch = finalRoutes.slice(0, availableTruckIndexes.length);
      const overflow = finalRoutes.slice(availableTruckIndexes.length);

      availableTruckIndexes.forEach((truckIndex, i) => {
        if (i < initialDispatch.length) {
          truckRoutes[truckIndex] = initialDispatch[i];
        }
      });

      socket.emit('dispatch_manifest', {
        mode,
        truckRoutes
      });

      const handleSuccess = (data: any) => {
        setStatus(data.message || `Manifest dispatched successfully!`);

        const dispatchedItems = initialDispatch.flat();
        setActiveWaypoints(prev => [...prev, ...dispatchedItems]);

        setOverflowQueue(overflow);
        if (overflow.length > 0) {
          setStatus(`Manifest dispatched. ${overflow.length} trips queued for return.`);
        }
        
        setTimeout(() => setStatus(null), 5000);

        setManifest([]);
        setOptimizedRoutes([]);
        setLoading(false);
        cleanup();
      };

      const handleError = (data: any) => {
        setError(data.error);
        setLoading(false);
        cleanup();
      };

      const cleanup = () => {
        socket.off('dispatch_success', handleSuccess);
        socket.off('dispatch_error', handleError);
      };

      socket.on('dispatch_success', handleSuccess);
      socket.on('dispatch_error', handleError);

    } catch (err: unknown) {
      setError('Socket emit failed.');
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 w-96 bg-neutral-900/80 backdrop-blur-2xl border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">

      {/* STATIC TOP AREA: Live Fleet Status UI */}
      {fleetStatus.length > 0 && (
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Truck className="w-4 h-4" /> Live Data Feed
          </h3>
          <div className="flex flex-col gap-2">
            {fleetStatus.map(truck => (
              <div key={truck.id} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-neutral-500">
                  <span className={
                    truck.id === 'blue' ? 'text-blue-400' :
                      truck.id === 'green' ? 'text-emerald-400' :
                        truck.id === 'yellow' ? 'text-amber-400' : 'text-neutral-400'
                  }>{truck.id} Truck</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-[9px] text-neutral-500">WGT</span>
                  <div className="flex-1 bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800 relative">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${truck.id === 'blue' ? 'bg-blue-500' : truck.id === 'green' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (truck.currentWeight / truck.maxWeight) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-[9px] text-right font-mono text-neutral-400">{truck.currentWeight}/{truck.maxWeight}kg</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-[9px] text-neutral-500">VOL</span>
                  <div className="flex-1 bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800 relative">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${truck.id === 'blue' ? 'bg-blue-500' : truck.id === 'green' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (truck.currentVolume / truck.maxVolume) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-[9px] text-right font-mono text-neutral-400">{truck.currentVolume}/{truck.maxVolume}m³</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATIC TOP AREA: Animated Mode Toggle Header */}
      <div className="p-2 bg-neutral-900/50 border-b border-neutral-800 shrink-0">
        <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setMode('vectorLock')}
            className={`flex-1 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${mode === 'vectorLock' ? 'bg-white text-black shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> vectorLock
          </button>
          <button
            onClick={() => setMode('swarm')}
            className={`flex-1 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${mode === 'swarm' ? 'bg-indigo-500 text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] scale-[1.02]' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'}`}
          >
            <Cpu className="w-3.5 h-3.5" /> Algo Test
          </button>
        </div>
      </div>

      {/* SCROLLABLE MIDDLE AREA: Hidden Scrollbar applied via Tailwind CSS properties */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* Animated Traffic Density Toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Traffic Density</label>
          <div className="flex bg-neutral-950 rounded-xl border border-neutral-800 p-1">
            {['Low', 'Mid', 'High', ...(mode === 'swarm' ? ['Critical'] : [])].map((level) => (
              <button
                key={level}
                onClick={() => {
                  setTrafficLevel(level as 'Low' | 'Mid' | 'High' | 'Critical');
                  socket.emit('set_traffic_density', level);
                }}
                className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all duration-300 ${trafficLevel === level
                  ? level === 'Critical' 
                    ? 'bg-red-600 text-white shadow-md shadow-red-900/50 scale-[1.02]' 
                    : 'bg-neutral-700 text-white shadow-md scale-[1.02]'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                  }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Item Builder UI */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2"><Package className="w-4 h-4" /> Draft Item</h4>

          {mode === 'vectorLock' && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Med Supplies"
                value={itemName}
                onChange={e => {
                  setItemName(e.target.value);
                  if (error) setError(null);
                }}
                className="bg-neutral-950 border border-neutral-800 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-neutral-200 placeholder:text-neutral-600"
              />
            </div>
          )}

          {mode === 'vectorLock' && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Weight (kg) / MAX 2000KG</label>
                <input
                  type="number"
                  value={weight}
                  onChange={e => {
                    setWeight(e.target.value === '' ? '' : Number(e.target.value));
                    if (error) setError(null);
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-neutral-200"
                  min="1"
                  max="2000"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Volume (m³) / MAX 20m³</label>
                <input
                  type="number"
                  value={volume}
                  onChange={e => {
                    setVolume(e.target.value === '' ? '' : Number(e.target.value));
                    if (error) setError(null);
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-neutral-200"
                  min="1"
                  max="20"
                />
              </div>
            </div>
          )}

          {/* Target Display */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 flex items-center justify-between transition-colors hover:border-neutral-700">
            <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Target
            </label>
            <span className="text-xs font-mono text-neutral-300">
              {targetPos ? `[${targetPos.row}, ${targetPos.col}]` : 'Click map to set'}
            </span>
          </div>

          {mode === 'vectorLock' && (
            <button
              type="button"
              onClick={handleAddToManifest}
              disabled={!targetPos || !itemName}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed border border-neutral-700 active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Dropoff 
            </button>
          )}
        </div>
      </div>

      {/* PINNED FOOTER: Prominent Dispatch Button & Error Display */}
      <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/90 backdrop-blur-md shrink-0 flex flex-col gap-2 z-20">
        
        {/* Persistently Visible Error Message */}
        {error && (
          <div className="text-xs text-red-400 flex items-center gap-2 bg-red-950/30 p-2.5 rounded-lg border border-red-900/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Dynamic Dispatch Button */}
        <button
          type="button"
          onClick={handleMassDispatch}
          disabled={loading || (mode === 'vectorLock' && manifest.length === 0 && overflowQueue.length === 0) || (mode === 'swarm' && !targetPos)}
          className={`w-full font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:shadow-none hover:scale-[1.02] ${
            mode === 'vectorLock'
              ? 'bg-white hover:bg-neutral-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)]'
              : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]'
            }`}
        >
          {loading ? 'Processing...' : (mode === 'vectorLock' ? 'Dispatch' : 'Run Simulation')}
          <Send className="w-4 h-4" />
        </button>

        {/* Status Messages */}
        {status && (
          <div className="text-xs font-medium text-emerald-400 bg-emerald-950/40 px-3 py-2 rounded-lg border border-emerald-900/50 animate-in fade-in slide-in-from-bottom-2 duration-300 text-center">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}