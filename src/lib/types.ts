export interface Wine {
  country: string;
  region: string;
  domain: string;
  cuvee: string;
  vintage: string | null;
  appellation: string;
  grape: string;
  type: string;
  aging: string;
  scoreParker: number | null;
  scoreRvf: number | null;
  scoreMichelin: number | null;
  stock: number | null;
  volume: number | null;
  foodPairing: string;
  comment: string;
  price: number | null;
}

export interface RegionGroup {
  region: string;
  wines: Wine[];
}

export interface CountryGroup {
  country: string;
  regions: RegionGroup[];
}

export interface CatalogData {
  wines: Wine[];
  countries: CountryGroup[];
  totalCount: number;
}

export interface Spirit {
  alcoholType: string;
  category: string;
  origin: string;
  distillery: string;
  label: string;
  abv: number | null;
  volume: number | null;
  rawMaterial: string;
  aging: string;
  ppm: string;
  foodPairing: string;
  vintage: string | null;
  price: number | null;
  comment: string;
  stock: number | null;
}

export interface SpiritCategoryGroup {
  category: string;
  spirits: Spirit[];
}

export interface SpiritTypeGroup {
  alcoholType: string;
  categories: SpiritCategoryGroup[];
}

export interface SpiritsCatalogData {
  spirits: Spirit[];
  types: SpiritTypeGroup[];
  totalCount: number;
}
