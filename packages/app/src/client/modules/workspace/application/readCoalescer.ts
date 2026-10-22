/** 읽는 동안 온 변경 신호를 모아, 읽기가 끝난 뒤 한 번만 다시 읽게 하는 읽기 묶음입니다. */
export type ReadCoalescer = {
  /**
   * 읽기가 진행 중이 아니면 읽기를 시작하고, 진행 중이면 끝난 뒤 한 번만 다시 읽도록 표시만 합니다.
   * readOnce는 읽기 한 번을 수행하고 계속 읽을 수 있으면 true를, 그만둬야 하면 false를 돌려줍니다.
   * 돌려준 promise는 표시된 다시 읽기까지 모두 끝나면 이룹니다.
   */
  run: (readOnce: () => Promise<boolean>) => Promise<void>;
};

/**
 * 읽는 중에 변경 신호가 여러 번 와도 읽기가 끝난 뒤 한 번만 다시 읽는 읽기 묶음을 만듭니다.
 * 서버는 bd를 한 번에 하나씩 실행하므로 알림마다 읽으면 조회가 쌓여, 그 뒤에 줄 선 쓰기가 늦어집니다.
 */
export function createReadCoalescer(): ReadCoalescer {
  let reading: Promise<void> | null = null;
  let changedAgain = false;

  const read = async (readOnce: () => Promise<boolean>) => {
    let keepGoing: boolean;
    do {
      changedAgain = false;
      keepGoing = await readOnce();
    } while (keepGoing && changedAgain);
  };

  return {
    run(readOnce) {
      if (reading) {
        changedAgain = true;
        return reading;
      }
      reading = read(readOnce).finally(() => {
        reading = null;
      });
      return reading;
    },
  };
}
