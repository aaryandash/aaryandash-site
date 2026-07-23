import { useEffect, useState } from 'react';
import { animate } from 'motion';
import { printState, totalLayers, toolheadSweep } from '../../lib/buildPlate';
import { rowSpans, spanAtY, type RowSpan } from '../../lib/silhouette';
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
  // Per-row opaque span of the transparent print image, so the head sweeps only
  // over the object at each height. Empty until measured → full-width fallback.
  const [spans, setSpans] = useState<RowSpan[]>([]);

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

  // Measure the object's silhouette from the transparent image's alpha channel.
  useEffect(() => {
    setSpans([]);
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const scale = Math.min(1, 240 / img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const { data } = ctx.getImageData(0, 0, w, h);
        setSpans(rowSpans(data, w, h));
      } catch {
        // Tainted canvas (shouldn't happen for same-origin assets) → full sweep.
      }
    };
    img.src = project.print.src;
    return () => {
      cancelled = true;
    };
  }, [project.print.src]);

  const frame = printState(progress, layers);
  const elapsedMs = progress * DURATION_MS;
  const sweep = toolheadSweep(elapsedMs, SWEEP_PERIOD_MS); // 0..1
  // The deposition edge sits at clipTop% down the image; sweep only across the
  // object's width at that height.
  const [xMin, xMax] = spanAtY(spans, frame.clipTop / 100);
  const headX = xMin + sweep * (xMax - xMin);

  return (
    <div className="reveal">
      <div className="reveal__stage">
        <div
          className="reveal__frame"
          style={{ aspectRatio: `${project.print.width} / ${project.print.height}` }}
        >
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
              style={{ top: `${frame.clipTop}%`, left: `${headX * 100}%` }}
            />
          )}
        </div>
      </div>
      <ProgressBar progress={progress} layer={frame.layer} layers={layers} />
    </div>
  );
}
