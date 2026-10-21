import { expect, onTestFinished, test } from "vitest";
import "./routeApiTest";

// 셸에 BEADS_DESK_WORKSPACE가 있어도 "원래 없던 BEADS_DESK_WORKSPACE"를 재현하도록, 첫 테스트가 시작되기 전에 지웁니다.
delete process.env.BEADS_DESK_WORKSPACE;

// routeApiTest의 beforeEach가 테스트마다 값을 다시 지정하므로, afterEach가 되돌린 상태는 그 뒤에 실행되는 onTestFinished에서 확인합니다.
test("테스트 안에서는 workspace를 지정하고, 원래 없던 BEADS_DESK_WORKSPACE는 테스트가 끝나면 지운다", () => {
  onTestFinished(() => {
    expect("BEADS_DESK_WORKSPACE" in process.env).toBe(false);
  });

  expect(process.env.BEADS_DESK_WORKSPACE).toBe("/workspace");
});
