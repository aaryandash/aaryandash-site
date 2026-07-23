import type { PlateProject } from './types';

export function PartsList({ projects }: { projects: PlateProject[] }) {
  return (
    <div className="parts-list">
      <p className="parts-list__caption">
        View the desktop site to "print" projects!
      </p>
      <ul className="shelf shelf--list">
        {projects.map((p) => (
          <li key={p.id}>
            <a className="part-chip" href={p.href}>
              <img
                src={p.img.src}
                width={p.img.width}
                height={p.img.height}
                alt={p.heroAlt}
                loading="lazy"
              />
              <span className="part-chip__season">{p.season}</span>
              <span className="part-chip__title">{p.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
