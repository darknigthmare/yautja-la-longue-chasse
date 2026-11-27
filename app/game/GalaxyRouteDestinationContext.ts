"use client";

import { createContext } from "react";

/** System currently being explored on the map, independent of the ship’s location. */
export const GalaxyRouteDestinationContext = createContext<string | null>(null);
