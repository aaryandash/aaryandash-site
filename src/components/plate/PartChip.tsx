import { useDraggable } from '@dnd-kit/core';
import type { PlateProject } from './types';

interface Props {
  project: PlateProject;
  dragEnabled: boolean;
}

export function PartChip({ project, dragEnabled }: Props) {
  const { setNodeRef, listeners, transform, isDragging } = useDraggable({
    id: project.id,
    disabled: !dragEnabled,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
    : undefined;

  return (
    <a
      ref={setNodeRef}
      href={project.href}
      className="part-chip"
      data-dragging={isDragging || undefined}
      style={style}
      {...(dragEnabled ? listeners : {})}
    >
      <img
        src={project.img.src}
        width={project.img.width}
        height={project.img.height}
        alt={project.heroAlt}
        loading="lazy"
      />
      <span className="part-chip__season">{project.season}</span>
      <span className="part-chip__title">{project.title}</span>
    </a>
  );
}
