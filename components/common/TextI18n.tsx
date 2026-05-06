"use client";

import { useApp } from "@/components/providers/AppProvider";
import { t, type DictKey } from "@/lib/i18n";

export function T({ k }: { k: DictKey }) {
  const { lang } = useApp();
  return <>{t(k, lang)}</>;
}

export function useT() {
  const { lang } = useApp();
  return (k: DictKey) => t(k, lang);
}
