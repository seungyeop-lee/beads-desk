import { expect, test } from "vitest";
import { diffCommitMessage, diffFileTree } from "./localDiffView";

test("하위 항목이 폴더 하나뿐인 폴더는 한 줄로 합치고, 파일이 바로 들어 있거나 하위 폴더가 둘 이상인 폴더는 합치지 않는다", () => {
  expect(
    diffFileTree([
      "src/checkout/payment/PaymentForm.tsx",
      "src/checkout/payment/CardField.tsx",
      "docs/guide/usage/intro.md",
      "src/checkout/summary.ts",
      "src/api/client.ts",
    ]),
  ).toEqual([
    {
      kind: "folder",
      name: "docs/guide/usage",
      path: "docs/guide/usage",
      children: [{ kind: "file", name: "intro.md", file: 2 }],
    },
    {
      kind: "folder",
      name: "src",
      path: "src",
      children: [
        {
          kind: "folder",
          name: "api",
          path: "src/api",
          children: [{ kind: "file", name: "client.ts", file: 4 }],
        },
        {
          kind: "folder",
          name: "checkout",
          path: "src/checkout",
          children: [
            {
              kind: "folder",
              name: "payment",
              path: "src/checkout/payment",
              children: [
                { kind: "file", name: "CardField.tsx", file: 1 },
                { kind: "file", name: "PaymentForm.tsx", file: 0 },
              ],
            },
            { kind: "file", name: "summary.ts", file: 3 },
          ],
        },
      ],
    },
  ]);
});

test("같은 폴더 안에서는 폴더를 먼저 두고, 이름은 대소문자를 가리지 않고 숫자 크기대로 늘어놓는다", () => {
  expect(diffFileTree(["b.ts", "lib/x.ts", "A.ts", "step10.ts", "step9.ts", "Zeta/y.ts"])).toEqual([
    {
      kind: "folder",
      name: "lib",
      path: "lib",
      children: [{ kind: "file", name: "x.ts", file: 1 }],
    },
    {
      kind: "folder",
      name: "Zeta",
      path: "Zeta",
      children: [{ kind: "file", name: "y.ts", file: 5 }],
    },
    { kind: "file", name: "A.ts", file: 2 },
    { kind: "file", name: "b.ts", file: 0 },
    { kind: "file", name: "step9.ts", file: 4 },
    { kind: "file", name: "step10.ts", file: 3 },
  ]);
});

test("같은 경로가 두 번 나오거나 경로가 없는 파일 diff도 파일마다 한 항목으로 둔다", () => {
  expect(diffFileTree(["a.ts", undefined, "a.ts"])).toEqual([
    { kind: "file", name: undefined, file: 1 },
    { kind: "file", name: "a.ts", file: 0 },
    { kind: "file", name: "a.ts", file: 2 },
  ]);
});

test("git format-patch의 메일 머리에서 접어 쓴 Subject를 이어 [PATCH] 접두사를 뗀 제목으로 쓰고, 나머지 머리와 본문 뒤에 서명을 잇는다", () => {
  const before = [
    "From 3f9c2a1 Mon Sep 17 00:00:00 2001",
    "From: Kim <kim@example.com>",
    "Date: Tue, 3 Nov 2026 10:00:00 +0900",
    "Subject: [PATCH 1/2] Show inline card errors",
    " instead of a toast",
    "",
    "Card errors now appear under the field.",
    "---",
    " src/checkout/PaymentForm.tsx | 3 ++-",
  ].join("\n");
  expect(diffCommitMessage(before, "-- \n2.47.0")).toEqual({
    title: "Show inline card errors instead of a toast",
    body: [
      "From 3f9c2a1 Mon Sep 17 00:00:00 2001",
      "From: Kim <kim@example.com>",
      "Date: Tue, 3 Nov 2026 10:00:00 +0900",
      "",
      "Card errors now appear under the field.",
      "---",
      " src/checkout/PaymentForm.tsx | 3 ++-",
      "",
      "-- ",
      "2.47.0",
    ].join("\n"),
  });
});

test("Subject 줄이 없으면 첫 줄을 제목으로 쓰고, before가 없으면 after에서 제목을 꺼낸다", () => {
  expect(diffCommitMessage("리뷰 반영\n\n오류 문구를 고쳤습니다.", "")).toEqual({
    title: "리뷰 반영",
    body: "오류 문구를 고쳤습니다.",
  });
  expect(diffCommitMessage("", "검토 메모\n두 번째 줄")).toEqual({
    title: "검토 메모",
    body: "두 번째 줄",
  });
  expect(diffCommitMessage("", "")).toBeNull();
});
