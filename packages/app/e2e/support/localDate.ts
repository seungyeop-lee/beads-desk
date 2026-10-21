/**
 * 오늘에서 offsetDays일 떨어진 날짜를 이 컴퓨터 시간대의 `YYYY-MM-DD`로 돌려줍니다.
 * 브라우저도 같은 컴퓨터의 시간대를 쓰므로, 화면이 보는 날짜와 같습니다.
 */
export function localDay(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
