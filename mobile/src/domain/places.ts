import type { Coordinate, Place } from "./types";

export function placeCoordinate(place?: Place | null): Coordinate | null {
  if (!place) {
    return null;
  }

  if (place.geometry.type === "circle") {
    return place.geometry.center;
  }

  if (place.geometry.type === "point") {
    return {
      lat: place.geometry.lat,
      lng: place.geometry.lng
    };
  }

  if (place.geometry.type === "polygon" && place.geometry.coordinates.length) {
    const total = place.geometry.coordinates.reduce(
      (sum, coordinate) => ({
        lat: sum.lat + coordinate.lat,
        lng: sum.lng + coordinate.lng
      }),
      { lat: 0, lng: 0 }
    );
    return {
      lat: total.lat / place.geometry.coordinates.length,
      lng: total.lng / place.geometry.coordinates.length
    };
  }

  return null;
}

export function placesById(places: Place[] = []): Record<string, Place> {
  return Object.fromEntries(places.map((place) => [place.id, place]));
}
