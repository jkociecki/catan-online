export interface Hex {
  q: number;
  r: number;
  s: number;
}

export enum Resource {
  Desert = 0,
  Wood,
  Clay,
  Stone,
  Wheat,
  Sheep
}
export type Desert = null;
export type Generic = true;
