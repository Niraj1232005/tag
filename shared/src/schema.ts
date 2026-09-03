import { Schema, type, MapSchema } from "@colyseus/schema";

export interface IActivePowerUp {
  type: number;
  remainingMs: number;
  durationMs: number;
}

export interface IPowerUpSpawn {
  id: string;
  type: number;
  x: number;
  y: number;
  respawnTimer: number;
}

export interface IStickyPatch {
  id: string;
  x: number;
  y: number;
  remainingMs: number;
}

export interface IDecoy {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  remainingMs: number;
}

export interface IPlayerSchema {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isIt: boolean;
  alive: boolean;
  facingX: number;
  facingY: number;
  color: string;
  score: number;
  ready: boolean;
  activePowerUpType: number;
  activePowerUpRemaining: number;
  activePowerUpDuration: number;
  powerUpCooldown: number;
  heldPowerUp: number;
}

export class PlayerSchema extends Schema {
  id: string = "";
  name: string = "";
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  isIt: boolean = false;
  alive: boolean = true;
  facingX: number = 1;
  facingY: number = 0;
  color: string = "#FFFFFF";
  score: number = 0;
  ready: boolean = false;
  activePowerUpType: number = -1;
  activePowerUpRemaining: number = 0;
  activePowerUpDuration: number = 0;
  powerUpCooldown: number = 0;
  heldPowerUp: number = -1;
}

type("string")(PlayerSchema.prototype, "id");
type("string")(PlayerSchema.prototype, "name");
type("number")(PlayerSchema.prototype, "x");
type("number")(PlayerSchema.prototype, "y");
type("number")(PlayerSchema.prototype, "vx");
type("number")(PlayerSchema.prototype, "vy");
type("boolean")(PlayerSchema.prototype, "isIt");
type("boolean")(PlayerSchema.prototype, "alive");
type("number")(PlayerSchema.prototype, "facingX");
type("number")(PlayerSchema.prototype, "facingY");
type("string")(PlayerSchema.prototype, "color");
type("number")(PlayerSchema.prototype, "score");
type("boolean")(PlayerSchema.prototype, "ready");
type("number")(PlayerSchema.prototype, "activePowerUpType");
type("number")(PlayerSchema.prototype, "activePowerUpRemaining");
type("number")(PlayerSchema.prototype, "activePowerUpDuration");
type("number")(PlayerSchema.prototype, "powerUpCooldown");
type("number")(PlayerSchema.prototype, "heldPowerUp");

export class PowerUpSpawnSchema extends Schema {
  id: string = "";
  type: number = 0;
  x: number = 0;
  y: number = 0;
  respawnTimer: number = 0;
}

type("string")(PowerUpSpawnSchema.prototype, "id");
type("number")(PowerUpSpawnSchema.prototype, "type");
type("number")(PowerUpSpawnSchema.prototype, "x");
type("number")(PowerUpSpawnSchema.prototype, "y");
type("number")(PowerUpSpawnSchema.prototype, "respawnTimer");

export class StickyPatchSchema extends Schema {
  id: string = "";
  x: number = 0;
  y: number = 0;
  remainingMs: number = 0;
}

type("string")(StickyPatchSchema.prototype, "id");
type("number")(StickyPatchSchema.prototype, "x");
type("number")(StickyPatchSchema.prototype, "y");
type("number")(StickyPatchSchema.prototype, "remainingMs");

export class DecoySchema extends Schema {
  id: string = "";
  ownerId: string = "";
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  remainingMs: number = 0;
}

type("string")(DecoySchema.prototype, "id");
type("string")(DecoySchema.prototype, "ownerId");
type("number")(DecoySchema.prototype, "x");
type("number")(DecoySchema.prototype, "y");
type("number")(DecoySchema.prototype, "vx");
type("number")(DecoySchema.prototype, "vy");
type("number")(DecoySchema.prototype, "remainingMs");

export class TagRoomStateSchema extends Schema {
  players = new MapSchema<PlayerSchema>();
  spawns = new MapSchema<PowerUpSpawnSchema>();
  stickyPatches = new MapSchema<StickyPatchSchema>();
  decoys = new MapSchema<DecoySchema>();
  hostId: string = "";
  gameStarted: boolean = false;
  roundTimeRemaining: number = 0;
  roundLength: number = 120;
  mapName: string = "arena";
  roundLengthNum: number = 120;
  powerUpsEnabled: boolean = true;
}

type({ map: PlayerSchema })(TagRoomStateSchema.prototype, "players");
type({ map: PowerUpSpawnSchema })(TagRoomStateSchema.prototype, "spawns");
type({ map: StickyPatchSchema })(TagRoomStateSchema.prototype, "stickyPatches");
type({ map: DecoySchema })(TagRoomStateSchema.prototype, "decoys");
type("string")(TagRoomStateSchema.prototype, "hostId");
type("boolean")(TagRoomStateSchema.prototype, "gameStarted");
type("number")(TagRoomStateSchema.prototype, "roundTimeRemaining");
type("number")(TagRoomStateSchema.prototype, "roundLength");
type("string")(TagRoomStateSchema.prototype, "mapName");
type("number")(TagRoomStateSchema.prototype, "roundLengthNum");
type("boolean")(TagRoomStateSchema.prototype, "powerUpsEnabled");


