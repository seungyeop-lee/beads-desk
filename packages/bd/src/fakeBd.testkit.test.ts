import { expect, test } from "vitest";
import { fakeBdWorkspace } from "./fakeBd.testkit";

// 셸에 BD_BIN이 있어도 "원래 없던 BD_BIN"을 재현하도록, 헬퍼가 원래 값을 읽기 전에 지웁니다.
delete process.env.BD_BIN;
const fakeBd = fakeBdWorkspace("beads-desk-fake-bd-");

// afterEach가 끝난 뒤의 상태는 다음 테스트에서만 볼 수 있으므로, 두 테스트는 이 순서로 실행되어야 합니다.
test("테스트 안에서는 가짜 bd를 BD_BIN으로 지정한다", async () => {
  await fakeBd.useFakeBdScript("exit 0");

  expect(process.env.BD_BIN).toBe(`${fakeBd.workDir}/fake-bd`);
});

test("원래 없던 BD_BIN은 앞 테스트가 끝난 뒤 지워져 있다", () => {
  expect("BD_BIN" in process.env).toBe(false);
});
