import { useStore } from '../state/store';
import { SPECIES_CATALOG, ALL_SPECIES_IDS } from '../domain/species';
import type { TrophicRole } from '../domain/types';

/** 营养级中文标签 */
const ROLE_LABEL: Record<TrophicRole, string> = {
  producer: '生产者',
  herbivore: '初级消费者',
  carnivore: '肉食消费者',
  omnivore: '杂食者',
  decomposer: '分解者',
};

/**
 * 物种投放面板：点击即可在缸内随机位置投放一个该物种个体。
 * 按营养级分组展示，便于教学理解。
 */
export function SpeciesPalette(): JSX.Element {
  const addOrganism = useStore((s) => s.addOrganism);

  // 按营养级分组
  const groups = ALL_SPECIES_IDS.reduce<Record<TrophicRole, string[]>>(
    (acc, id) => {
      const role = SPECIES_CATALOG[id].role;
      acc[role] = acc[role] ?? [];
      acc[role].push(id);
      return acc;
    },
    {
      producer: [],
      herbivore: [],
      carnivore: [],
      omnivore: [],
      decomposer: [],
    },
  );

  return (
    <div className="panel species-palette">
      <h2 className="panel-title">➕ 投放物种</h2>
      {(Object.keys(groups) as TrophicRole[]).map((role) =>
        groups[role].length === 0 ? null : (
          <div key={role} className="species-group">
            <div className="species-group-label">{ROLE_LABEL[role]}</div>
            <div className="species-buttons">
              {groups[role].map((id) => {
                const s = SPECIES_CATALOG[id];
                return (
                  <button
                    key={id}
                    className="species-chip"
                    style={{ borderColor: s.color }}
                    onClick={() => addOrganism(id)}
                    title={s.description}
                  >
                    <span className="chip-icon">{s.icon}</span>
                    <span className="chip-name">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
