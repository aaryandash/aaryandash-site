import { useDroppable } from '@dnd-kit/core';
import { PrintReveal } from './PrintReveal';
import { SummaryPanel } from './SummaryPanel';
import type { PlateProject } from './types';

interface Props {
  loaded: PlateProject | null;
  done: boolean;
  onDone: () => void;
}

export function Plate({ loaded, done, onDone }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'build-plate' });

  return (
    <div ref={setNodeRef} className="plate" data-over={isOver || undefined}>
      {loaded ? (
        <>
          <PrintReveal project={loaded} onDone={onDone} />
          {done && <SummaryPanel project={loaded} />}
        </>
      ) : (
        <p className="plate__hint">Drag a part onto the plate</p>
      )}
    </div>
  );
}
