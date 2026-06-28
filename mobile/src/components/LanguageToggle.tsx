import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "../i18n/useI18n";
import type { Locale } from "../i18n/strings";
import { colors, radius, spacing } from "../styles/theme";

const locales: Locale[] = ["ja", "en"];

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <View accessibilityRole="tablist" style={styles.container}>
      <Feather color={colors.muted} name="globe" size={15} />
      {locales.map((item) => {
        const selected = item === locale;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item}
            onPress={() => setLocale(item)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {item === "ja" ? t("language.ja") : t("language.en")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs
  },
  option: {
    borderRadius: radius.sm,
    minWidth: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  selected: {
    backgroundColor: colors.primary
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  selectedLabel: {
    color: colors.surface
  }
});
