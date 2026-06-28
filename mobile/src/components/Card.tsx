import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { colors, radius, shadows, spacing } from "../styles/theme";

type CardPadding = "none" | "md" | "lg";

type CardProps = PropsWithChildren<{
  muted?: boolean;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, muted = false, padding = "lg", style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        muted && styles.muted,
        padding === "md" && styles.paddingMd,
        padding === "lg" && styles.paddingLg,
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1
  },
  muted: {
    backgroundColor: colors.surfaceMuted
  },
  paddingMd: {
    padding: spacing.md
  },
  paddingLg: {
    padding: spacing.lg
  }
});
