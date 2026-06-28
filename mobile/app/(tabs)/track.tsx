import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import { geoactionClient } from "../../src/api/geoactionClient";
import { ActionButton } from "../../src/components/ActionButton";
import { Metric } from "../../src/components/Metric";
import { ProgressBar } from "../../src/components/ProgressBar";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { placeCoordinate, placesById } from "../../src/domain/places";
import type { ActionRun, Coordinate, MapMarker, TrackedLocation } from "../../src/domain/types";
import MapPanel from "../../src/features/map/MapPanel";
import {
  localizeStatus,
  localizeStepProgress,
  localizeStepRequirement,
  localizeStepTitle,
  stepProgressRatio
} from "../../src/i18n/domainText";
import { useI18n } from "../../src/i18n/useI18n";
import {
  appendTrackedLocations,
  readQueuedLocations,
  syncQueuedLocations,
  trackedLocationToPayload
} from "../../src/services/locationQueue";
import { locationService } from "../../src/services/locationService";
import { useSessionStore } from "../../src/store/sessionStore";
import { colors, radius, spacing } from "../../src/styles/theme";

const AUTO_SEND_INTERVAL_MS = 30000;

function coordinateLabel(coordinate: Coordinate | null | undefined, emptyLabel: string) {
  if (!coordinate) {
    return emptyLabel;
  }
  return `${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}`;
}

function canTrack(actionRun: ActionRun | null) {
  return Boolean(actionRun && actionRun.status !== "completed");
}

export default function TrackScreen() {
  const { locale, t } = useI18n();
  const { activeActionRun, setActiveActionRun } = useSessionStore();
  const [current, setCurrent] = useState<Coordinate | null>(null);
  const [queued, setQueued] = useState<TrackedLocation[]>([]);
  const [tracking, setTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const placesQuery = useQuery({
    queryKey: ["places"],
    queryFn: () => geoactionClient.listPlaces()
  });

  const activeActionRunRef = useRef<ActionRun | null>(activeActionRun);
  const currentRef = useRef<Coordinate | null>(current);
  const isPausedRef = useRef(isPaused);
  const trackingRef = useRef(tracking);
  const autoSendingRef = useRef(false);
  const lastAutoSentAtRef = useRef(0);

  useEffect(() => {
    activeActionRunRef.current = activeActionRun;
    if (activeActionRun?.status === "completed") {
      setIsPaused(true);
    }
  }, [activeActionRun]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  const eventNotice = (completed: number) => {
    if (!completed) {
      return t("track.locationEventSent");
    }
    return t(completed === 1 ? "track.stepCompleted" : "track.stepsCompleted", {
      count: completed
    });
  };

  const queuePositionForRetry = async (position: Coordinate) => {
    const next = await appendTrackedLocations([
      {
        ...position,
        recordedAt: new Date().toISOString(),
        source: "foreground"
      }
    ]);
    setQueued(next);
  };

  const sendLocationEvent = async (position: Coordinate, quiet = false) => {
    const actionRun = activeActionRunRef.current;
    if (!actionRun) {
      throw new Error(t("track.noActiveActionError"));
    }

    const result = await geoactionClient.sendActionEvent(actionRun.id, {
      type: "location",
      lat: position.lat,
      lng: position.lng,
      accuracyMeters: position.accuracyMeters,
      recordedAt: new Date().toISOString()
    });

    activeActionRunRef.current = result.actionRun;
    setActiveActionRun(result.actionRun);
    if (!quiet) {
      setNotice(eventNotice(result.completedSteps.length));
    }
    return result;
  };

  const syncQueueQuietly = async () => {
    if (!activeActionRunRef.current) {
      return { sent: 0, remaining: queued.length };
    }

    const result = await syncQueuedLocations(async (location) => {
      const actionRun = activeActionRunRef.current;
      if (!actionRun) {
        throw new Error(t("track.noActiveActionError"));
      }
      const eventResult = await geoactionClient.sendActionEvent(
        actionRun.id,
        trackedLocationToPayload(location)
      );
      activeActionRunRef.current = eventResult.actionRun;
      setActiveActionRun(eventResult.actionRun);
      return eventResult;
    });
    const next = await readQueuedLocations();
    setQueued(next);
    return result;
  };

  const sendCurrent = useMutation({
    mutationFn: async () => {
      const position = current ?? (await locationService.getCurrentPosition());
      return sendLocationEvent(position);
    },
    onError: (error) => {
      Alert.alert(
        t("track.trackingFailed"),
        error instanceof Error ? error.message : t("common.unknownError")
      );
    }
  });

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;

    locationService
      .watchPosition((coordinate) => {
        setCurrent(coordinate);
      })
      .then((watcher) => {
        subscription = watcher;
      })
      .catch((error) => {
        setNotice(error instanceof Error ? error.message : t("plans.locationUnavailable"));
      });

    readQueuedLocations().then(setQueued);
    locationService.isBackgroundTracking().then(setTracking);

    return () => {
      subscription?.remove();
    };
  }, [t]);

  useEffect(() => {
    if (!canTrack(activeActionRun) || isPaused || Platform.OS === "web") {
      return;
    }

    locationService
      .startBackgroundTracking()
      .then(() => setTracking(true))
      .catch(() => undefined);
  }, [activeActionRun, isPaused]);

  useEffect(() => {
    if (!canTrack(activeActionRun) || isPaused) {
      return;
    }

    let cancelled = false;
    const autoSend = async () => {
      const actionRun = activeActionRunRef.current;
      if (
        !canTrack(actionRun) ||
        isPausedRef.current ||
        autoSendingRef.current ||
        Date.now() - lastAutoSentAtRef.current < AUTO_SEND_INTERVAL_MS - 1000
      ) {
        return;
      }

      autoSendingRef.current = true;
      lastAutoSentAtRef.current = Date.now();
      if (!cancelled) {
        setAutoSyncing(true);
      }

      try {
        let position = currentRef.current;
        try {
          position = await locationService.getCurrentPosition();
        } catch {
          position = currentRef.current;
        }
        if (!position) {
          return;
        }
        const result = await sendLocationEvent(position, true);
        if (result.completedSteps.length && !cancelled) {
          setNotice(eventNotice(result.completedSteps.length));
        }
        await syncQueueQuietly();
      } catch {
        const position = currentRef.current;
        if (position) {
          await queuePositionForRetry(position);
          if (!cancelled) {
            setNotice(t("track.autoQueued"));
          }
        }
      } finally {
        autoSendingRef.current = false;
        if (!cancelled) {
          setAutoSyncing(false);
        }
      }
    };

    autoSend();
    const timer = setInterval(autoSend, AUTO_SEND_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeActionRun, isPaused, t]);

  const queueCurrentPoint = async () => {
    const position = current ?? (await locationService.getCurrentPosition());
    await queuePositionForRetry(position);
    setNotice(t("track.pointQueued"));
  };

  const toggleBackgroundTracking = async () => {
    try {
      if (trackingRef.current) {
        await locationService.stopBackgroundTracking();
        setTracking(false);
        setNotice(t("track.backgroundStopped"));
      } else {
        await locationService.startBackgroundTracking();
        setTracking(true);
        setNotice(t("track.backgroundStarted"));
      }
    } catch (error) {
      Alert.alert(
        t("track.permissionRequired"),
        error instanceof Error ? error.message : t("common.unknownError")
      );
    }
  };

  const syncQueue = async () => {
    if (!activeActionRunRef.current) {
      Alert.alert(t("track.noActiveActionTitle"), t("track.noActiveActionBody"));
      return;
    }

    const result = await syncQueueQuietly();
    setNotice(t("track.syncResult", { sent: result.sent, remaining: result.remaining }));
  };

  const pauseMeasurement = async () => {
    setIsPaused(true);
    if (Platform.OS !== "web") {
      await locationService.stopBackgroundTracking().catch(() => undefined);
      setTracking(false);
    }
    setNotice(t("track.measurementPaused"));
  };

  const resumeMeasurement = async () => {
    if (!activeActionRunRef.current) {
      Alert.alert(t("track.noActiveActionTitle"), t("track.measurementIdle"));
      return;
    }
    setIsPaused(false);
    if (Platform.OS !== "web") {
      await locationService
        .startBackgroundTracking()
        .then(() => setTracking(true))
        .catch(() => undefined);
    }
    setNotice(t("track.measurementRunning"));
  };

  const endMeasurement = async () => {
    await locationService.stopBackgroundTracking().catch(() => undefined);
    setTracking(false);
    setIsPaused(false);
    activeActionRunRef.current = null;
    setActiveActionRun(null);
    setNotice(t("track.measurementEnded"));
  };

  const measurementLabel = !activeActionRun
    ? t("track.noMeasurement")
    : activeActionRun.status === "completed"
      ? t("track.measurementCompleted")
      : isPaused
        ? t("track.paused")
        : t("track.measuring");

  const measurementTone = !activeActionRun
    ? "warning"
    : activeActionRun.status === "completed"
      ? "success"
      : isPaused
        ? "neutral"
        : "success";

  const measurementCopy = !activeActionRun
    ? t("track.measurementIdle")
    : isPaused
      ? t("track.measurementPaused")
      : t("track.measurementRunning");

  const measurementControlsDisabled = !canTrack(activeActionRun);
  const steps = activeActionRun?.steps ?? [];
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => step.status === "completed").length;
  const currentStep =
    steps.find((step) => step.status !== "completed") ?? steps[steps.length - 1] ?? null;
  const currentStepPartial =
    currentStep && currentStep.status !== "completed" ? stepProgressRatio(currentStep) : 0;
  const overallProgress = totalSteps ? (completedSteps + currentStepPartial) / totalSteps : 0;
  const placeIndex = placesById(placesQuery.data);
  const stepMarkers = steps.reduce<MapMarker[]>((markers, step) => {
    if (!step.placeId) {
      return markers;
    }
    const place = placeIndex[step.placeId];
    const coordinate = placeCoordinate(place);
    if (!coordinate) {
      return markers;
    }
    const marker: MapMarker = {
      id: step.placeId,
      coordinate,
      description: localizeStepRequirement(locale, step),
      title: localizeStepTitle(locale, step) ?? place?.name ?? step.title,
      tone:
        step.status === "completed"
          ? "completed"
          : step.stepId === currentStep?.stepId
            ? "next"
            : "destination"
    };
    const existingIndex = markers.findIndex((item) => item.id === step.placeId);
    if (existingIndex === -1) {
      markers.push(marker);
      return markers;
    }
    if (step.stepId === currentStep?.stepId) {
      markers[existingIndex] = marker;
    }
    return markers;
  }, []);

  return (
    <Screen title={t("track.title")} subtitle={t("track.subtitle")}>
      <View style={styles.mapShell}>
        <MapPanel coordinate={current} markers={stepMarkers} points={queued} />
      </View>

      <View style={styles.measurementPanel}>
        <View style={styles.measurementHeader}>
          <View style={styles.measurementTitleBlock}>
            <Text style={styles.panelLabel}>{t("track.measurement")}</Text>
            <Text style={styles.measurementTitle}>{measurementLabel}</Text>
          </View>
          <StatusPill label={measurementLabel} tone={measurementTone} />
        </View>

        <Text style={styles.measurementCopy}>{measurementCopy}</Text>

        <View style={styles.metrics}>
          <Metric label={t("track.metric.queued")} value={String(queued.length)} />
          <Metric
            label={t("track.metric.accuracy")}
            value={
              current?.accuracyMeters
                ? `${Math.round(current.accuracyMeters)} ${t("common.meterShort")}`
                : t("common.notAvailable")
            }
          />
          <Metric
            label={t("track.metric.speed")}
            value={
              current?.speedMetersPerSecond
                ? `${current.speedMetersPerSecond.toFixed(1)} m/s`
                : t("common.notAvailable")
            }
          />
        </View>

        <View style={styles.userActions}>
          <ActionButton
            disabled={measurementControlsDisabled}
            icon={isPaused ? "play" : "pause"}
            label={isPaused ? t("track.resume") : t("track.pause")}
            onPress={isPaused ? resumeMeasurement : pauseMeasurement}
            style={styles.userActionButton}
            variant="secondary"
          />
          <ActionButton
            disabled={!activeActionRun}
            icon="square"
            label={t("track.end")}
            onPress={endMeasurement}
            style={styles.userActionButton}
            variant="danger"
          />
        </View>
      </View>

      {activeActionRun ? (
        <View style={styles.progressPanel}>
          <View style={styles.progressHeader}>
            <View style={styles.measurementTitleBlock}>
              <Text style={styles.panelLabel}>{t("track.overallProgress")}</Text>
              <Text style={styles.progressTitle}>
                {t("track.progressCount", { completed: completedSteps, total: totalSteps })}
              </Text>
            </View>
            <StatusPill label={localizeStatus(locale, activeActionRun.status)} tone="blue" />
          </View>
          <ProgressBar progress={overallProgress} tone={activeActionRun.status === "completed" ? "success" : "primary"} />

          {currentStep ? (
            <View style={styles.currentStepBlock}>
              <Text style={styles.panelLabel}>
                {currentStep.status === "completed" ? t("track.currentStep") : t("track.nextStep")}
              </Text>
              <Text style={styles.currentStepTitle}>{localizeStepTitle(locale, currentStep)}</Text>
              <Text style={styles.currentStepRequirement}>
                {localizeStepRequirement(locale, currentStep)}
              </Text>
              <Text style={styles.currentStepProgress}>
                {localizeStepProgress(locale, currentStep)}
              </Text>
              {currentStep.type === "stay" ? (
                <ProgressBar progress={stepProgressRatio(currentStep)} />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <StatusPill
            label={tracking ? t("track.backgroundOn") : t("track.backgroundOff")}
            tone={tracking ? "success" : "neutral"}
          />
          {autoSyncing ? <StatusPill label={t("verify.sending")} tone="neutral" /> : null}
          {activeActionRun ? (
            <StatusPill label={localizeStatus(locale, activeActionRun.status)} tone="blue" />
          ) : (
            <StatusPill label={t("track.noAction")} tone="warning" />
          )}
        </View>

        <Text style={styles.coordinate}>
          {coordinateLabel(current, t("track.noCurrentPosition"))}
        </Text>
      </View>

      <ActionButton
        icon={showDeveloperTools ? "chevron-up" : "sliders"}
        label={showDeveloperTools ? t("track.hideDeveloperTools") : t("track.developerTools")}
        onPress={() => setShowDeveloperTools((value) => !value)}
        variant="secondary"
      />

      {showDeveloperTools ? (
        <View style={styles.developerPanel}>
          <Text style={styles.developerTitle}>{t("track.manualControls")}</Text>
          <View style={styles.buttonGrid}>
            <ActionButton
              icon="navigation"
              label={t("track.send")}
              loading={sendCurrent.isPending}
              onPress={() => sendCurrent.mutate()}
            />
            <ActionButton
              icon="plus"
              label={t("track.queue")}
              onPress={queueCurrentPoint}
              variant="secondary"
            />
            <ActionButton
              icon={tracking ? "square" : "radio"}
              label={tracking ? t("track.stop") : t("track.record")}
              onPress={toggleBackgroundTracking}
              variant={tracking ? "danger" : "secondary"}
            />
            <ActionButton
              icon="upload-cloud"
              label={t("track.sync")}
              onPress={syncQueue}
              variant="secondary"
            />
          </View>
        </View>
      ) : null}

      {activeActionRun ? (
        <View style={styles.stepsPanel}>
          {activeActionRun.steps.map((step, index) => (
            <View key={step.stepId} style={styles.stepRow}>
              <Text style={styles.stepIndex}>{index + 1}</Text>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{localizeStepTitle(locale, step)}</Text>
                <Text style={styles.stepMeta}>
                  {localizeStatus(locale, step.status)}
                  {step.elapsedSeconds
                    ? ` · ${Math.round(step.elapsedSeconds / 60)} ${t("common.minuteShort")}`
                    : ""}
                </Text>
                <Text style={styles.stepRequirement}>
                  {localizeStepRequirement(locale, step)}
                </Text>
                <Text style={styles.stepProgress}>{localizeStepProgress(locale, step)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapShell: {
    borderRadius: radius.md,
    overflow: "hidden"
  },
  measurementPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  measurementHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  measurementTitleBlock: {
    flex: 1,
    gap: spacing.xs
  },
  panelLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  measurementTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  measurementCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  progressPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  progressHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  progressTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  currentStepBlock: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md
  },
  currentStepTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
  },
  currentStepRequirement: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  currentStepProgress: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  userActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  userActionButton: {
    flex: 1
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  panelHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  coordinate: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  buttonGrid: {
    gap: spacing.sm
  },
  developerPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  developerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  stepsPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  stepIndex: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "900",
    width: 22
  },
  stepBody: {
    flex: 1,
    gap: spacing.xs
  },
  stepTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  stepMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  stepRequirement: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  stepProgress: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  notice: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  }
});
