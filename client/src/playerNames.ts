export const PREDEFINED_PLAYER_NAMES = [
  "Dash",
  "Blitz",
  "Rocket",
  "Ninja",
  "Comet",
  "Flash",
  "Bolt",
  "Chaser",
  "Runner",
  "Shadow",
  "Swift",
  "Turbo",
  "Jumper",
  "Pixel",
  "Orbit",
  "Zippy",
  "Racer",
  "Phantom",
  "Sparky",
  "Maverick",
];

export function randomPlayerName() {
  return PREDEFINED_PLAYER_NAMES[Math.floor(Math.random() * PREDEFINED_PLAYER_NAMES.length)];
}
