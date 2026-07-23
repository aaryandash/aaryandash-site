import type { PlateProject } from './types';

export function SummaryPanel({ project }: { project: PlateProject }) {
  return (
    <div className="summary-panel">
      <p className="summary-panel__title">{project.title}</p>
      {project.leadSpec.label && (
        <p className="summary-panel__spec">
          <span>{project.leadSpec.label}</span>
          <span>{project.leadSpec.value}</span>
        </p>
      )}
      <a className="summary-panel__link" href={project.href}>
        Open project sheet →
      </a>
    </div>
  );
}
