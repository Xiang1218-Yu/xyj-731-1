// 后处理：夜间 Bloom 让发光生物柔和发光，配合轻微暗角
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';

interface EffectsProps {
  isNight: boolean;
}

export function Effects({ isNight }: EffectsProps) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={isNight ? 1.1 : 0.35}
        luminanceThreshold={isNight ? 0.15 : 0.55}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.25} darkness={isNight ? 0.85 : 0.55} />
      <SMAA />
    </EffectComposer>
  );
}
