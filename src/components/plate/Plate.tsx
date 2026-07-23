import { useDroppable } from '@dnd-kit/core';
import { PrintReveal } from './PrintReveal';
import type { ImageAsset, PlateProject } from './types';

interface Props {
  loaded: PlateProject | null;
  plate: ImageAsset;
  toolhead: ImageAsset;
  done: boolean;
  onDone: () => void;
  onClear: () => void;
}

// Percent inset of the printable area within the plate image (excludes the
// top tab and bottom label strip). Tuned visually.
export const BUILD_AREA = { top: 15, right: 13, bottom: 13, left: 13 };

export function Plate({ loaded, plate, toolhead, onDone }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'build-plate' });

  return (
    <div className="bed-wrap">
      <div ref={setNodeRef} className="bed" data-over={isOver || undefined}>
        <img
          className="bed__plate"
          src={plate.src}
          width={plate.width}
          height={plate.height}
          alt=""
          aria-hidden="true"
        />
        <div
          className="bed__area"
          style={{
            top: `${BUILD_AREA.top}%`,
            right: `${BUILD_AREA.right}%`,
            bottom: `${BUILD_AREA.bottom}%`,
            left: `${BUILD_AREA.left}%`,
          }}
        >
          {loaded ? (
            <PrintReveal project={loaded} toolhead={toolhead} onDone={onDone} />
          ) : (
            <p className="bed__hint">Drop a part here</p>
          )}
        </div>
      </div>
    </div>
  );
}
