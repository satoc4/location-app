import "../src/services/backgroundLocationTask";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { colors } from "../src/styles/theme";
import { useLocaleStore } from "../src/store/localeStore";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const hydrateLocale = useLocaleStore((state) => state.hydrate);

  useEffect(() => {
    hydrateLocale().catch(() => undefined);
  }, [hydrateLocale]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      />
    </QueryClientProvider>
  );
}
