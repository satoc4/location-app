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
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  value: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  }
});
