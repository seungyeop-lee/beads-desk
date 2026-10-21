import { describe, expect, test } from "vitest";
import { bdBin, type BdBinHost } from "./bdBin";

const NPM_PREFIX = String.raw`C:\Users\me\AppData\Roaming\npm`;
const NPM_BD_EXE = String.raw`C:\Users\me\AppData\Roaming\npm\node_modules\@beads\bd\bin\bd.exe`;

function windows(env: NodeJS.ProcessEnv, files: string[]): BdBinHost {
  return { platform: "win32", env, isFile: (path) => files.includes(path) };
}

describe("bdBin", () => {
  describe("macOS와 Linux", () => {
    test("BD_BIN이 있으면 그 값을 쓴다", () => {
      const host: BdBinHost = {
        platform: "darwin",
        env: { BD_BIN: "/opt/bd/bd", PATH: "/usr/bin" },
        isFile: () => false,
      };

      expect(bdBin(host)).toBe("/opt/bd/bd");
    });

    test("BD_BIN이 없으면 PATH를 뒤지지 않고 bd를 쓴다", () => {
      const host: BdBinHost = { platform: "linux", env: { PATH: "/usr/bin" }, isFile: () => true };

      expect(bdBin(host)).toBe("bd");
    });
  });

  describe("Windows", () => {
    test("PATH에 bd.exe가 있으면 그 경로를 쓴다", () => {
      const host = windows({ Path: String.raw`C:\Windows;C:\tools\beads` }, [
        String.raw`C:\tools\beads\bd.exe`,
      ]);

      expect(bdBin(host)).toBe(String.raw`C:\tools\beads\bd.exe`);
    });

    test("PATH에 npm shim bd.cmd만 있으면 shim이 감싸는 bd.exe를 쓴다", () => {
      const host = windows({ PATH: `C:\\Windows;${NPM_PREFIX}` }, [
        `${NPM_PREFIX}\\bd.cmd`,
        NPM_BD_EXE,
      ]);

      expect(bdBin(host)).toBe(NPM_BD_EXE);
    });

    test("PATH 항목이 따옴표로 감싸여 있어도 디렉터리로 읽는다", () => {
      const host = windows({ PATH: String.raw`"C:\Program Files\beads";C:\Windows` }, [
        String.raw`C:\Program Files\beads\bd.exe`,
      ]);

      expect(bdBin(host)).toBe(String.raw`C:\Program Files\beads\bd.exe`);
    });

    test("앞선 PATH 디렉터리의 bd.cmd가 bd.exe로 풀리지 않으면 뒤 디렉터리의 bd.exe를 쓴다", () => {
      const host = windows({ PATH: String.raw`C:\pnpm;C:\tools\beads` }, [
        String.raw`C:\pnpm\bd.cmd`,
        String.raw`C:\tools\beads\bd.exe`,
      ]);

      expect(bdBin(host)).toBe(String.raw`C:\tools\beads\bd.exe`);
    });

    test("BD_BIN이 .exe를 가리키면 그대로 쓴다", () => {
      const host = windows({ BD_BIN: String.raw`D:\bin\bd.exe`, PATH: NPM_PREFIX }, [
        `${NPM_PREFIX}\\bd.cmd`,
        NPM_BD_EXE,
      ]);

      expect(bdBin(host)).toBe(String.raw`D:\bin\bd.exe`);
    });

    test("BD_BIN이 npm shim .cmd를 가리키면 shim이 감싸는 bd.exe를 쓴다", () => {
      const host = windows({ bd_bin: `${NPM_PREFIX}\\BD.CMD` }, [NPM_BD_EXE]);

      expect(bdBin(host)).toBe(NPM_BD_EXE);
    });

    test("BD_BIN의 .cmd 옆에 bd.exe가 없으면 BD_BIN에 bd.exe 경로를 지정하라고 알린다", () => {
      const host = windows({ BD_BIN: String.raw`C:\pnpm\bd.cmd` }, [String.raw`C:\pnpm\bd.cmd`]);

      expect(() => bdBin(host)).toThrow(
        /C:\\pnpm\\bd\.cmd.*Set BD_BIN to the full path of bd\.exe/,
      );
    });

    test("PATH에서 bd.exe를 찾지 못하면 BD_BIN에 bd.exe 경로를 지정하라고 알린다", () => {
      const host = windows({ PATH: String.raw`C:\Windows;C:\pnpm` }, [String.raw`C:\pnpm\bd.cmd`]);

      expect(() => bdBin(host)).toThrow(/Set BD_BIN to the full path of bd\.exe/);
    });
  });
});
