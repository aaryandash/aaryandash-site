import { useDroppable } from '@dnd-kit/core';
import type { PlateProject } from './types';

interface Props {
  loaded: PlateProject | null;
}

export function Plate({ loaded }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'build-plate' });

  return (
    <div ref={setNodeRef} className="plate" data-over={isOver || undefined}>
      {loaded ? (
        <img
          className="plate__render"
          src={loaded.img.src}
          width={loaded.img.width}
          height={loaded.img.height}
          alt={loaded.heroAlt}
        />
      ) : (
        <p className="plate__hint">Drag a part onto the plate</p>
      )}
    </div>
  );
}
