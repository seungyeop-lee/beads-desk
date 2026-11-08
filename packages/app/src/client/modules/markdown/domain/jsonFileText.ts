export type JsonFileFormat = "json" | "jsonl";
export type JsonRecord = { text: string; valid: boolean };

type Frame = {
  kind: "object" | "array" | "root";
  next: "keyOrEnd" | "key" | "colon" | "valueOrEnd" | "value" | "commaOrEnd" | "end";
};

/** 값으로 변환하지 않고 토큰을 옮겨 큰 정수·중복 키·escape의 표기를 보존합니다. */
export function prettyJsonRecords(text: string, format: JsonFileFormat): JsonRecord[] {
  if (format === "json") return [prettyRecord(text)];
  if (!text) return [];
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines.map(prettyRecord);
}

function prettyRecord(raw: string): JsonRecord {
  const tokenPattern =
    /[ \t\r\n]+|"(?:[^"\\]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}[\]:,]/gy;
  const frames: Frame[] = [{ kind: "root", next: "value" }];
  const tokens: string[] = [];
  let offset = 0;
  while (offset < raw.length) {
    tokenPattern.lastIndex = offset;
    const match = tokenPattern.exec(raw);
    if (!match) return { text: raw, valid: false };
    offset = tokenPattern.lastIndex;
    const token = match[0];
    if (/^[ \t\r\n]/.test(token)) continue;
    if (token.startsWith('"')) {
      for (let index = 1; index < token.length - 1; index++) {
        if (token.charCodeAt(index) < 32) return { text: raw, valid: false };
      }
    }
    const frame = frames.at(-1)!;
    if ((token === "}" && frame.kind === "object") || (token === "]" && frame.kind === "array")) {
      if (!["keyOrEnd", "valueOrEnd", "commaOrEnd"].includes(frame.next))
        return { text: raw, valid: false };
      frames.pop();
    } else if (frame.next === "key" || frame.next === "keyOrEnd") {
      if (!token.startsWith('"')) return { text: raw, valid: false };
      frame.next = "colon";
    } else if (frame.next === "colon") {
      if (token !== ":") return { text: raw, valid: false };
      frame.next = "value";
    } else if (frame.next === "commaOrEnd") {
      if (token !== ",") return { text: raw, valid: false };
      frame.next = frame.kind === "object" ? "key" : "value";
    } else if (frame.next === "value" || frame.next === "valueOrEnd") {
      if (/^[}\]:,]$/.test(token)) return { text: raw, valid: false };
      frame.next = frame.kind === "root" ? "end" : "commaOrEnd";
      if (token === "{" || token === "[") {
        frames.push({
          kind: token === "{" ? "object" : "array",
          next: token === "{" ? "keyOrEnd" : "valueOrEnd",
        });
      }
    } else {
      return { text: raw, valid: false };
    }
    tokens.push(token);
  }
  if (frames.length !== 1 || frames[0]!.next !== "end") return { text: raw, valid: false };
  const parts: string[] = [];
  let depth = 0;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (token === "{" || token === "[") {
      parts.push(token);
      depth++;
      if (tokens[index + 1] !== (token === "{" ? "}" : "]")) parts.push("\n", "  ".repeat(depth));
    } else if (token === "}" || token === "]") {
      depth--;
      if (tokens[index - 1] !== (token === "}" ? "{" : "[")) parts.push("\n", "  ".repeat(depth));
      parts.push(token);
    } else if (token === ",") {
      parts.push(",\n", "  ".repeat(depth));
    } else {
      parts.push(token === ":" ? ": " : token);
    }
  }
  return { text: parts.join(""), valid: true };
}
