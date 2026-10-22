import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

/**
 * 데모 이슈 본문이 로컬 파일 링크로 거는, 에이전트가 staging에서 결제 화면을 확인하고 남긴 스크린샷, 녹화, 확인 메모, 고친 코드의 diff입니다.
 * 이 파일을 직접 실행하면 `<디렉터리>`에 네 파일을 만듭니다.
 */
export const CHECKOUT_SCREENSHOT = "checkout-staging.png";
export const CHECKOUT_RECORDING = "checkout-test-payment.webm";
export const CHECKOUT_NOTES = "staging-check-notes.md";
export const CHECKOUT_DIFF = "inline-card-errors.diff";

const SCREENSHOT_SIZE = { width: 1200, height: 600 };
const RECORDING_SIZE = { width: 960, height: 576 };

/**
 * dir에 스크린샷과 녹화를 만듭니다. seed는 bd와 git을 동기로 실행하는 흐름이라,
 * 비동기인 Playwright는 이 파일을 별도 process로 실행해 끝날 때까지 기다립니다. chromium이 설치되어 있어야 합니다.
 */
export function writeCheckoutAttachments(dir: string): void {
  execFileSync(process.execPath, [fileURLToPath(import.meta.url), dir], { stdio: "inherit" });
}

async function render(dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, CHECKOUT_NOTES), STAGING_CHECK_NOTES);
  writeFileSync(join(dir, CHECKOUT_DIFF), INLINE_CARD_ERRORS_DIFF);
  const browser = await chromium.launch();
  try {
    const shotPage = await browser.newPage({ viewport: SCREENSHOT_SIZE });
    await shotPage.setContent(CHECKOUT_PAGE);
    await shotPage.getByLabel("Card number").fill("4242 4242 4242 4242");
    await shotPage.getByLabel("Expiry").fill("12 / 34");
    await shotPage.getByLabel("CVC").fill("123");
    await shotPage.getByLabel("CVC").blur();
    await shotPage.screenshot({ path: join(dir, CHECKOUT_SCREENSHOT) });

    const videoDir = mkdtempSync(join(tmpdir(), "beads-desk-promo-video-"));
    try {
      const context = await browser.newContext({
        viewport: RECORDING_SIZE,
        recordVideo: { dir: videoDir, size: RECORDING_SIZE },
      });
      const page = await context.newPage();
      await page.setContent(CHECKOUT_PAGE);
      await page.waitForTimeout(300);
      await page.getByLabel("Card number").pressSequentially("4242 4242 4242 4242", { delay: 35 });
      await page.getByLabel("Expiry").pressSequentially("12 / 34", { delay: 35 });
      await page.getByLabel("CVC").pressSequentially("123", { delay: 35 });
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: "Pay $53.90" }).click();
      await page.getByText("Payment succeeded").waitFor();
      await page.waitForTimeout(1500);
      await context.close();
      await page.video()!.saveAs(join(dir, CHECKOUT_RECORDING));
    } finally {
      rmSync(videoDir, { recursive: true, force: true });
    }
  } finally {
    await browser.close();
  }
}

/** 에이전트가 staging 결제를 확인하며 남긴 메모입니다. 미리보기가 제목, 강조, 목록, 코드 블록의 구문 강조를 보이도록 각각 하나씩 넣습니다. */
const STAGING_CHECK_NOTES = `# Staging check

- **Card:** test payment with \`4242 4242 4242 4242\` succeeded
- **Apple Pay:** the payment sheet opens in Safari
- **Declined card:** the error showed as a toast, away from the form

\`\`\`ts
const { error } = await stripe.confirmPayment({ elements });
// error.code === "card_declined"
\`\`\`
`;

/** Stripe 오류를 toast 대신 결제 form 옆에 보이도록 고친 diff입니다. 미리보기가 줄 안 단어 강조를 보이도록, 바뀐 줄 하나는 비슷한 줄로 바꿉니다. */
const INLINE_CARD_ERRORS_DIFF = `diff --git a/src/checkout/PaymentForm.tsx b/src/checkout/PaymentForm.tsx
--- a/src/checkout/PaymentForm.tsx
+++ b/src/checkout/PaymentForm.tsx
@@ -38,9 +38,10 @@ export function PaymentForm({ plan }: PaymentFormProps) {
   async function pay() {
     setStatus("processing");
     const { error } = await stripe.confirmPayment({ elements });
     if (error) {
-      toast.error("Payment failed. Try again.");
+      setCardError(error.message ?? "Payment failed. Try again.");
       setStatus("idle");
+      cardField.current?.focus();
       return;
     }
     setStatus("paid");
`;

/** staging의 결제 화면을 흉내 낸 page입니다. Pay를 누르면 잠시 처리 중을 보인 뒤 결제 완료 안내로 바뀝니다. */
const CHECKOUT_PAGE = `<!doctype html>
<html><head><style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #1f2937; background: #f3f4f6; }
  header { display: flex; align-items: center; gap: 12px; padding: 14px 32px; background: #fff; border-bottom: 1px solid #e5e7eb; }
  .logo { font-weight: 700; font-size: 20px; letter-spacing: -0.5px; }
  .badge { padding: 2px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 600; }
  main { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: start; max-width: 920px; margin: 40px auto; padding: 0 24px; }
  section { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px 28px; }
  h2 { margin: 0 0 16px; font-size: 17px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
  .total { font-weight: 700; border-bottom: 0; }
  label { display: block; margin: 12px 0 4px; font-size: 13px; color: #4b5563; }
  input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font: inherit; }
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  button { width: 100%; margin-top: 18px; padding: 12px; border: 0; border-radius: 8px; font: inherit; font-weight: 600; cursor: pointer; }
  .pay { background: #4f46e5; color: #fff; }
  .apple { background: #111; color: #fff; margin-top: 10px; }
  .done { display: none; text-align: center; padding: 48px 0; }
  .done strong { display: block; font-size: 20px; color: #047857; margin-bottom: 6px; }
  body.paid form { display: none; }
  body.paid .done { display: block; }
</style></head><body>
<header><span class="logo">acme</span><span class="badge">staging</span></header>
<main>
  <section>
    <h2>Order summary</h2>
    <div class="row"><span>Team plan, monthly</span><span>$49.00</span></div>
    <div class="row"><span>Tax</span><span>$4.90</span></div>
    <div class="row total"><span>Due today</span><span>$53.90</span></div>
  </section>
  <section>
    <h2>Payment</h2>
    <form onsubmit="event.preventDefault(); const b = this.querySelector('.pay'); b.textContent = 'Processing…'; setTimeout(() => document.body.classList.add('paid'), 600);">
      <label for="email">Email</label><input id="email" value="maya@acme.example">
      <label for="card">Card number</label><input id="card" placeholder="1234 1234 1234 1234">
      <div class="split">
        <div><label for="exp">Expiry</label><input id="exp" placeholder="MM / YY"></div>
        <div><label for="cvc">CVC</label><input id="cvc" placeholder="CVC"></div>
      </div>
      <button class="pay" type="submit">Pay $53.90</button>
      <button class="apple" type="button">Apple Pay</button>
    </form>
    <div class="done"><strong>Payment succeeded</strong>A receipt is on its way to maya@acme.example.</div>
  </section>
</main>
</body></html>`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await render(process.argv[2]!);
}
