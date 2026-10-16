import { execFile } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { isProcessRunning } from "./runQueue";

const execFileAsync = promisify(execFile);

/** 이 값을 "0"으로 주면 RAM disk를 만들지 않고 기본 임시 디렉터리를 씁니다. */
const DISABLE_ENV = "BEADS_DESK_E2E_RAMDISK";
/** volume 이름은 이 접두사에 Playwright 실행 프로세스의 pid를 붙여 만듭니다. 다른 worktree의 e2e가 동시에 돌아도 이름이 겹치지 않습니다. */
const VOLUME_PREFIX = "beads-desk-e2e-";
/** 512바이트 sector 수입니다. 512MB이고, worker 8개로 전체를 실행할 때 쓰는 양은 약 52MB였습니다. */
const SECTORS = 1_048_576;

/**
 * Playwright global setup입니다. macOS에서 RAM disk를 붙이고 TMPDIR을 그 아래로 바꿉니다.
 * worker와 worker가 띄우는 `next start`는 이 환경 변수를 물려받으므로, `os.tmpdir()`로 만드는
 * 시나리오 workspace와 template이 모두 RAM disk에 생깁니다.
 * 반환한 함수는 Playwright가 실행이 끝날 때 teardown으로 호출합니다.
 */
export default async function mountRamDisk(): Promise<(() => Promise<void>) | undefined> {
  if (!usesRamDisk()) return undefined;

  await ejectAbandonedVolumes();

  const volumeName = `${VOLUME_PREFIX}${process.pid}`;
  const mountPoint = join("/Volumes", volumeName);
  const tmp = join(mountPoint, "tmp");
  let device: string | undefined;
  try {
    device = (await diskutil("image", "attach", "--noMount", `ram://${SECTORS}`)).trim();
    await diskutil("erasevolume", "APFS", volumeName, device);
    await mkdir(tmp);
  } catch (error) {
    if (device) await diskutil("eject", device);
    console.warn(`RAM disk를 만들지 못해 기본 임시 디렉터리를 씁니다.\n${String(error)}`);
    return undefined;
  }

  process.env.TMPDIR = tmp;
  return () => eject(mountPoint);
}

/** RAM disk를 만들어 보는 환경인지 돌려줍니다. 만들다 실패해 기본 임시 디렉터리로 돌아가는 경우는 알 수 없습니다. */
export function usesRamDisk(): boolean {
  return process.platform === "darwin" && process.env[DISABLE_ENV] !== "0";
}

/**
 * RAM disk를 뗍니다. volume 경로로 eject하면 RAM 장치까지 떼어집니다.
 * 열린 파일이 없는데도 eject가 거부될 때가 있어(원인 미확인), 그러면 강제로 unmount한 뒤 RAM 장치를 뗍니다.
 * 그래도 떼지 못하면 경고만 남겨 시나리오 결과가 실행 결과로 그대로 남게 하고, 남은 volume은 다음 실행이 다시 정리합니다.
 */
async function eject(mountPoint: string): Promise<void> {
  try {
    await diskutil("eject", mountPoint);
    return;
  } catch (error) {
    console.warn(`RAM disk ${mountPoint}을 떼지 못해 강제로 unmount합니다.\n${String(error)}`);
  }
  try {
    const store = /APFS Physical Store:\s+(\S+)/.exec(await diskutil("info", mountPoint))?.[1];
    if (!store) throw new Error(`${mountPoint}의 RAM 장치를 찾지 못했습니다.`);
    await diskutil("unmountDisk", "force", mountPoint);
    await diskutil("eject", store);
  } catch (error) {
    console.warn(
      `RAM disk ${mountPoint}을 강제로도 떼지 못했습니다. 다음 실행이 다시 정리합니다.\n${String(error)}`,
    );
  }
}

/** 실행이 비정상으로 끝나 남은 volume, 즉 이름에 붙은 pid의 프로세스가 이미 끝난 volume을 뗍니다. */
async function ejectAbandonedVolumes(): Promise<void> {
  for (const name of await readdir("/Volumes")) {
    if (!name.startsWith(VOLUME_PREFIX)) continue;
    const pid = Number(name.slice(VOLUME_PREFIX.length));
    if (!Number.isInteger(pid) || isProcessRunning(pid)) continue;
    await eject(join("/Volumes", name));
  }
}

async function diskutil(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("diskutil", args);
  return stdout;
}
