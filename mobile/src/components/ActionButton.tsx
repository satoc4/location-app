import { Feather } from "@expo/vector-icons";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

type ActionButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "secondary" | "danger";
};

export function ActionButton({
  label,
  icon,
  loading,
  variant = "primary",
  disabled,
  style,
  ...props
}: ActionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.primary : colors.surface} />
      ) : (
        <Feather
          color={variant === "secondary" ? colors.primary : colors.surface}
          name={icon}
          size={18}
        />
      )}
      <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1
  },
  danger: {
    backgroundColor: colors.rose
  },
  disabled: {
    opacity: 0.48
  },
  pressed: {
    opacity: 0.82
  },
  label: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryLabel: {
    color: colors.primary
  }
});
