'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
import * as THREE from 'three';
import { socket } from '@/lib/socket';
import { ManifestItem } from '@/lib/optimizationPipeline';

const activeMarkerMaterial = new THREE.MeshStandardMaterial({ color: "#f43f5e", emissive: "#be123c", emissiveIntensity: 0.8 });
const ghostMarkerMaterial = new THREE.MeshStandardMaterial({ color: "#f43f5e", emissive: "#be123c", emissiveIntensity: 0.4, transparent: true, opacity: 0.25 });

interface Position { x: number; z: number; }
interface TruckProps { id: string; color: string; targetPosition: Position; }
interface SocketData { id: string; row: number; col: number; path?: {row: number, col: number}[]; }

const Truck: React.FC<TruckProps> = ({ id, color, targetPosition }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPosRef = useRef(new THREE.Vector3(targetPosition.x, 0.5, targetPosition.z));

  useEffect(() => {
    let offsetX = 0;
    if (targetPosition.x === 0 && targetPosition.z === 0) {
      if (id === 'blue') offsetX = -0.6;
      else if (id === 'yellow') offsetX = 0.6;
    }
    targetPosRef.current.set(targetPosition.x + offsetX, 0.5, targetPosition.z);
  }, [targetPosition, id]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.position.lerp(targetPosRef.current, 5 * delta);
  });

  return (
    <mesh ref={meshRef} position={[targetPosition.x, 0.5, targetPosition.z]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
    </mesh>
  );
};

const Building: React.FC<{position: Position}> = ({ position }) => {
  return (
    <mesh position={[position.x, 0.75, position.z]} onPointerDown={(e) => e.stopPropagation()}>
      <boxGeometry args={[0.9, 1.5, 0.9]} />
      <meshStandardMaterial color="#222222" roughness={0.8} />
    </mesh>
  );
};

const TrafficBlock: React.FC<{position: Position}> = ({ position }) => {
  return (
    <mesh position={[position.x, 0.25, position.z]} onPointerDown={(e) => e.stopPropagation()}>
      <boxGeometry args={[0.9, 0.5, 0.9]} />
      <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.6} />
    </mesh>
  );
};

const RoutePreview = React.forwardRef<THREE.Group, { 
  manifest: ManifestItem[], 
  activeWaypoints: ManifestItem[], 
  overflowQueue: ManifestItem[][],
  routes: ManifestItem[][] 
}>(({ manifest, activeWaypoints, overflowQueue, routes }, ref) => {
  const routeColors = ['#ec4899', '#8b5cf6', '#f97316', '#14b8a6'];
  const activeItems = [...manifest, ...activeWaypoints];
  const ghostItems = overflowQueue.flat();

  return (
    <group name="destinationMarkers" ref={ref}>
      {activeItems.map((item, idx) => {
        if (item.name === 'Base (Return)') return null;
        return (
          <group key={`active-${idx}`} name={item.id ? `marker-${item.id}` : `active-${idx}`} position={[item.target.col, 0, item.target.row]}>
            <mesh position={[0, 1.0, 0]} material={activeMarkerMaterial}><cylinderGeometry args={[0.1, 0.1, 0.8, 16]} /></mesh>
            <mesh position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]} material={activeMarkerMaterial}><coneGeometry args={[0.3, 0.6, 16]} /></mesh>
          </group>
        );
      })}
      {ghostItems.map((item, idx) => {
        if (item.name === 'Base (Return)') return null;
        return (
          <group key={`ghost-${idx}`} name={item.id ? `marker-${item.id}` : `ghost-${idx}`} position={[item.target.col, 0, item.target.row]}>
            <mesh position={[0, 1.0, 0]} material={ghostMarkerMaterial}><cylinderGeometry args={[0.1, 0.1, 0.8, 16]} /></mesh>
            <mesh position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]} material={ghostMarkerMaterial}><coneGeometry args={[0.3, 0.6, 16]} /></mesh>
          </group>
        );
      })}
      {routes.map((route, routeIdx) => {
        if (route.length === 0) return null;
        const points = [
          new THREE.Vector3(0, 0.15, 0),
          ...route.map(p => new THREE.Vector3(p.target.col, 0.15, p.target.row))
        ];
        return <Line key={`route-${routeIdx}`} points={points} color={routeColors[routeIdx % routeColors.length]} lineWidth={3} dashed={true} />;
      })}
    </group>
  );
});

const GridMap = React.forwardRef(function GridMap({ 
  targetPos, 
  onMapClick,
  manifest,
  activeWaypoints,
  overflowQueue,
  optimizedRoutes,
  mode,
  trafficLevel
}: { 
  targetPos: {row: number, col: number} | null, 
  onMapClick: (pos: {row: number, col: number}) => void,
  manifest: ManifestItem[],
  activeWaypoints: ManifestItem[],
  overflowQueue: ManifestItem[][],
  optimizedRoutes: ManifestItem[][],
  mode: 'vectorLock' | 'swarm',
  trafficLevel: 'Low' | 'Mid' | 'High' | 'Critical'
}, ref) {
  const [truckPositions, setTruckPositions] = useState<Record<string, Position & { path?: {row: number, col: number}[] }>>({});
  const [buildings, setBuildings] = useState<{row: number, col: number}[]>([]);
  const [traffic, setTraffic] = useState<{row: number, col: number}[]>([]);
  const [previewPos, setPreviewPos] = useState<{row: number, col: number, isBlocked: boolean} | null>(null);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    let col = Math.max(0, Math.min(24, Math.round(e.point.x)));
    let row = Math.max(0, Math.min(24, Math.round(e.point.z)));
    
    const isBuilding = buildings.some(b => b.row === row && b.col === col);
    const isTraffic = traffic.some(t => t.row === row && t.col === col);
    
    const isBlocked = isBuilding || (isTraffic && !(mode === 'swarm' && trafficLevel === 'Critical'));
                      
    if (!previewPos || previewPos.row !== row || previewPos.col !== col || previewPos.isBlocked !== isBlocked) {
      setPreviewPos({ row, col, isBlocked });
    }
  };

  const handlePointerOut = () => setPreviewPos(null);

  const handleMapClick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    let col = Math.max(0, Math.min(24, Math.round(e.point.x)));
    let row = Math.max(0, Math.min(24, Math.round(e.point.z)));
    
    const isBuilding = buildings.some(b => b.row === row && b.col === col);
    const isTraffic = traffic.some(t => t.row === row && t.col === col);

    if (isBuilding) return;

    if (isTraffic) {
      if (mode === 'swarm' && trafficLevel === 'Critical') {
        socket.emit('clear_traffic', { row, col });
      } else {
        return; 
      }
    }

    onMapClick({ row, col });
  };

  const markersGroupRef = useRef<THREE.Group>(null);

  React.useImperativeHandle(ref, () => ({
    activateQueuedMarkers: (trip: ManifestItem[]) => {
      if (!markersGroupRef.current) return;
      trip.forEach(item => {
        if (!item.id) return;
        const groupObj = markersGroupRef.current!.getObjectByName(`marker-${item.id}`);
        if (groupObj) {
          groupObj.traverse((child) => {
            if (child instanceof THREE.Mesh) child.material = activeMarkerMaterial;
          });
        }
      });
    },
    clearScene: () => setPreviewPos(null)
  }));

  useEffect(() => {
    socket.on('truck_positions', (data: SocketData[]) => {
      const newPositions: Record<string, Position & { path?: {row: number, col: number}[] }> = {};
      data.forEach((truck) => {
        newPositions[truck.id] = { x: truck.col, z: truck.row, path: truck.path };
      });
      setTruckPositions(newPositions);
    });

    socket.on('init_map', (data: {row: number, col: number}[]) => setBuildings(data));
    socket.on('traffic_update', (data: {row: number, col: number}[]) => setTraffic(data));

    return () => {
      socket.off('truck_positions');
      socket.off('init_map');
      socket.off('traffic_update');
    };
  }, []);

  const truckColors: Record<string, string> = { blue: '#3b82f6', green: '#10b981', yellow: '#f59e0b' };

  return (
    <div className="w-full h-screen bg-neutral-950">
      <Canvas camera={{ position: [12, 20, 35], fov: 45 }}>
        <color attach="background" args={['#0a0a0a']} />
        <ambientLight intensity={0.4} />
        <pointLight position={[12, 15, 12]} intensity={500} color="#ffffff" />
        
        <group position={[12, 0, 12]}>
           <Grid args={[25, 25]} cellSize={1} cellThickness={1} cellColor="#333" sectionSize={5} sectionThickness={1.5} sectionColor="#555" fadeDistance={50} />
        </group>
        
        <mesh position={[12, -0.01, 12]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={handleMapClick} onPointerMove={handlePointerMove} onPointerOut={handlePointerOut}>
          <planeGeometry args={[25, 25]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {previewPos && (
          <group position={[previewPos.col, 0, previewPos.row]}>
            <mesh position={[0, 1.0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
              <meshStandardMaterial color={previewPos.isBlocked ? "#ef4444" : "#14b8a6"} emissive={previewPos.isBlocked ? "#dc2626" : "#0d9488"} emissiveIntensity={previewPos.isBlocked ? 0.2 : 0.6} transparent={true} opacity={previewPos.isBlocked ? 0.05 : 0.6} />
            </mesh>
            <mesh position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.3, 0.6, 16]} />
              <meshStandardMaterial color={previewPos.isBlocked ? "#ef4444" : "#14b8a6"} emissive={previewPos.isBlocked ? "#dc2626" : "#0d9488"} emissiveIntensity={previewPos.isBlocked ? 0.2 : 0.6} transparent={true} opacity={previewPos.isBlocked ? 0.05 : 0.6} />
            </mesh>
          </group>
        )}

        {targetPos && (
          <mesh position={[targetPos.col, 0.1, targetPos.row]}>
            <cylinderGeometry args={[0.6, 0.6, 0.2, 16]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.8} />
          </mesh>
        )}
        
        {Object.entries(truckPositions).map(([id, pos]) => <Truck key={id} id={id} color={truckColors[id]} targetPosition={pos} />)}

        {Object.entries(truckPositions).map(([id, pos]) => {
          if (!pos.path || pos.path.length === 0) return null;
          const points = [new THREE.Vector3(pos.x, 0.1, pos.z), ...pos.path.map(p => new THREE.Vector3(p.col, 0.1, p.row))];
          return <Line key={`path-${id}`} points={points} color={truckColors[id]} lineWidth={3} />;
        })}
        
        <RoutePreview ref={markersGroupRef} manifest={manifest} activeWaypoints={activeWaypoints} overflowQueue={overflowQueue} routes={optimizedRoutes} />
        {buildings.map((b, i) => <Building key={`bldg-${i}`} position={{ x: b.col, z: b.row }} />)}
        {traffic.map((t, i) => <TrafficBlock key={`traffic-${i}`} position={{ x: t.col, z: t.row }} />)}
        
        <OrbitControls target={[12, 0, 12]} />
      </Canvas>
    </div>
  );
});

export default GridMap;