"use client";
/** V146: the player's clan palette, read by Homeworld NPCs of the player's clan. */
import { createContext } from "react";
import type { ClanPaletteV146 } from "./systems/hunterCustomizationV146";

export const ClanPaletteContextV146 = createContext<ClanPaletteV146 | null>(null);
