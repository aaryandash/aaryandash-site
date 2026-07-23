import { useEffect, useState } from 'react';
import { animate } from 'motion';
import { printState, totalLayers } from '../../lib/buildPlate';
import type { PlateProject } from './types';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function PrintReveal({ project }: { project: PlateProject }) {
  const layers = totalLayers(project.heightMm, project.layerHeightMm);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const controls = animate(0, 1, {
      duration: 1.6,
      ease: 'linear',
      onUpdate: (v) => setProgress(v),
    });
    return () => controls.stop();
  }, [project.id]);

  const frame = printState(progress, layers);

  return (
    <figure className="reveal">
      <img
        className="reveal__img"
        src={project.img.src}
        width={project.img.width}
        height={project.img.height}
        alt={project.heroAlt}
        style={{ clipPath: `inset(${frame.clipTop}% 0 0 0)` }}
      />
      {!frame.done && (
        <div className="reveal__nozzle" style={{ top: `${frame.clipTop}%` }} aria-hidden="true" />
      )}
      <figcaption className="reveal__readout">
        LAYER {frame.layer}/{layers}
      </figcaption>
    </figure>
  );
}
