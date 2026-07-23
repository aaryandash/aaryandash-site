import type { PlateProject } from './types';

export function SummaryPanel({
  project,
  onClear,
}: {
  project: PlateProject;
  onClear: () => void;
}) {
  return (
    <div className="summary-panel">
      <p className="summary-panel__title">{project.title}</p>
      {project.leadSpec.label && (
        <p className="summary-panel__spec">
          <span>{project.leadSpec.label}</span>
          <span>{project.leadSpec.value}</span>
        </p>
      )}
      <div className="summary-panel__actions">
        <a className="summary-panel__link" href={project.href}>
          Open project sheet →
        </a>
        <button type="button" className="summary-panel__clear" onClick={onClear}>
          Clear plate
        </button>
      </div>
    </div>
  );
}
