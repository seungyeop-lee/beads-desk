import { expect, test } from "vitest";
import { assignWorkspaceSlugs } from "./workspaceSlugs";

test("디렉터리 이름을 그대로 쓴다", () => {
  expect(assignWorkspaceSlugs(["/work/beads-desk", "/work/acme.v2_x"])).toEqual([
    "beads-desk",
    "acme.v2_x",
  ]);
});

test("공백과 주소에 그대로 쓸 수 없는 문자는 _로 바꾼다", () => {
  expect(assignWorkspaceSlugs(["/work/my project?#%&+"])).toEqual(["my_project_____"]);
});

test("한글은 그대로 두고, 자모로 나뉜 이름은 합친다", () => {
  const decomposed = "/work/" + "작업".normalize("NFD");
  expect(assignWorkspaceSlugs(["/work/할 일", decomposed])).toEqual(["할_일", "작업"]);
});

test("이름이 겹치면 뒤에 등록한 workspace에 번호를 붙인다", () => {
  expect(assignWorkspaceSlugs(["/a/app", "/b/app", "/c/app", "/d/app-2"])).toEqual([
    "app",
    "app-2",
    "app-3",
    "app-2-2",
  ]);
});

test("치환한 결과가 겹쳐도 번호를 붙인다", () => {
  expect(assignWorkspaceSlugs(["/a/my app", "/b/my_app"])).toEqual(["my_app", "my_app-2"]);
});

test("경로로 해석되는 이름은 그대로 쓰지 않는다", () => {
  expect(assignWorkspaceSlugs(["/work/.", "/work/..", "/"])).toEqual(["_", "__", "_-2"]);
});
