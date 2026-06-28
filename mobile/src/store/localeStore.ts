import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { Locale } from "../i18n/strings";

const STORAGE_KEY = "geoaction.locale.v1";

type LocaleState = {
  hydrated: boolean;
  locale: Locale;
  hydrate: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
};

export const useLocaleStore = create<LocaleState>((set) => ({
  hydrated: false,
  locale: "ja",
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === "ja" || stored === "en") {
      set({ hydrated: true, locale: stored });
      return;
    }
    set({ hydrated: true });
  },
  setLocale: async (locale) => {
    set({ locale });
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  }
}));
