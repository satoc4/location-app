import { useMemo } from "react";

import { useLocaleStore } from "../store/localeStore";
import { translate, type TranslationKey } from "./strings";

export function useI18n() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: TranslationKey, values?: Record<string, string | number>) =>
        translate(locale, key, values)
    }),
    [locale, setLocale]
  );
}
