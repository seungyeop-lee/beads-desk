export type ApiFailure = {
  ok: false;
  /** 화면에 그대로 보여 줄 수 있는 오류 문구입니다. */
  error: string;
};

export type ApiResponse<T> = { ok: true; data: T } | ApiFailure;
