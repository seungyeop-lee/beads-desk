export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** bd는 결과가 없을 때 배열 대신 null을 출력하기도 하므로, 배열이 아니면 빈 목록으로 읽습니다. */
export function recordsOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function stringOr<T extends string | null>(value: unknown, fallback: T): string | T {
  return typeof value === "string" ? value : fallback;
}

export function timestampOr<T extends number | null>(value: unknown, fallback: T): number | T {
  const ms = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? ms : fallback;
}

/** bd show는 이슈 하나를 내놓을 때도 배열과 객체를 섞어 출력하므로, 어느 형태든 첫 레코드를 꺼냅니다. */
export function showRecordOf(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}
