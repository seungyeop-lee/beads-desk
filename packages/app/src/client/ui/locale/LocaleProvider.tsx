"use client";

import { createContext, use, type ReactNode } from "react";
import { MESSAGES, type Messages } from "@/client/modules/locale/domain/messages";
import type { Locale } from "@/shared/contract/locale";

const LocaleContext = createContext<Locale>("en");

/** layout이 요청에서 정한 언어를 화면 전체에 내려 줍니다. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return use(LocaleContext);
}

export function useMessages(): Messages {
  return MESSAGES[use(LocaleContext)];
}
