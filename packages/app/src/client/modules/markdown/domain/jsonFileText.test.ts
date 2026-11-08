import { expect, test } from "vitest";
import { prettyJsonRecords } from "./jsonFileText";

test("JSON은 토큰을 바꾸지 않고 중첩과 빈 컨테이너를 들여쓴다", () => {
  const raw = String.raw` { "a" : [900719925474099312345, {"x":"\u0061\n\"\\\/","x":-0.00e+02}], "b":true,"c":null,"empty":{} } `;
  const [record] = prettyJsonRecords(raw, "json");
  expect(record?.valid).toBe(true);
  expect(record?.text).toBe(String.raw`{
  "a": [
    900719925474099312345,
    {
      "x": "\u0061\n\"\\\/",
      "x": -0.00e+02
    }
  ],
  "b": true,
  "c": null,
  "empty": {}
}`);
});

test.each(["null", "true", "false", '"문자열"', "-0.1E+9", "[]", "{}"])(
  "최상위 스칼라와 빈 컨테이너도 유효하다: %s",
  (raw) => {
    expect(prettyJsonRecords(raw, "json")).toEqual([{ text: raw, valid: true }]);
  },
);

test.each([
  "",
  " ",
  "{",
  '{"a":1,}',
  "[1,]",
  "[1 2]",
  "{}{}",
  '{"a" 1}',
  "{1:2}",
  "01",
  "+1",
  "NaN",
  '"\\x20"',
  '"줄\n바꿈"',
  "\uFEFFnull",
  "[true,false,undefined]",
])("유효하지 않은 JSON은 공백까지 원문을 남긴다: %j", (raw) => {
  expect(prettyJsonRecords(raw, "json")).toEqual([{ text: raw, valid: false }]);
});

test("JSONL은 각 줄을 독립 처리하고 잘못된 줄과 빈 줄만 원문으로 남긴다", () => {
  expect(prettyJsonRecords('{"a":[1]}\r\n bad \n\n[true,null]\n42\n', "jsonl")).toEqual([
    { text: '{\n  "a": [\n    1\n  ]\n}', valid: true },
    { text: " bad ", valid: false },
    { text: "", valid: false },
    { text: "[\n  true,\n  null\n]", valid: true },
    { text: "42", valid: true },
  ]);
  expect(prettyJsonRecords("", "jsonl")).toEqual([]);
});

test("깊은 중첩도 호출 스택을 쓰지 않는다", () => {
  const raw = "[".repeat(1000) + "0" + "]".repeat(1000);
  expect(prettyJsonRecords(raw, "json")[0]?.valid).toBe(true);
});
