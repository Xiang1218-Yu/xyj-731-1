import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEcoStore } from '../../store/ecoStore';

// ============================================================
// 追踪模式相机控制器
// 通过平滑移动 OrbitControls 的 target 来跟随生物，
// 用户仍可自由拖动旋转、缩放视角，不会与控制器冲突。
// ============================================================

// OrbitControls 的最小类型接口（避免依赖 three-stdlib 类型导入）
interface OrbitControlsLike {
  target: THREE.Vector3;
  update: () => void;
}

const FOLLOW_HEIGHT = 0.5;
// target 跟随阻尼
const TARGET_DAMPING = 4.0;
// 首次进入时相机定位阻尼
const INITIAL_DAMPING = 2.5;
// 首次定位时相机与目标的距离
const INITIAL_DISTANCE = 6;

export default function TrackingCamera() {
  const camera = useThree(s => s.camera);
  const controls = useThree(s => s.controls) as OrbitControlsLike | null;
  const trackedOrganismId = useEcoStore(s => s.trackedOrganismId);
  const organisms = useEcoStore(s => s.organisms);

  const smoothedTarget = useRef(new THREE.Vector3(0, 0, 0));
  const justActivated = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (trackedOrganismId) {
      justActivated.current = true;
    }
  }, [trackedOrganismId]);

  // 初始化平滑目标为控制器当前 target
  useEffect(() => {
    if (controls && !initialized.current) {
      smoothedTarget.current.copy(controls.target);
      initialized.current = true;
    }
  }, [controls]);

  useFrame((_state, delta) => {
    if (!trackedOrganismId || !controls) return;

    const trackedOrg = organisms.find(o => o.id === trackedOrganismId);
    if (!trackedOrg || !trackedOrg.alive) return;

    // 理想注视点：生物位置略上方
    const idealTarget = new THREE.Vector3(
      trackedOrg.position[0],
      trackedOrg.position[1] + FOLLOW_HEIGHT,
      trackedOrg.position[2]
    );

    // 首次激活时，将相机平滑移动到生物附近合适的观察位置
    if (justActivated.current) {
      const offset = new THREE.Vector3(3, 2.5, 4)
        .normalize()
        .multiplyScalar(INITIAL_DISTANCE);
      const desiredCamPos = idealTarget.clone().add(offset);
      const camLerp = 1 - Math.exp(-INITIAL_DAMPING * delta);
      camera.position.lerp(desiredCamPos, camLerp);
      // 当相机足够接近目标位置时结束初始定位
      if (camera.position.distanceTo(desiredCamPos) < 0.3) {
        justActivated.current = false;
      }
    }

    // 平滑移动 OrbitControls 的 target 到生物位置
    const targetLerp = 1 - Math.exp(-TARGET_DAMPING * delta);
    smoothedTarget.current.lerp(idealTarget, targetLerp);
    controls.target.copy(smoothedTarget.current);
    controls.update();
  });

  return null;
}
