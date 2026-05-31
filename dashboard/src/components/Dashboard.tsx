"use client";

import { useEffect, useState, useRef } from 'react';
import { socket } from '@/lib/socket';
import { CommandPanel } from './CommandPanel';
import { QueueMonitor } from './QueueMonitor';
import GridMap from './GridMap';
import { ManifestItem } from '@/lib/optimizationPipeline';

export interface GridMapRef {
  activateQueuedMarkers: (trip: ManifestItem[]) => void;
  clearScene: () => void;
}

export function Dashboard() {
  const [targetPos, setTargetPos] = useState<{ row: number, col: number } | null>(null);
  const [manifest, setManifest] = useState<ManifestItem[]>([]);
  const [optimizedRoutes, setOptimizedRoutes] = useState<ManifestItem[][]>([]);
  const [activeWaypoints, setActiveWaypoints] = useState<ManifestItem[]>([]);
  const [overflowQueue, setOverflowQueue] = useState<ManifestItem[][]>([]);
  const [mode, setMode] = useState<'vectorLock' | 'swarm'>('vectorLock');
  
  // Added Critical Type
  const [trafficLevel, setTrafficLevel] = useState<'Low' | 'Mid' | 'High' | 'Critical'>('Mid');
  const gridMapRef = useRef<GridMapRef>(null);

  useEffect(() => {
    setManifest([]);
    setOverflowQueue([]);
    setActiveWaypoints([]);
    setOptimizedRoutes([]);
    setTargetPos(null);

    // Auto-downgrade Critical to High if switching back to vectorLock
    if (mode === 'vectorLock' && trafficLevel === 'Critical') {
      setTrafficLevel('High');
      socket.emit('set_traffic_density', 'High');
    }

    socket.emit('set_mode', mode);
    socket.emit('reset_scene');

    if (gridMapRef.current) {
      gridMapRef.current.clearScene();
    }
  }, [mode]);

  useEffect(() => {
    socket.connect();
    const handleWaypointReached = (payload: { row: number, col: number }) => {
      setActiveWaypoints(prev => prev.filter(w => w.target.row !== payload.row || w.target.col !== payload.col));
    };

    socket.on('waypoint_reached', handleWaypointReached);
    return () => {
      socket.off('waypoint_reached', handleWaypointReached);
      socket.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <CommandPanel
        targetPos={targetPos}
        setTargetPos={setTargetPos}
        manifest={manifest}
        setManifest={setManifest}
        setOptimizedRoutes={setOptimizedRoutes}
        activeWaypoints={activeWaypoints}
        setActiveWaypoints={setActiveWaypoints}
        overflowQueue={overflowQueue}
        setOverflowQueue={setOverflowQueue}
        mode={mode}
        setMode={setMode}
        trafficLevel={trafficLevel}
        setTrafficLevel={setTrafficLevel}
        gridMapRef={gridMapRef}
      />
      <QueueMonitor
        manifest={manifest}
        setManifest={setManifest}
        setOptimizedRoutes={setOptimizedRoutes}
        activeWaypoints={activeWaypoints}
        overflowQueue={overflowQueue}
      />
      <GridMap
        ref={gridMapRef}
        targetPos={targetPos}
        onMapClick={setTargetPos}
        manifest={manifest}
        activeWaypoints={activeWaypoints}
        overflowQueue={overflowQueue}
        optimizedRoutes={optimizedRoutes}
        mode={mode}
        trafficLevel={trafficLevel}
      />
    </div>
  );
}