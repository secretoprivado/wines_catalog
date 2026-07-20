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
