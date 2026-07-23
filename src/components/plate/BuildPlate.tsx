import './plate.css';
import { PartChip } from './PartChip';
import { EmptyBay } from './EmptyBay';
import type { PlateProject } from './types';

interface Props {
  projects: PlateProject[];
  bays: number;
}

export default function BuildPlate({ projects, bays }: Props) {
  return (
    <div className="build-plate build-plate--grid">
      <ul className="bin">
        {projects.map((p) => (
          <li key={p.id}>
            <PartChip project={p} dragEnabled={false} />
          </li>
        ))}
        {Array.from({ length: bays }).map((_, i) => (
          <li key={`bay-${i}`}>
            <EmptyBay />
          </li>
        ))}
      </ul>
    </div>
  );
}
