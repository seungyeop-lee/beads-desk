import { useCurrentFrame } from "remotion";
import { TitleBar } from "./BrowserWindow.tsx";
import { FPS, terminalScreen, type TerminalCommand } from "./introTimeline.ts";

const PROMPT = "acme-web $ ";
const CURSOR_BLINK_MS = 1000;

/** hero의 터미널입니다. 녹화하는 동안 실행한 bd 명령을 녹화와 같은 시각에 입력하고 출력합니다. */
export function Terminal({
  commands,
  fromMs,
  width,
  height,
}: {
  commands: TerminalCommand[];
  fromMs: number;
  width: number;
  height: number;
}) {
  const ms = fromMs + (useCurrentFrame() * 1000) / FPS;
  const { lines, cursor } = terminalScreen(commands, ms);
  const cursorBlock = (
    <span
      style={{
        display: "inline-block",
        width: "0.6em",
        height: "1.2em",
        verticalAlign: "text-bottom",
        background:
          cursor !== "idle" || ms % CURSOR_BLINK_MS < CURSOR_BLINK_MS / 2
            ? "#e7e5e4"
            : "transparent",
      }}
    />
  );

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 12,
        overflow: "hidden",
        background: "#1c1917",
        boxShadow: "0 24px 60px rgba(28, 25, 23, 0.28)",
      }}
    >
      <TitleBar color="#292524" title="acme-web" />
      <div
        style={{
          padding: "18px 20px",
          fontFamily: '"SF Mono", Menlo, Monaco, monospace',
          fontSize: 19,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            style={{
              color: line.prompt ? "#e7e5e4" : "#a8a29e",
              marginBottom: line.prompt ? 0 : 14,
            }}
          >
            {line.prompt ? <span style={{ color: "#86efac" }}>{PROMPT}</span> : null}
            {line.text}
            {cursor !== "running" && index === lines.length - 1 ? cursorBlock : null}
          </div>
        ))}
        {cursor === "running" ? <div>{cursorBlock}</div> : null}
      </div>
    </div>
  );
}
