import { useDroppable } from '@dnd-kit/core';
import { PrintReveal } from './PrintReveal';
import type { PlateProject } from './types';

interface Props {
  loaded: PlateProject | null;
}

export function Plate({ loaded }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'build-plate' });

  return (
    <div ref={setNodeRef} className="plate" data-over={isOver || undefined}>
      {loaded ? (
        <PrintReveal project={loaded} />
      ) : (
        <p className="plate__hint">Drag a part onto the plate</p>
      )}
    </div>
  );
}
