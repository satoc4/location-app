import { StyleSheet, View } from "react-native";

import { colors, radius } from "../styles/theme";

type ProgressBarProps = {
  progress: number;
  tone?: "primary" | "success";
};

export function ProgressBar({ progress, tone = "primary" }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const fillColor = tone === "success" ? colors.success : colors.primary;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { backgroundColor: fillColor, width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    height: 8,
    overflow: "hidden",
    width: "100%"
  },
  fill: {
    borderRadius: radius.sm,
    height: "100%"
  }
});
