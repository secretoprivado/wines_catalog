export interface Wine {
  region: string;
  domain: string;
  cuvee: string;
  type: string;
  appellation: string;
  grape: string;
  score: number | null;
  stock: number;
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
