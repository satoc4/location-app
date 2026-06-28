import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { useI18n } from "../../src/i18n/useI18n";
import { colors, radius } from "../../src/styles/theme";

type IconName = keyof typeof Feather.glyphMap;

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Feather color={String(color)} name={name} size={size} />
  );
}

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.surfaceAlt,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSoft,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingHorizontal: 8,
          paddingTop: 8
        },
        tabBarItemStyle: {
          borderRadius: radius.md,
          marginHorizontal: 2
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800"
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.plans"),
          tabBarIcon: tabIcon("map")
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: t("tabs.track"),
          tabBarIcon: tabIcon("navigation")
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          title: t("tabs.verify"),
          tabBarIcon: tabIcon("camera")
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t("tabs.rewards"),
          tabBarIcon: tabIcon("gift")
        }}
      />
    </Tabs>
  );
}
