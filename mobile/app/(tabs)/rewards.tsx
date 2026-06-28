import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { geoactionClient } from "../../src/api/geoactionClient";
import { Metric } from "../../src/components/Metric";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { localizeRewardDescription, localizeStatus } from "../../src/i18n/domainText";
import type { Locale } from "../../src/i18n/strings";
import { useI18n } from "../../src/i18n/useI18n";
import { colors, radius, spacing } from "../../src/styles/theme";

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function RewardsScreen() {
  const { locale, t } = useI18n();
  const rewardsQuery = useQuery({
    queryKey: ["rewards"],
    queryFn: () => geoactionClient.listRewards()
  });

  const rewards = rewardsQuery.data ?? [];
  const issued = rewards.filter((reward) => reward.status === "issued").length;

  return (
    <Screen title={t("rewards.title")} subtitle={t("rewards.subtitle")}>
      <View style={styles.summary}>
        <Metric label={t("rewards.metric.total")} value={String(rewards.length)} />
        <Metric label={t("rewards.metric.issued")} value={String(issued)} />
      </View>

      {rewardsQuery.isFetching ? <ActivityIndicator color={colors.primary} /> : null}

      {!rewardsQuery.isFetching && rewards.length === 0 ? (
        <View style={styles.empty}>
          <StatusPill label={t("rewards.empty")} tone="neutral" />
          <Text style={styles.emptyTitle}>{t("rewards.noRewardsYet")}</Text>
        </View>
      ) : null}

      {rewards.map((reward) => (
        <View key={reward.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleBlock}>
              <Text style={styles.amount}>
                {reward.amount} {reward.currency}
              </Text>
              <Text style={styles.description}>
                {localizeRewardDescription(locale, reward)}
              </Text>
            </View>
            <StatusPill
              label={localizeStatus(locale, reward.status)}
              tone={reward.status === "issued" ? "success" : "neutral"}
            />
          </View>
          <View style={styles.dates}>
            <Text style={styles.dateText}>
              {t("rewards.issuedAt", { date: formatDate(reward.issuedAt, locale) })}
            </Text>
            <Text style={styles.dateText}>
              {t("rewards.expiresAt", { date: formatDate(reward.expiresAt, locale) })}
            </Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
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
  amount: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "900"
  },
  description: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  dates: {
    gap: spacing.xs
  },
  dateText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  }
});
