import type { Locator } from "playwright";
import type { RecordingEvent } from "../video/introTimeline.ts";

export async function measureTargets(
  scene: string,
  targets: Record<string, Locator>,
): Promise<NonNullable<RecordingEvent["boxes"]>> {
  const boxes: NonNullable<RecordingEvent["boxes"]> = {};
  for (const [name, locator] of Object.entries(targets)) {
    const message = `${scene} 장면에서 ${name} 대상의 위치를 잴 수 없습니다.`;
    const box = await locator.boundingBox({ timeout: 1500 }).catch((cause: unknown) => {
      throw new Error(message, { cause });
    });
    if (!box) throw new Error(message);
    boxes[name] = box;
  }
  return boxes;
}
