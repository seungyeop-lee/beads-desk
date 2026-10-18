import { describe, expect, test } from "vitest";
import type { BdCommandLog, SceneLog } from "../capture/captureLog.ts";
import {
  cameraAt,
  formatBdCommand,
  terminalCommands,
  terminalScreen,
  type CameraKey,
} from "./introTimeline.ts";

const command = (args: string[], startMs: number, endMs: number): BdCommandLog => ({
  args,
  stdout: `✓ ${args[0]}\n`,
  startMs,
  endMs,
  shownMs: endMs + 3000,
});
const scene = (bdCommands: BdCommandLog[]): SceneLog => ({
  name: "live-updates",
  video: "live-updates.webm",
  bdCommands,
});

test("공백이 든 인자만 큰따옴표로 감싸 명령을 보인다", () => {
  expect(formatBdCommand(["close", "acme-7qx", "--reason", "Sending domain verified"])).toBe(
    'bd close acme-7qx --reason "Sending domain verified"',
  );
});

describe("터미널 명령의 입력 시각", () => {
  test("녹화에서 bd를 실행한 시각에 입력을 마치고 Enter를 누른다", () => {
    const [typed] = terminalCommands(scene([command(["update", "acme-k3v.6"], 2000, 2400)]));
    expect(typed).toMatchObject({ enterMs: 2000, outputMs: 2400 });
    expect(typed!.typeFromMs).toBeLessThan(2000);
  });

  test("앞 명령의 출력이 나오기 전에는 다음 명령을 입력하기 시작하지 않는다", () => {
    const [first, second] = terminalCommands(
      scene([command(["update", "a"], 2000, 2400), command(["close", "b"], 2500, 2700)]),
    );
    expect(second!.typeFromMs).toBeGreaterThanOrEqual(first!.outputMs);
    expect(second!.typeFromMs).toBeLessThanOrEqual(second!.enterMs);
  });
});

describe("녹화 시각에 따른 터미널 화면", () => {
  const commands = terminalCommands(scene([command(["update", "acme-k3v.6"], 2000, 2400)]));
  const { typeFromMs } = commands[0]!;

  test("입력하기 전에는 빈 프롬프트만 보인다", () => {
    expect(terminalScreen(commands, typeFromMs - 1)).toEqual({
      lines: [{ prompt: true, text: "" }],
      cursor: "idle",
    });
  });

  test("입력하는 동안에는 명령의 앞부분까지 보인다", () => {
    const { lines, cursor } = terminalScreen(commands, (typeFromMs + 2000) / 2);
    expect(cursor).toBe("typing");
    expect("bd update acme-k3v.6".startsWith(lines[0]!.text)).toBe(true);
    expect(lines[0]!.text.length).toBeGreaterThan(0);
    expect(lines[0]!.text.length).toBeLessThan("bd update acme-k3v.6".length);
  });

  test("Enter를 누른 뒤 bd가 끝날 때까지는 출력 없이 실행 중으로 보인다", () => {
    expect(terminalScreen(commands, 2200)).toEqual({
      lines: [{ prompt: true, text: "bd update acme-k3v.6" }],
      cursor: "running",
    });
  });

  test("bd가 끝나면 출력 뒤에 새 프롬프트가 보인다", () => {
    expect(terminalScreen(commands, 2400)).toEqual({
      lines: [
        { prompt: true, text: "bd update acme-k3v.6" },
        { prompt: false, text: "✓ update" },
        { prompt: true, text: "" },
      ],
      cursor: "idle",
    });
  });
});

describe("확대 상태", () => {
  const zoomIn: CameraKey = { atMs: 1000, scale: 1.25, origin: { x: 300, y: 760 } };

  test("첫 key 전에는 녹화 전체를 보인다", () => {
    expect(cameraAt([zoomIn], 1000).scale).toBe(1);
  });

  test("옮겨 가는 동안에는 앞 상태와 key 사이에 있다", () => {
    const { scale } = cameraAt([zoomIn], 1450);
    expect(scale).toBeGreaterThan(1);
    expect(scale).toBeLessThan(1.25);
  });

  test("다 옮겨 간 뒤에는 key의 상태에 머문다", () => {
    expect(cameraAt([zoomIn], 5000)).toEqual({ scale: 1.25, origin: { x: 300, y: 760 } });
  });
});
