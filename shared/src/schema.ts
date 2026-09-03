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
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("boolean") isIt: boolean = false;
  @type("boolean") alive: boolean = true;
  @type("number") facingX: number = 1;
  @type("number") facingY: number = 0;
  @type("string") color: string = "#FFFFFF";
  @type("number") score: number = 0;
  @type("boolean") ready: boolean = false;
  @type("number") activePowerUpType: number = -1;
  @type("number") activePowerUpRemaining: number = 0;
  @type("number") activePowerUpDuration: number = 0;
  @type("number") powerUpCooldown: number = 0;
  @type("number") heldPowerUp: number = -1;
}

export class PowerUpSpawnSchema extends Schema {
  @type("string") id: string = "";
  @type("number") type: number = 0;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") respawnTimer: number = 0;
}

export class StickyPatchSchema extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") remainingMs: number = 0;
}

export class DecoySchema extends Schema {
  @type("string") id: string = "";
  @type("string") ownerId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") remainingMs: number = 0;
}

export class TagRoomStateSchema extends Schema {
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type({ map: PowerUpSpawnSchema }) spawns = new MapSchema<PowerUpSpawnSchema>();
  @type({ map: StickyPatchSchema }) stickyPatches = new MapSchema<StickyPatchSchema>();
  @type({ map: DecoySchema }) decoys = new MapSchema<DecoySchema>();
  @type("string") hostId: string = "";
  @type("boolean") gameStarted: boolean = false;
  @type("number") roundTimeRemaining: number = 0;
  @type("number") roundLength: number = 120;
  @type("string") mapName: string = "arena";
  @type("number") roundLengthNum: number = 120;
  @type("boolean") powerUpsEnabled: boolean = true;
}


