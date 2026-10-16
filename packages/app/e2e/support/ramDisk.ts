import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** 이 값을 "0"으로 주면 RAM disk를 만들지 않고 기본 임시 디렉터리를 씁니다. */
const DISABLE_ENV = "BEADS_DESK_E2E_RAMDISK";
const VOLUME_NAME = "beads-desk-e2e";
const MOUNT_POINT = `/Volumes/${VOLUME_NAME}`;
/** 512바이트 sector 수입니다. 512MB이고, worker 8개로 전체를 실행할 때 쓰는 양은 약 52MB였습니다. */
const SECTORS = 1_048_576;

/**
 * Playwright global setup입니다. macOS에서 RAM disk를 붙이고 TMPDIR을 그 아래로 바꿉니다.
 * worker와 worker가 띄우는 `next start`는 이 환경 변수를 물려받으므로, `os.tmpdir()`로 만드는
 * 시나리오 workspace와 template이 모두 RAM disk에 생깁니다.
 * 반환한 함수는 Playwright가 실행이 끝날 때 teardown으로 호출합니다.
 */
export default async function mountRamDisk(): Promise<(() => Promise<void>) | undefined> {
  if (process.platform !== "darwin" || process.env[DISABLE_ENV] === "0") return undefined;

  // 앞 실행이 비정상으로 끝나 남은 volume입니다. volume 경로로 eject하면 RAM 장치까지 떼어집니다.
  if (existsSync(MOUNT_POINT)) await diskutil("eject", MOUNT_POINT);

  const tmp = join(MOUNT_POINT, "tmp");
  let device: string | undefined;
  try {
    device = (await diskutil("image", "attach", "--noMount", `ram://${SECTORS}`)).trim();
    await diskutil("erasevolume", "APFS", VOLUME_NAME, device);
    await mkdir(tmp);
  } catch (error) {
    if (device) await diskutil("eject", device);
    console.warn(`RAM disk를 만들지 못해 기본 임시 디렉터리를 씁니다.\n${String(error)}`);
    return undefined;
  }

  process.env.TMPDIR = tmp;
  const mounted = device;
  return async () => {
    await diskutil("eject", mounted);
  };
}

async function diskutil(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("diskutil", args);
  return stdout;
}
