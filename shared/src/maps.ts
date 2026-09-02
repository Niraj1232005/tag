import type { GameMap, Obstacle, Vec2 } from "./types.js";

const FIELD_W = 1600;
const FIELD_H = 900;

const outerWalls: Obstacle[] = [
  { x: 0, y: 0, w: FIELD_W, h: 16 },
  { x: 0, y: FIELD_H - 16, w: FIELD_W, h: 16 },
  { x: 0, y: 0, w: 16, h: FIELD_H },
  { x: FIELD_W - 16, y: 0, w: 16, h: FIELD_H },
];

function centerBox(): Obstacle {
  const w = 200, h = 140;
  return { x: (FIELD_W - w) / 2, y: (FIELD_H - h) / 2, w, h };
}

function pillars(): Obstacle[] {
  const size = 60;
  const positions: Vec2[] = [
    { x: 300, y: 250 },
    { x: FIELD_W - 300 - size, y: 250 },
    { x: 300, y: FIELD_H - 250 - size },
    { x: FIELD_W - 300 - size, y: FIELD_H - 250 - size },
  ];
  return positions.map(p => ({ x: p.x, y: p.y, w: size, h: size }));
}

function walls(): Obstacle[] {
  return [
    { x: 200, y: 100, w: 16, h: 200 },
    { x: FIELD_W - 200 - 16, y: 100, w: 16, h: 200 },
    { x: 200, y: FIELD_H - 100 - 200, w: 16, h: 200 },
    { x: FIELD_W - 200 - 16, y: FIELD_H - 100 - 200, w: 16, h: 200 },
    { x: 400, y: 400, w: 160, h: 16 },
    { x: FIELD_W - 400 - 160, y: 400, w: 160, h: 16 },
    { x: 400, y: FIELD_H - 400 - 16, w: 160, h: 16 },
    { x: FIELD_W - 400 - 160, y: FIELD_H - 400 - 16, w: 160, h: 16 },
  ];
}

export const ARENA_MAP: GameMap = {
  name: "Arena",
  width: FIELD_W,
  height: FIELD_H,
  obstacles: [...outerWalls, centerBox(), ...pillars(), ...walls()],
  spawnPoints: [
    { x: 200, y: 200 },
    { x: FIELD_W - 200, y: 200 },
    { x: 200, y: FIELD_H - 200 },
    { x: FIELD_W - 200, y: FIELD_H - 200 },
    { x: FIELD_W / 2, y: 150 },
    { x: FIELD_W / 2, y: FIELD_H - 150 },
    { x: 150, y: FIELD_H / 2 },
    { x: FIELD_W - 150, y: FIELD_H / 2 },
    { x: FIELD_W / 2 - 100, y: FIELD_H / 2 },
    { x: FIELD_W / 2 + 100, y: FIELD_H / 2 },
    { x: FIELD_W / 4, y: FIELD_H / 4 },
    { x: (FIELD_W * 3) / 4, y: FIELD_H / 4 },
    { x: FIELD_W / 4, y: (FIELD_H * 3) / 4 },
  ],
  powerUpSpawns: [
    { x: FIELD_W / 2, y: 200 },
    { x: FIELD_W / 2, y: FIELD_H - 200 },
    { x: 200, y: FIELD_H / 2 },
    { x: FIELD_W - 200, y: FIELD_H / 2 },
    { x: FIELD_W / 2 - 200, y: FIELD_H / 2 },
    { x: FIELD_W / 2 + 200, y: FIELD_H / 2 },
    { x: FIELD_W / 4, y: FIELD_H / 2 },
    { x: (FIELD_W * 3) / 4, y: FIELD_H / 2 },
  ],
};

const SMALL_W = 1000;
const SMALL_H = 600;

const smallOuterWalls: Obstacle[] = [
  { x: 0, y: 0, w: SMALL_W, h: 12 },
  { x: 0, y: SMALL_H - 12, w: SMALL_W, h: 12 },
  { x: 0, y: 0, w: 12, h: SMALL_H },
  { x: SMALL_W - 12, y: 0, w: 12, h: SMALL_H },
];

function smallCenterBox(): Obstacle {
  const w = 140, h = 100;
  return { x: (SMALL_W - w) / 2, y: (SMALL_H - h) / 2, w, h };
}

function smallPillars(): Obstacle[] {
  const size = 50;
  const positions: Vec2[] = [
    { x: 200, y: 150 },
    { x: SMALL_W - 200 - size, y: 150 },
    { x: 200, y: SMALL_H - 150 - size },
    { x: SMALL_W - 200 - size, y: SMALL_H - 150 - size },
  ];
  return positions.map(p => ({ x: p.x, y: p.y, w: size, h: size }));
}

function smallWalls(): Obstacle[] {
  return [
    { x: 150, y: 80, w: 12, h: 160 },
    { x: SMALL_W - 150 - 12, y: 80, w: 12, h: 160 },
    { x: 150, y: SMALL_H - 80 - 160, w: 12, h: 160 },
    { x: SMALL_W - 150 - 12, y: SMALL_H - 80 - 160, w: 12, h: 160 },
  ];
}

export const SMALL_ARENA: GameMap = {
  name: "Small Arena",
  width: SMALL_W,
  height: SMALL_H,
  obstacles: [...smallOuterWalls, smallCenterBox(), ...smallPillars(), ...smallWalls()],
  spawnPoints: [
    { x: 120, y: 120 },
    { x: SMALL_W - 120, y: 120 },
    { x: 120, y: SMALL_H - 120 },
    { x: SMALL_W - 120, y: SMALL_H - 120 },
    { x: SMALL_W / 2, y: 100 },
    { x: SMALL_W / 2, y: SMALL_H - 100 },
    { x: 100, y: SMALL_H / 2 },
    { x: SMALL_W - 100, y: SMALL_H / 2 },
    { x: SMALL_W / 2 - 80, y: SMALL_H / 2 },
    { x: SMALL_W / 2 + 80, y: SMALL_H / 2 },
    { x: SMALL_W / 3, y: SMALL_H / 3 },
    { x: (SMALL_W * 2) / 3, y: SMALL_H / 3 },
    { x: SMALL_W / 3, y: (SMALL_H * 2) / 3 },
  ],
  powerUpSpawns: [
    { x: SMALL_W / 2, y: 120 },
    { x: SMALL_W / 2, y: SMALL_H - 120 },
    { x: 120, y: SMALL_H / 2 },
    { x: SMALL_W - 120, y: SMALL_H / 2 },
    { x: SMALL_W / 2 - 150, y: SMALL_H / 2 },
    { x: SMALL_W / 2 + 150, y: SMALL_H / 2 },
  ],
};

const OPEN_W = 1200;
const OPEN_H = 800;

const openOuterWalls: Obstacle[] = [
  { x: 0, y: 0, w: OPEN_W, h: 14 },
  { x: 0, y: OPEN_H - 14, w: OPEN_W, h: 14 },
  { x: 0, y: 0, w: 14, h: OPEN_H },
  { x: OPEN_W - 14, y: 0, w: 14, h: OPEN_H },
];

function openScattered(): Obstacle[] {
  return [
    { x: 200, y: 200, w: 80, h: 40 },
    { x: OPEN_W - 280, y: 200, w: 80, h: 40 },
    { x: 200, y: OPEN_H - 240, w: 80, h: 40 },
    { x: OPEN_W - 280, y: OPEN_H - 240, w: 80, h: 40 },
    { x: OPEN_W / 2 - 40, y: 250, w: 80, h: 30 },
    { x: OPEN_W / 2 - 40, y: OPEN_H - 280, w: 80, h: 30 },
  ];
}

export const OPEN_FIELD: GameMap = {
  name: "Open Field",
  width: OPEN_W,
  height: OPEN_H,
  obstacles: [...openOuterWalls, ...openScattered()],
  spawnPoints: [
    { x: 150, y: 150 },
    { x: OPEN_W - 150, y: 150 },
    { x: 150, y: OPEN_H - 150 },
    { x: OPEN_W - 150, y: OPEN_H - 150 },
    { x: OPEN_W / 2, y: 120 },
    { x: OPEN_W / 2, y: OPEN_H - 120 },
    { x: 120, y: OPEN_H / 2 },
    { x: OPEN_W - 120, y: OPEN_H / 2 },
    { x: OPEN_W / 2 - 100, y: OPEN_H / 2 },
    { x: OPEN_W / 2 + 100, y: OPEN_H / 2 },
    { x: OPEN_W / 4, y: OPEN_H / 4 },
    { x: (OPEN_W * 3) / 4, y: OPEN_H / 4 },
    { x: OPEN_W / 4, y: (OPEN_H * 3) / 4 },
  ],
  powerUpSpawns: [
    { x: OPEN_W / 2, y: 150 },
    { x: OPEN_W / 2, y: OPEN_H - 150 },
    { x: 150, y: OPEN_H / 2 },
    { x: OPEN_W - 150, y: OPEN_H / 2 },
    { x: OPEN_W / 2 - 200, y: OPEN_H / 2 },
    { x: OPEN_W / 2 + 200, y: OPEN_H / 2 },
  ],
};

export const MAPS: Record<string, GameMap> = {
  arena: ARENA_MAP,
  small_arena: SMALL_ARENA,
  open_field: OPEN_FIELD,
};

export const MAP_NAMES: Record<string, string> = {
  arena: "Arena",
  small_arena: "Small Arena",
  open_field: "Open Field",
};
