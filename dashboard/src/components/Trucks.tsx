"use client";

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface TruckState {
  id: string;
  currentRow: number;
  currentCol: number;
  isMoving: boolean;
  currentLoadFactor: number;
}

interface TruckProps {
  state: TruckState;
}

const OFFSET = 12;

function Truck({ state }: TruckProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Determine target position based on Grid size
  const targetX = state.currentCol - OFFSET;
  const targetZ = state.currentRow - OFFSET;
  const targetY = 1.0; 

  const color = 
    state.id === 'BLUE' ? '#0088ff' : 
    state.id === 'GREEN' ? '#00ff44' : 
    state.id === 'YELLOW' ? '#ffcc00' : '#ffffff';

  // Smooth movement
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
   
    const lerpFactor = 5.0 * delta; 
    
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, lerpFactor);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, lerpFactor);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, lerpFactor);

    // Pulse emissive when moving, or steady when stopped
    const emissiveInt = state.isMoving ? 1.0 + Math.sin(Date.now() / 150) * 0.5 : 0.5;
    (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveInt;
  });

  return (
    <mesh ref={meshRef} position={[targetX, targetY, targetZ]}>
      {/* Sleek Truck Geometry - simple box for now, maybe add a cockpit later */}
      <boxGeometry args={[0.6, 0.8, 0.6]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color}
      />
    </mesh>
  );
}

export function Trucks({ positions }: { positions: TruckState[] }) {
  return (
    <group>
      {positions.map((truck) => (
        <Truck key={truck.id} state={truck} />
      ))}
    </group>
  );
}
