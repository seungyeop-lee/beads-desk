/** 고른 값을 1년 동안 남기는 cookie를 적습니다. 서버는 다음 요청부터 이 값을 읽습니다. */
export function saveChoiceCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}
