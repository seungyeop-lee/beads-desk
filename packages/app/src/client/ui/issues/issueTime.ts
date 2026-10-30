import { isLocalMidnight } from "@/client/modules/issues/domain/issueDueAt";
import type { Messages } from "@/client/modules/locale/domain/messages";
import type { Locale } from "@/shared/contract/locale";

export function formatDate(locale: Locale, ms: number): string {
  return new Date(ms).toLocaleDateString(locale, { dateStyle: "medium" });
}

export function formatTime(locale: Locale, ms: number): string {
  return new Date(ms).toLocaleString(locale);
}

/** 보류 기한을 시각으로 보이고, 기한 없이 보류한 이슈는 무기한으로 보입니다. */
export function deferUntilLabel(messages: Messages, locale: Locale, deferUntil: number | null) {
  return deferUntil === null
    ? messages.deferral.periods.indefinite
    : formatTime(locale, deferUntil);
}

/** 마감일을 browser 시간대의 날짜로 보이고, 현지 0시가 아닐 때만 시각을 붙입니다. 날짜만 넣은 마감일은 bd show의 Due:와 같은 날짜로 보입니다. */
export function dueAtLabel(locale: Locale, dueAt: number): string {
  return new Date(dueAt).toLocaleString(
    locale,
    isLocalMidnight(dueAt) ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" },
  );
}
