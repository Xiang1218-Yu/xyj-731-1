import { useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEcoStore, TANK_BOUNDS } from '../../store/ecoStore';
import { SceneType } from '../../types';
import type { Organism, EcoTime } from '../../types';
import {
  findBracketingSnapshots,
  interpolateOrganisms,
  interpolateEcoTime
} from '../../utils/snapshotInterpolation';
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
  const viewingTimestamp = useEcoStore(s => s.viewingTimestamp);

  const handleMiss = (e: ClickEvent) => {
    if (viewingTimestamp !== null) return;
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
  const liveEcoTime = useEcoStore(s => s.ecoTime);

  // 回看模式下在两个快照之间插值，实时模式直接使用当前状态
  const { displayOrganisms, displayEcoTime } = useMemo<{
    displayOrganisms: Organism[];
    displayEcoTime: EcoTime;
  }>(() => {
    if (viewingTimestamp !== null && snapshots.length > 0) {
      const { before, after, t } = findBracketingSnapshots(snapshots, viewingTimestamp);
      return {
        displayOrganisms: interpolateOrganisms(before, after, t),
        displayEcoTime: interpolateEcoTime(before, after, t, viewingTimestamp)
      };
    }
    return {
      displayOrganisms: organisms,
      displayEcoTime: liveEcoTime
    };
  }, [viewingTimestamp, snapshots, organisms, liveEcoTime]);

  const isWaterScene =
    currentScene.id === SceneType.FreshwaterLake ||
    currentScene.id === SceneType.PollutedWater;

  return (
    <>
      <SimulationStepper />
      <DayNightCycle overrideEcoTime={viewingTimestamp !== null ? displayEcoTime : undefined} />
      <TrackingCamera />

      <Terrarium isWaterScene={isWaterScene} />
      <SceneClickHandler />

      {displayOrganisms.map(org => (
        <OrganismMesh key={org.id} organism={org} />
      ))}

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={30}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.12}
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
