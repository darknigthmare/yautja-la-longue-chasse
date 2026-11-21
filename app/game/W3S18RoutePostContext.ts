"use client";

import { createContext } from "react";
import type { SpaceRoutesResultV159 } from "./systems/spaceRoutesV159";
import type { W3S18RoutePost } from "./systems/w3S18RoutePost";

type ConfirmedRoutePost = (operation: (post: W3S18RoutePost) => SpaceRoutesResultV159) => Promise<SpaceRoutesResultV159>;

export const W3S18RoutePostContext = createContext<ConfirmedRoutePost | null>(null);
