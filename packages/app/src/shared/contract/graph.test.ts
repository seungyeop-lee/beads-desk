import { expect, test } from "vitest";
import { graphPath, parseIncludeClosed } from "./graph";

test.each([true, false])(
  "닫힌 이슈 포함 여부를 query로 바꿨다가 그대로 되돌린다: %s",
  (includeClosed) => {
    const params = new URL(graphPath(includeClosed), "http://localhost").searchParams;

    expect(parseIncludeClosed(params)).toBe(includeClosed);
  },
);
