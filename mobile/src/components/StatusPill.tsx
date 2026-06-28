import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

type Tone = "neutral" | "success" | "warning" | "danger" | "blue";

type StatusPillProps = {
  label: string;
  tone?: Tone;
};

const toneColor: Record<Tone, string> = {
  neutral: colors.muted,
  success: colors.success,
  warning: colors.amber,
  danger: colors.rose,
  blue: colors.blue
};

const toneBackground: Record<Tone, string> = {
  neutral: colors.surfaceMuted,
  success: colors.successSoft,
  warning: colors.amberSoft,
  danger: colors.roseSoft,
  blue: colors.blueSoft
};

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: toneBackground[tone], borderColor: toneColor[tone] }]}>
      <Text style={[styles.label, { color: toneColor[tone] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  label: {
    fontSize: 11,
    fontWeight: "700"
  }
});
