import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = resolve(SITE_DIR, "../../docs");
const PUBLIC_MEDIA_DIR = join(SITE_DIR, "public/media");
const PUBLIC_SCREENSHOTS_DIR = join(PUBLIC_MEDIA_DIR, "screenshots");

function copyIfChanged(sourcePath, targetPath) {
  const sourceStat = statSync(sourcePath);
  try {
    const targetStat = statSync(targetPath);
    if (targetStat.size === sourceStat.size && targetStat.mtimeMs >= sourceStat.mtimeMs) {
      return;
    }
  } catch {
    // 대상 파일이 없으면 새로 복사합니다.
  }
  copyFileSync(sourcePath, targetPath);
}

// README와 같은 원본 자산을 써서 저장소에 대용량 바이너리가 중복 커밋되지 않게 합니다.
mkdirSync(PUBLIC_SCREENSHOTS_DIR, { recursive: true });
copyIfChanged(
  join(DOCS_DIR, "beads-desk-intro.mp4"),
  join(PUBLIC_MEDIA_DIR, "beads-desk-intro.mp4"),
);

const screenshotsDir = join(DOCS_DIR, "screenshots");
for (const entry of readdirSync(screenshotsDir)) {
  if (!entry.endsWith(".png")) continue;
  copyIfChanged(join(screenshotsDir, entry), join(PUBLIC_SCREENSHOTS_DIR, entry));
}
