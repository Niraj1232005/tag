import { useEffect, useRef, useCallback } from "react";

export type KeyState = Record<string, boolean>;

const PLAYER_KEYS = [
  { up: "w", down: "s", left: "a", right: "d", usePowerUp: "e" },
  { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", usePowerUp: "Enter" },
  { up: "t", down: "g", left: "f", right: "h", usePowerUp: "r" },
  { up: "8", down: "5", left: "4", right: "6", usePowerUp: "0" },
];

export function useLocalInputs(numPlayers: number) {
  const keysRef = useRef<KeyState>({});
  const inputsRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean; usePowerUp: boolean }[]>(
    Array.from({ length: 4 }, () => ({ up: false, down: false, left: false, right: false, usePowerUp: false }))
  );

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  const getInputs = useCallback(() => {
    const keys = keysRef.current;
    const count = Math.min(numPlayers, 4);
    for (let i = 0; i < count; i++) {
      const pk = PLAYER_KEYS[i];
      inputsRef.current[i] = {
        up: !!keys[pk.up],
        down: !!keys[pk.down],
        left: !!keys[pk.left],
        right: !!keys[pk.right],
        usePowerUp: !!keys[pk.usePowerUp],
      };
      // Reset usePowerUp so it's one-shot
      keys[pk.usePowerUp] = false;
    }
    return inputsRef.current;
  }, [numPlayers]);

  return getInputs;
}

export const KEY_BINDINGS = [
  { label: "WASD + E", keys: "W A S D (move) + E (power-up)" },
  { label: "Arrows + Enter", keys: "Arrow Keys (move) + Enter (power-up)" },
  { label: "TFGH + R", keys: "T F G H (move) + R (power-up)" },
  { label: "Numpad + 0", keys: "Numpad 8/4/6/5 (move) + 0 (power-up)" },
];
