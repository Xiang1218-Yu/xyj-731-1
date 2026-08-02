import { useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEcoStore, TANK_BOUNDS } from '../../store/ecoStore';
import { SceneType } from '../../types';
import type { Organism, Snapshot } from '../../types';
import Terrarium from './Terrarium';
import OrganismMesh from './OrganismMesh';
import DayNightCycle from './DayNightCycle';
import TrackingCamera from './TrackingCamera';

// ============================================================
// 仿真步进器：在每帧调用 store.tick
// ============================================================
function SimulationStepper() {
  const tick = useEcoStore(s => s.tick);
  const viewingTimestamp = useEcoStore(s => s.viewingTimestamp);

  useFrame((_, delta) => {
    if (viewingTimestamp === null) {
      tick(Math.min(delta, 0.1));
    }
  });

  return null;
}

// ============================================================
// 点击空白处取消追踪 / 放置生物
// ============================================================
interface ClickEvent {
  stopPropagation: () => void;
  point: THREE.Vector3;
}

function SceneClickHandler() {
  const pendingPlacementSpeciesId = useEcoStore(s => s.pendingPlacementSpeciesId);
  const addOrganism = useEcoStore(s => s.addOrganism);
  const setPendingPlacement = useEcoStore(s => s.setPendingPlacement);
  const setTrackedOrganism = useEcoStore(s => s.setTrackedOrganism);
  const setHighlightedSpecies = useEcoStore(s => s.setHighlightedSpecies);

  const handleMiss = (e: ClickEvent) => {
    if (pendingPlacementSpeciesId) {
      const point = e.point;
      const x = Math.max(-TANK_BOUNDS.x + 0.5, Math.min(TANK_BOUNDS.x - 0.5, point.x));
      const y = Math.max(-TANK_BOUNDS.y + 0.5, Math.min(TANK_BOUNDS.y - 0.5, point.y));
      const z = Math.max(-TANK_BOUNDS.z + 0.5, Math.min(TANK_BOUNDS.z - 0.5, point.z));
      addOrganism(pendingPlacementSpeciesId, [x, y, z]);
      setPendingPlacement(null);
    } else {
      setTrackedOrganism(null);
      setHighlightedSpecies(null);
    }
  };

  return (
    <mesh
      position={[0, -TANK_BOUNDS.y + 0.05, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleMiss}
      visible={false}
    >
      <planeGeometry args={[TANK_BOUNDS.x * 2, TANK_BOUNDS.z * 2]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// ============================================================
// 3D场景内容
// ============================================================
function SceneContent() {
  const organisms = useEcoStore(s => s.organisms);
  const currentScene = useEcoStore(s => s.currentScene);
  const viewingTimestamp = useEcoStore(s => s.viewingTimestamp);
  const snapshots = useEcoStore(s => s.snapshots);

  const displayOrganisms = useMemo<Organism[]>(() => {
    if (viewingTimestamp !== null) {
      const closest = snapshots.reduce<Snapshot | null>((acc, snap) => {
        if (!acc) return snap;
        return Math.abs(snap.timestamp - viewingTimestamp) <
          Math.abs(acc.timestamp - viewingTimestamp)
          ? snap
          : acc;
      }, null);
      return closest?.organisms ?? [];
    }
    return organisms;
  }, [viewingTimestamp, snapshots, organisms]);

  const isWaterScene =
    currentScene.id === SceneType.FreshwaterLake ||
    currentScene.id === SceneType.PollutedWater;

  return (
    <>
      <SimulationStepper />
      <DayNightCycle />
      <TrackingCamera />

      <Terrarium isWaterScene={isWaterScene} />
      <SceneClickHandler />

      {displayOrganisms.map(org => (
        <OrganismMesh key={org.id} organism={org} />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={30}
        target={[0, 0, 0]}
      />
    </>
  );
}

// ============================================================
// 主3D场景 Canvas 包装
// ============================================================
export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [10, 7, 12], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <SceneContent />
    </Canvas>
  );
}
