// 3D 场景组合：Canvas 内的全部内容
import { useEcoStore } from '@/store/ecoStore';
import { useSimulationLoop } from '@/hooks/useSimulationLoop';
import { Tank } from './Tank';
import { Lights } from './Lights';
import { Creatures } from './Creatures';
import { CameraRig } from './CameraRig';
import { Effects } from './Effects';

export function Scene() {
  useSimulationLoop();

  const env = useEcoStore((s) => s.env);
  const viewingIndex = useEcoStore((s) => s.viewingIndex);
  const snapshots = useEcoStore((s) => s.snapshots);
  const selectCreature = useEcoStore((s) => s.selectCreature);
  const trackCreature = useEcoStore((s) => s.trackCreature);

  // 回看时使用快照中的环境与生物
  const activeSnapshot = viewingIndex !== null ? snapshots[viewingIndex] ?? null : null;
  const renderEnv = activeSnapshot?.env ?? env;
  const snapshotCreatures = activeSnapshot?.creatures ?? null;

  return (
    <>
      <color attach="background" args={[renderEnv.isNight ? '#0a1426' : '#cfe6e3']} />
      <Lights env={renderEnv} />
      <Tank
        waterTint={renderEnv.waterTint}
        fogTint={renderEnv.fogTint}
        pollution={renderEnv.pollution}
      />
      <Creatures snapshotCreatures={snapshotCreatures} isNight={renderEnv.isNight} />
      <CameraRig />
      <Effects isNight={renderEnv.isNight} />

      {/* 点击空白处取消选中/追踪 */}
      <mesh
        position={[0, -2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onClick={() => {
          selectCreature(null);
          trackCreature(null);
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}
