interface Props {
  progress: number; // 0..1
  layer: number;
  layers: number;
}

export function ProgressBar({ progress, layer, layers }: Props) {
  const pct = Math.round(progress * 100);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Print progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress__label">
        {pct}% · layer {layer}/{layers}
      </span>
    </div>
  );
}
