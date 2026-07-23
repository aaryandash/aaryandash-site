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
import { EmptyBay } from './EmptyBay';
import { Plate } from './Plate';
import type { PlateProject } from './types';

interface Props {
  projects: PlateProject[];
  bays: number;
}

export default function BuildPlate({ projects, bays }: Props) {
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

  const bin = (
    <ul className="bin">
      {projects.map((p) => (
        <li key={p.id}>
          <PartChip project={p} dragEnabled={dragEnabled} />
        </li>
      ))}
      {Array.from({ length: bays }).map((_, i) => (
        <li key={`bay-${i}`}>
          <EmptyBay />
        </li>
      ))}
    </ul>
  );

  // Coarse pointer (touch) and the pre-mount server render: plain grid, no plate.
  if (!dragEnabled) {
    return <div className="build-plate build-plate--grid">{bin}</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={onDragEnd}
    >
      <div className="build-plate">
        <div className="build-plate__bin">{bin}</div>
        <Plate loaded={loaded} done={done} onDone={() => setDone(true)} />
      </div>
    </DndContext>
  );
}
