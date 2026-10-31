import { buildScreenAisles } from "./aisles";
import { buildScreenDisplay } from "./display";
import { buildScreenSeating } from "./seating";
import { buildScreenShell } from "./shell";
import type { VenueBuilder } from "../../venue-types";

export function buildScreenOneImax(builder: VenueBuilder) {
  const shell = buildScreenShell(builder);
  buildScreenAisles(builder);
  buildScreenSeating(builder);
  const display = buildScreenDisplay(builder);
  return {
    ...display,
    houseLights: shell.houseLights,
  };
}
