import './plate.css';
import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { PartChip } from './PartChip';
import { Plate } from './Plate';
import { PartsList } from './PartsList';
import type { ImageAsset, PlateProject } from './types';

interface Props {
  projects: PlateProject[];
  plate: ImageAsset;
  toolhead: ImageAsset;
}

export default function BuildPlate({ projects, plate, toolhead }: Props) {
  const [dragEnabled, setDragEnabled] = useState(false);
  const [loaded, setLoaded] = useState<PlateProject | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDragEnabled(window.matchMedia('(pointer: fine)').matches);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    if (event.over?.id === 'build-plate') {
      const dropped = projects.find((p) => p.id === event.active.id);
      if (dropped) {
        setDone(false);
        setLoaded(dropped);
      }
    }
  }

  // Coarse pointer (touch) and the pre-mount server render: tappable list.
  if (!dragEnabled) {
    return <PartsList projects={projects} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={onDragEnd}
    >
      <p className="bench__hint">
        Drag a part onto the plate and print it to open the write-up.
      </p>
      <div className="bench">
        <ul className="shelf">
          {projects.map((p) => (
            <li key={p.id}>
              <PartChip project={p} dragEnabled={dragEnabled} />
            </li>
          ))}
        </ul>
        <Plate
          loaded={loaded}
          plate={plate}
          toolhead={toolhead}
          done={done}
          onDone={() => setDone(true)}
          onClear={() => {
            setLoaded(null);
            setDone(false);
          }}
        />
      </div>
    </DndContext>
  );
}
