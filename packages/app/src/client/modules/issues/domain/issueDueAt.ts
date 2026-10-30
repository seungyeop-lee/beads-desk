import { localDate, localDayOf } from "./issueDateFilter";

/** 상세 화면의 마감일 입력 값입니다. day는 "YYYY-MM-DD"이고, time은 "HH:mm"이거나 시각을 고르지 않았으면 빈 문자열입니다. */
export type DueAtInput = { day: string; time: string };

/**
 * 고른 browser 현지 날짜와 시각을 bd에 넘길 UTC 시각(toISOString 형식)으로 바꿉니다. 시각을 비우면 그날 0시입니다.
 * 서버가 아니라 browser에서 UTC로 바꾸므로, 서버와 browser의 시간대가 달라도 고른 시각이 그대로 저장됩니다.
 */
export function dueAtFromInput({ day, time }: DueAtInput): string {
  const date = localDate(day);
  if (time !== "") {
    const [hours, minutes] = time.split(":").map(Number);
    date.setHours(hours, minutes);
  }
  return date.toISOString();
}

/** 저장된 마감 시각을 입력 값으로 바꿉니다. 현지 0시이면 시각을 비웁니다. */
export function dueAtInputOf(dueAt: number): DueAtInput {
  const date = new Date(dueAt);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    day: localDayOf(dueAt),
    time: isLocalMidnight(dueAt) ? "" : `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

/** 날짜만 넣은 마감일인지 확인합니다. bd는 날짜만 받으면 그날 0시로 저장합니다. */
export function isLocalMidnight(time: number): boolean {
  const date = new Date(time);
  return (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  );
}
