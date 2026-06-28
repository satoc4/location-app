import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { useI18n } from "../../src/i18n/useI18n";
import { colors } from "../../src/styles/theme";

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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 11
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
