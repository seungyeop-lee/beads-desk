import { describe, expect, test } from "vitest";
import { loadedAfterRead, workspaceReadState } from "./useWorkspaceRead";

describe("loadedAfterRead", () => {
  const loaded = { key: "a", data: ["old"], error: null };

  test("읽기에 성공하면 새 데이터로 바꾸고 오류를 지운다", () => {
    expect(loadedAfterRead({ ...loaded, error: "boom" }, "a", { ok: true, data: ["new"] })).toEqual(
      { key: "a", data: ["new"], error: null },
    );
  });

  test("같은 key를 다시 읽다 실패하면 마지막 데이터를 유지한 채 오류를 남긴다", () => {
    expect(loadedAfterRead(loaded, "a", { ok: false, error: "boom" })).toEqual({
      key: "a",
      data: ["old"],
      error: "boom",
    });
  });

  test("key를 바꾼 뒤 실패하면 이전 key의 데이터를 보이지 않는다", () => {
    expect(loadedAfterRead(loaded, "b", { ok: false, error: "boom" })).toEqual({
      key: "b",
      data: null,
      error: "boom",
    });
  });
});

describe("workspaceReadState", () => {
  test("지금 key의 결과가 아니면 데이터 없이 불러오는 중으로 보인다", () => {
    expect(workspaceReadState({ key: "a", data: ["old"], error: "boom" }, "b")).toEqual({
      data: null,
      error: null,
      loading: true,
    });
  });

  test("데이터도 오류도 아직 없으면 불러오는 중이고, 하나라도 있으면 불러오는 중이 아니다", () => {
    expect(workspaceReadState({ key: "a", data: null, error: null }, "a").loading).toBe(true);
    expect(workspaceReadState({ key: "a", data: null, error: "boom" }, "a").loading).toBe(false);
    expect(workspaceReadState({ key: "a", data: [], error: null }, "a").loading).toBe(false);
  });
});
