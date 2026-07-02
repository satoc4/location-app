import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { geoactionClient } from "../../src/api/geoactionClient";
import { ActionButton } from "../../src/components/ActionButton";
import { Card } from "../../src/components/Card";
import { Metric } from "../../src/components/Metric";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { StatusPill } from "../../src/components/StatusPill";
import { placeCoordinate, placesById } from "../../src/domain/places";
import type { Coordinate, MapMarker, PlanCandidate } from "../../src/domain/types";
import MapPanel from "../../src/features/map/MapPanel";
import {
  localizeCrowding,
  localizePlan,
  localizeStatus,
  localizeStepRequirement,
  localizeStepTitle
} from "../../src/i18n/domainText";
import type { TranslationKey } from "../../src/i18n/strings";
import { useI18n } from "../../src/i18n/useI18n";
import { demoCoordinate, locationService } from "../../src/services/locationService";
import { useSessionStore } from "../../src/store/sessionStore";
import { colors, radius, spacing } from "../../src/styles/theme";

function formatDistance(
  meters: number | null | undefined,
  labels: { unknown: string; meter: string; kilometer: string }
) {
  if (meters === undefined || meters === null) {
    return labels.unknown;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} ${labels.kilometer}`;
  }
  return `${Math.round(meters)} ${labels.meter}`;
}

type PickTone = "success" | "warning" | "blue";

type TodayPickMeta = {
  icon: keyof typeof Feather.glyphMap;
  labelKey: TranslationKey;
  tone: PickTone;
};

const detourPickMeta: TodayPickMeta = {
  icon: "shopping-bag",
  labelKey: "plans.today.detour",
  tone: "success"
};

const waitPickMeta: TodayPickMeta = {
  icon: "coffee",
  labelKey: "plans.today.wait",
  tone: "warning"
};

const weekendPickMeta: TodayPickMeta = {
  icon: "calendar",
  labelKey: "plans.today.weekend",
  tone: "blue"
};

const fallbackTodayPickMetas: TodayPickMeta[] = [
  detourPickMeta,
  waitPickMeta,
  weekendPickMeta
];

function todayPickMeta(plan: PlanCandidate, index: number): TodayPickMeta {
  if (plan.objective === "activate_waiting_time") {
    return waitPickMeta;
  }
  if (plan.objective === "weekend_tourism") {
    return weekendPickMeta;
  }
  if (plan.objective === "increase_shopping_street_visits") {
    return detourPickMeta;
  }
  return fallbackTodayPickMetas[index % fallbackTodayPickMetas.length] ?? detourPickMeta;
}

function TodayPickCard({
  index,
  loading,
  onDetail,
  onStart,
  plan
}: {
  index: number;
  loading: boolean;
  onDetail: () => void;
  onStart: (planId: string) => void;
  plan: PlanCandidate;
}) {
  const { locale, t } = useI18n();
  const localizedPlan = localizePlan(locale, plan);
  const meta = todayPickMeta(plan, index);
  const rewardText = plan.reward
    ? t("plans.pick.reward", {
        amount: plan.reward.amount,
        currency: plan.reward.currency
      })
    : t("plans.pick.noReward");

  return (
    <Card style={styles.todayPickCard}>
      <View style={styles.todayPickTop}>
        <View style={styles.todayPickIcon}>
          <Feather color={colors.primaryDark} name={meta.icon} size={19} />
        </View>
        <StatusPill label={t(meta.labelKey)} tone={meta.tone} />
      </View>

      <Pressable onPress={onDetail} style={styles.todayPickCopy}>
        <Text numberOfLines={2} style={styles.todayPickTitle}>
          {localizedPlan.title}
        </Text>
        <Text numberOfLines={2} style={styles.todayPickReason}>
          {localizedPlan.recommendationReason}
        </Text>
      </Pressable>

      <View style={styles.todayPickMetaRow}>
        <Text style={styles.todayPickMetaText}>
          {plan.durationMinutes ?? 0} {t("common.minuteShort")}
        </Text>
        <Text style={styles.todayPickMetaText}>{rewardText}</Text>
      </View>

      <ActionButton
        icon="play"
        label={t("plans.start")}
        loading={loading}
        onPress={() => onStart(plan.id)}
        variant={index === 0 ? "primary" : "secondary"}
      />
    </Card>
  );
}

function PlanCard({
  plan,
  onStart,
  loading
}: {
  plan: PlanCandidate;
  onStart: (planId: string) => void;
  loading: boolean;
}) {
  const { locale, t } = useI18n();
  const localizedPlan = localizePlan(locale, plan);
  const routeSteps = plan.stepsSummary.filter((step, index, steps) => {
    if (step.type === "stay") {
      return false;
    }
    if (!step.placeId) {
      return true;
    }
    return steps.findIndex((candidate) => candidate.placeId === step.placeId) === index;
  });

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleBlock}>
          <Text style={styles.planTitle}>{localizedPlan.title}</Text>
          <Text style={styles.sponsor}>{localizedPlan.sponsorName}</Text>
        </View>
        <StatusPill label={localizeCrowding(locale, plan.crowdingLevel)} tone="blue" />
      </View>

      <Text style={styles.description}>{localizedPlan.recommendationReason}</Text>

      <View style={styles.routePanel}>
        <Text style={styles.routeLabel}>{t("plans.route")}</Text>
        <View style={styles.routeNodes}>
          {routeSteps.map((step, index) => (
            <View key={step.id} style={styles.routeNode}>
              <View style={styles.routeDot} />
              <Text style={styles.routeText}>{localizeStepTitle(locale, step) ?? step.type}</Text>
              {index < routeSteps.length - 1 ? <View style={styles.routeConnector} /> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric
          label={t("plans.metric.duration")}
          value={`${plan.durationMinutes ?? 0} ${t("common.minuteShort")}`}
        />
        <Metric
          label={t("plans.metric.walk")}
          value={formatDistance(plan.walkingDistanceMeters, {
            unknown: t("common.unknown"),
            meter: t("common.meterShort"),
            kilometer: t("common.kilometerShort")
          })}
        />
        <Metric
          label={t("plans.metric.nearby")}
          value={formatDistance(plan.distanceMeters, {
            unknown: t("common.unknown"),
            meter: t("common.meterShort"),
            kilometer: t("common.kilometerShort")
          })}
        />
      </View>

      <View style={styles.steps}>
        {plan.stepsSummary.map((step, index) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={styles.stepIndex}>
              <Text style={styles.stepIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepText}>{localizeStepTitle(locale, step) ?? step.type}</Text>
              <Text style={styles.stepRequirement}>{localizeStepRequirement(locale, step)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.rewardRow}>
        <Text style={styles.rewardText}>
          {plan.reward?.amount ?? 0} {plan.reward?.currency ?? "JPY"}
        </Text>
        <ActionButton
          icon="play"
          label={t("plans.start")}
          loading={loading}
          onPress={() => onStart(plan.id)}
          style={styles.startButton}
        />
      </View>
    </Card>
  );
}

export default function PlansScreen() {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [origin, setOrigin] = useState<Coordinate>(demoCoordinate);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { activeActionRun, setActiveActionRun } = useSessionStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanCandidate | null>(null);

  const plansQuery = useQuery({
    queryKey: ["plan-candidates", origin.lat, origin.lng],
    queryFn: () => geoactionClient.listPlanCandidates(origin)
  });
  const placesQuery = useQuery({
    queryKey: ["places"],
    queryFn: () => geoactionClient.listPlaces()
  });
  const placeIndex = placesById(placesQuery.data);
  const destinationMarkers =
    plansQuery.data?.reduce<MapMarker[]>((markers, plan) => {
        const destinationStep = [...plan.stepsSummary]
          .reverse()
          .find((step) => Boolean(step.placeId));
        const place = destinationStep?.placeId ? placeIndex[destinationStep.placeId] : undefined;
        const coordinate = placeCoordinate(place);
        if (!destinationStep || !coordinate) {
          return markers;
        }
        markers.push({
          id: `${plan.id}-${destinationStep.id}`,
          coordinate,
          description: localizePlan(locale, plan).title,
          title: localizeStepTitle(locale, destinationStep) ?? place?.name ?? plan.title,
          tone: "destination"
        });
        return markers;
      }, []) ?? [];

  const startAction = useMutation({
    mutationFn: (planId: string) => geoactionClient.startAction(planId),
    onSuccess: (actionRun) => {
      setActiveActionRun(actionRun);
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      const plan = plansQuery.data?.find((p) => p.id === actionRun.planId);
      if (plan) {
        const reward = plan.reward ? `${plan.reward.amount}${plan.reward.currency}分のごほうびもらえた。` : "";
        Share.share({
          message: `今日、よりみちした。${reward} 帰り道は、まだ終わってない。 #まちAction`
        }).catch(() => undefined);
      }
    },
    onError: (error) => {
      Alert.alert(
        t("plans.actionFailed"),
        error instanceof Error ? error.message : t("common.unknownError")
      );
    }
  });

  useEffect(() => {
    locationService
      .getCurrentPosition()
      .then((coordinate) => {
        setOrigin(coordinate);
        setLocationError(null);
      })
      .catch((error) => {
        setLocationError(error instanceof Error ? error.message : t("plans.locationUnavailable"));
      });
  }, [t]);

  const refreshLocation = async () => {
    try {
      const coordinate = await locationService.getCurrentPosition();
      setOrigin(coordinate);
      setLocationError(null);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : t("plans.locationUnavailable"));
    }
  };

  const todayPicks = plansQuery.data?.slice(0, 3) ?? [];

  return (
    <Screen title={t("plans.title")} subtitle={t("plans.subtitle")}>
      <SectionHeader
        description={t("plans.today.description")}
        eyebrow={t("plans.today.eyebrow")}
        title={t("plans.today.title")}
      />

      {plansQuery.isFetching ? <ActivityIndicator color={colors.primary} /> : null}

      <View style={styles.todayGrid}>
        {todayPicks.map((plan, index) => (
          <TodayPickCard
            index={index}
            key={plan.id}
            loading={startAction.isPending}
            onDetail={() => setSelectedPlan(plan)}
            onStart={(planId) => startAction.mutate(planId)}
            plan={plan}
          />
        ))}
      </View>

      {activeActionRun ? (
        <Card padding="md" style={styles.activeRun}>
          <StatusPill label={localizeStatus(locale, activeActionRun.status)} tone="success" />
          <Text style={styles.activeRunText}>
            {t("plans.activeAction", { id: activeActionRun.id })}
          </Text>
        </Card>
      ) : null}

      <SectionHeader
        description={t("plans.nearbyMap.description")}
        title={t("plans.nearbyMap.title")}
      />

      <Card padding="none" style={styles.mapShell}>
        <MapPanel coordinate={origin} markers={destinationMarkers} />
      </Card>

      <Card padding="md" style={styles.statusPanel}>
        <View>
          <Text style={styles.statusLabel}>{t("plans.origin")}</Text>
          <Text style={styles.statusValue}>
            {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}
          </Text>
        </View>
        <ActionButton
          icon="crosshair"
          label={t("plans.locate")}
          onPress={refreshLocation}
          variant="secondary"
        />
      </Card>

      {locationError ? <Text style={styles.error}>{locationError}</Text> : null}

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedPlan(null)}
        transparent
        visible={selectedPlan !== null}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>{t("plans.detail")}</Text>
              <Pressable onPress={() => setSelectedPlan(null)}>
                <Feather color={colors.text} name="x" size={22} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {selectedPlan && (
                <PlanCard
                  loading={startAction.isPending}
                  onStart={(planId) => {
                    startAction.mutate(planId);
                    setSelectedPlan(null);
                  }}
                  plan={selectedPlan}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  todayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  todayPickCard: {
    flexBasis: 230,
    flexGrow: 1,
    gap: spacing.md,
    minWidth: 220
  },
  todayPickTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  todayPickIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  todayPickCopy: {
    gap: spacing.xs,
    minHeight: 72
  },
  todayPickTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22
  },
  todayPickReason: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  todayPickMetaRow: {
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingTop: spacing.md
  },
  todayPickMetaText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  mapShell: {
    overflow: "hidden"
  },
  statusPanel: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  statusLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  statusValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  error: {
    color: colors.rose,
    fontSize: 13
  },
  activeRun: {
    gap: spacing.sm
  },
  activeRunText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  card: {
    gap: spacing.md
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs
  },
  planTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23
  },
  sponsor: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  routePanel: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  routeLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  routeNodes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  routeNode: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  routeDot: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.surface,
    borderWidth: 2,
    borderRadius: 5,
    height: 12,
    width: 12
  },
  routeConnector: {
    backgroundColor: colors.border,
    height: 2,
    width: 18
  },
  routeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    maxWidth: 120
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  steps: {
    gap: spacing.sm
  },
  stepRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  stepIndex: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  stepIndexText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800"
  },
  stepText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  stepCopy: {
    flex: 1,
    gap: spacing.xs
  },
  stepRequirement: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  rewardRow: {
    alignItems: "center",
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingTop: spacing.md
  },
  rewardText: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "900"
  },
  startButton: {
    minWidth: 120
  },
  modalOverlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "flex-end"
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%"
  },
  modalHeader: {
    alignItems: "center",
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg
  },
  modalHeaderTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  modalBody: {
    gap: spacing.md,
    padding: spacing.lg
  }
});
