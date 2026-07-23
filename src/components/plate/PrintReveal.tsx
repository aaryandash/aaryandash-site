import { useEffect, useState } from 'react';
import { animate } from 'motion';
import { printState, totalLayers, toolheadSweep } from '../../lib/buildPlate';
import { ProgressBar } from './ProgressBar';
import type { ImageAsset, PlateProject } from './types';

const DURATION_MS = 2800;
/** Milliseconds for one full left→right→left toolhead pass. Higher = calmer. */
const SWEEP_PERIOD_MS = 900;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function PrintReveal({
  project,
  toolhead,
  onDone,
}: {
  project: PlateProject;
  toolhead: ImageAsset;
  onDone: () => void;
}) {
  const layers = totalLayers(project.heightMm, project.layerHeightMm);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      onDone();
      return;
    }
    setProgress(0);
    const controls = animate(0, 1, {
      duration: DURATION_MS / 1000,
      ease: 'linear',
      onUpdate: (v) => setProgress(v),
      onComplete: () => onDone(),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const frame = printState(progress, layers);
  const elapsedMs = progress * DURATION_MS;
  const sweep = toolheadSweep(elapsedMs, SWEEP_PERIOD_MS); // 0..1 across the build width

  return (
    <div className="reveal">
      <div className="reveal__stage">
        <img
          className="reveal__part"
          src={project.print.src}
          alt={project.heroAlt}
          style={{ clipPath: `inset(${frame.clipTop}% 0 0 0)` }}
        />
        {!frame.done && (
          <img
            className="reveal__toolhead"
            src={toolhead.src}
            alt=""
            aria-hidden="true"
            style={{
              top: `${frame.clipTop}%`,
              left: `${sweep * 100}%`,
            }}
          />
        )}
      </div>
      <ProgressBar progress={progress} layer={frame.layer} layers={layers} />
    </div>
  );
}
