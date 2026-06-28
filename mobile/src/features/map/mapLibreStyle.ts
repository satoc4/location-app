import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";

export const mapLibreStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors"
    }
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm"
    }
  ]
};

export const fallbackCoordinate = {
  lat: 35.681236,
  lng: 139.767125
};

export const pinColors = {
  completed: "#15803D",
  current: "#0EA5E9",
  destination: "#B45309",
  next: "#BE123C"
};
