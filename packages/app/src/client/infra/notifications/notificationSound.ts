/** 소리를 낼 수 있게 되기를 기다리는 시간입니다. 브라우저가 허용하면 resume은 바로 끝납니다. */
const RESUME_TIMEOUT_MS = 500;
/** 두 음을 차례로 울리는 짧은 알림음입니다. 시작 시각과 길이는 초 단위이고, 마지막 음이 가장 늦게 끝납니다. */
const CHIME = [
  { frequency: 880, start: 0, duration: 0.18 },
  { frequency: 1320, start: 0.12, duration: 0.28 },
];
const PEAK_GAIN = 0.2;

/**
 * 짧은 알림음을 재생하고, 재생했는지 돌려줍니다. 브라우저가 소리를 막거나 Web Audio를 쓸 수 없으면 오류 없이 false입니다.
 * 브라우저는 사용자가 한 번도 누르지 않은 탭에서 소리를 막고, 이때 resume은 실패하지 않고 그 탭을 누를 때까지 끝나지 않습니다.
 * 그때까지 기다렸다가 재생하면 알림과 동떨어진 때에 소리가 나므로, 잠깐 안에 소리를 낼 수 있게 되지 않으면 재생하지 않습니다.
 */
export async function playNotificationSound(): Promise<boolean> {
  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    await Promise.race([context.resume(), wait(RESUME_TIMEOUT_MS)]);
    if (context.state === "running") {
      playChime(context);
      return true;
    }
  } catch {
    // Web Audio를 지원하지 않거나 재생이 실패하면 소리만 내지 않습니다.
  }
  void context?.close().catch(() => {});
  return false;
}

function playChime(context: AudioContext) {
  const startAt = context.currentTime;
  let last: OscillatorNode | undefined;
  for (const tone of CHIME) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const toneStart = startAt + tone.start;
    const toneEnd = toneStart + tone.duration;
    oscillator.frequency.value = tone.frequency;
    // 음량을 0에서 올리고 끝에서 0 가까이로 줄여야, 음이 시작하고 끝날 때 딸깍 소리가 나지 않습니다.
    gain.gain.setValueAtTime(0, toneStart);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, toneStart + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, toneEnd);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd);
    last = oscillator;
  }
  last?.addEventListener("ended", () => void context.close());
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
