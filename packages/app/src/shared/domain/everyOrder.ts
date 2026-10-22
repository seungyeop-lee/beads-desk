/** U의 값을 빠짐없이 한 번씩 담는 모든 순서의 tuple입니다. */
export type EveryOrder<U, Each = U> = [U] extends [never]
  ? readonly []
  : Each extends U
    ? readonly [Each, ...EveryOrder<Exclude<U, Each>>]
    : never;
