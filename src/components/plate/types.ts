export interface PlateProject {
  id: string;
  title: string;
  season: string;
  href: string;
  heroAlt: string;
  img: { src: string; width: number; height: number };
  leadSpec: { label: string; value: string };
  heightMm: number;
  layerHeightMm: number;
}
