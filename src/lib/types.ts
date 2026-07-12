export interface Wine {
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
  stock: number | null;
  foodPairing: string;
  price: number | null;
}

export interface RegionGroup {
  region: string;
  wines: Wine[];
}

export interface CatalogData {
  wines: Wine[];
  regions: RegionGroup[];
  totalCount: number;
}
