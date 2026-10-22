/** 모음에서 값을 빼거나, 없으면 넣습니다. */
export function toggled<T>(values: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(values);
  if (!next.delete(value)) next.add(value);
  return next;
}
