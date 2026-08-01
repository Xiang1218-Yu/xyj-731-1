// 生物集合：从 store 读取当前应渲染的生物，映射为 CreatureMesh
import { useEcoStore } from '@/store/ecoStore';
import { SPECIES } from '@/simulation/species';
import { CreatureMesh } from './CreatureMesh';
import type { Creature } from '@/simulation/types';

interface CreaturesProps {
  /** 回看时传入快照中的生物；实时为 null */
  snapshotCreatures: Creature[] | null;
  isNight: boolean;
}

export function Creatures({ snapshotCreatures, isNight }: CreaturesProps) {
  const liveCreatures = useEcoStore((s) => s.creatures);
  const selectedId = useEcoStore((s) => s.selectedCreatureId);
  const inspectingId = useEcoStore((s) => s.inspectingCreatureId);
  const trackedSpecies = useEcoStore((s) => s.trackedSpeciesId);
  const hoveredSpecies = useEcoStore((s) => s.hoveredSpeciesId);
  const selectCreature = useEcoStore((s) => s.selectCreature);
  const trackCreature = useEcoStore((s) => s.trackCreature);

  const creatures = snapshotCreatures ?? liveCreatures;
  const activeId = inspectingId ?? selectedId;

  return (
    <group>
      {creatures.map((c) => {
        const species = SPECIES[c.speciesId];
        if (!species) return null;
        const selected = c.id === activeId;
        const highlighted =
          (trackedSpecies !== null && c.speciesId === trackedSpecies) ||
          (hoveredSpecies !== null && c.speciesId === hoveredSpecies);
        return (
          <CreatureMesh
            key={c.id}
            species={species}
            position={c.position}
            heading={c.heading}
            scale={c.scale}
            seed={c.seed}
            phase={c.phase}
            energy={c.energy}
            resting={c.resting}
            isNight={isNight}
            highlighted={highlighted}
            selected={selected}
            onClick={() => {
              selectCreature(c.id);
              trackCreature(c.id);
            }}
          />
        );
      })}
    </group>
  );
}
