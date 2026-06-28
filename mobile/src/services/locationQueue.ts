import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TrackedLocation, VerificationEventPayload } from "../domain/types";

const QUEUE_KEY = "geoaction.locationQueue.v1";

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function readQueuedLocations(): Promise<TrackedLocation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrackedLocation[]) : [];
  } catch {
    return [];
  }
}

export async function replaceQueuedLocations(locations: TrackedLocation[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(locations));
}

export async function clearQueuedLocations() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function appendTrackedLocations(
  locations: Omit<TrackedLocation, "id">[]
): Promise<TrackedLocation[]> {
  const current = await readQueuedLocations();
  const next = [
    ...current,
    ...locations.map((location) => ({
      ...location,
      id: makeId()
    }))
  ].slice(-500);
  await replaceQueuedLocations(next);
  return next;
}

export function trackedLocationToPayload(location: TrackedLocation): VerificationEventPayload {
  return {
    type: "location",
    lat: location.lat,
    lng: location.lng,
    accuracyMeters: location.accuracyMeters,
    recordedAt: location.recordedAt ?? new Date().toISOString()
  };
}

export async function syncQueuedLocations(
  sendLocation: (location: TrackedLocation) => Promise<unknown>
) {
  const queued = await readQueuedLocations();
  const remaining: TrackedLocation[] = [];
  let sent = 0;

  for (const location of queued) {
    try {
      await sendLocation(location);
      sent += 1;
    } catch {
      remaining.push(location);
    }
  }

  await replaceQueuedLocations(remaining);
  return { sent, remaining: remaining.length };
}
