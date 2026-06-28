import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { appendTrackedLocations } from "./locationQueue";

export const BACKGROUND_LOCATION_TASK = "geoaction-background-location";

if (Platform.OS !== "web") {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.warn("Background location task failed", error);
      return;
    }

    const payload = data as { locations?: Location.LocationObject[] };
    const locations = payload.locations ?? [];
    if (!locations.length) {
      return;
    }

    await appendTrackedLocations(
      locations.map((location) => ({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracyMeters: location.coords.accuracy ?? undefined,
        altitudeMeters: location.coords.altitude,
        headingDegrees: location.coords.heading,
        speedMetersPerSecond: location.coords.speed,
        recordedAt: new Date(location.timestamp).toISOString(),
        source: "background"
      }))
    );
  });
}
