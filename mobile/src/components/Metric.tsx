import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

type MetricProps = {
  label: string;
  value: string;
};

export function Metric({ label, value }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    gap: spacing.xs,
    minWidth: 92,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600"
  }
});
