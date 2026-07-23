export interface ImageAsset {
  src: string;
  width: number;
  height: number;
}

export interface PlateProject {
  id: string;
  title: string;
  season: string;
  href: string;
  heroAlt: string;
  /** Hero render — the shelf card thumbnail. */
  img: ImageAsset;
  /** Transparent print image — the plate reveal. */
  print: ImageAsset;
  leadSpec: { label: string; value: string };
  heightMm: number;
  layerHeightMm: number;
}
