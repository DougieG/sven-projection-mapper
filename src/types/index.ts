export type MeshPoint = {
  id: string;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
};

export type Mesh = MeshPoint[];

export type Size = {
  width: number;
  height: number;
};
