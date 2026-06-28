import * as Location from "expo-location";
import { Platform } from "react-native";

import type { Coordinate } from "../domain/types";
import { BACKGROUND_LOCATION_TASK } from "./backgroundLocationTask";

export const demoCoordinate: Coordinate = {
  lat: 35.681236,
  lng: 139.767125,
  recordedAt: new Date().toISOString()
};

function toCoordinate(location: Location.LocationObject): Coordinate {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracyMeters: location.coords.accuracy ?? undefined,
    altitudeMeters: location.coords.altitude,
    headingDegrees: location.coords.heading,
    speedMetersPerSecond: location.coords.speed,
    recordedAt: new Date(location.timestamp).toISOString()
  };
}

async function ensureForegroundPermission() {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) {
    return;
  }
  const requested = await Location.requestForegroundPermissionsAsync();
  if (!requested.granted) {
    throw new Error("Foreground location permission was denied.");
  }
}

async function ensureBackgroundPermission() {
  if (Platform.OS === "web") {
    throw new Error("Background location is not available on web.");
  }

  await ensureForegroundPermission();
  const current = await Location.getBackgroundPermissionsAsync();
  if (current.granted) {
    return;
  }
  const requested = await Location.requestBackgroundPermissionsAsync();
  if (!requested.granted) {
    throw new Error("Background location permission was denied.");
  }
}

export const locationService = {
  async getCurrentPosition(): Promise<Coordinate> {
    await ensureForegroundPermission();
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation
    });
    return toCoordinate(location);
  },

  async watchPosition(onLocation: (coordinate: Coordinate) => void) {
    await ensureForegroundPermission();
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 10,
        timeInterval: 10000
      },
      (location) => onLocation(toCoordinate(location))
    );
  },

  async isBackgroundTracking() {
    if (Platform.OS === "web") {
      return false;
    }
    return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  },

  async startBackgroundTracking() {
    await ensureBackgroundPermission();
    const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (started) {
      return;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      activityType: Location.ActivityType.Fitness,
      distanceInterval: 10,
      timeInterval: 15000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "GeoAction tracking",
        notificationBody: "Recording route progress for the active action.",
        notificationColor: "#0F766E"
      }
    });
  },

  async stopBackgroundTracking() {
    if (Platform.OS === "web") {
      return;
    }
    const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (started) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  }
};
