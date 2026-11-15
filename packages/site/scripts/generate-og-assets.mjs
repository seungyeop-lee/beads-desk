import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OG_OUTPUT_DIR = join(SITE_DIR, "public/og");
const APP_DIR = join(SITE_DIR, "src/app");

const LOCALE_SPECS = [
  {
    locale: "en",
    lang: "en",
    badge: "Local Web UI for Beads (bd)",
    headlineLines: ["See what your", "coding agents", "leave in Beads"],
    accentLineIndex: 2,
    subline: "Plans · Mermaid · Bottlenecks · Human gates · Diffs",
    terminalCmd: "bd-desk start --open",
    terminalTag: "OSS · MIT",
    navNow: "Now",
    navHuman: "Needs human",
    navGraph: "Graph",
    stageLabels: [
      { stage: "Stage 1", state: "Done", title: "API & Schema", tone: "mint" },
      { stage: "Stage 2", state: "Active", title: "Checkout", tone: "sand" },
      { stage: "Stage 3", state: "Blocked", title: "Go-live", tone: "coral" },
    ],
    gateNodeTitle: "Go/no-go gate",
    epicLabel: "Epic progress",
    epics: [
      { title: "Launch infrastructure", ratio: "5/7", done: 52, active: 26 },
      { title: "Checkout & billing", ratio: "6/8", done: 64, active: 18 },
    ],
    humanBadge: "Needs human",
    humanTitle: "Go/no-go call for launch",
    humanAction: "Respond and close",
  },
  {
    locale: "ko",
    lang: "ko",
    badge: "Beads (bd) 전용 로컬 웹 UI",
    headlineLines: ["에이전트가 남긴", "계획과 작업 기록,", "브라우저로 한눈에"],
    accentLineIndex: 2,
    subline: "의존 그래프 · Mermaid · 병목 · human gate · diff",
    terminalCmd: "bd-desk start --open",
    terminalTag: "OSS · MIT",
    navNow: "지금",
    navHuman: "판단 기다림",
    navGraph: "그래프",
    stageLabels: [
      { stage: "1단계", state: "완료", title: "API · 스키마", tone: "mint" },
      { stage: "2단계", state: "진행 중", title: "결제 흐름", tone: "sand" },
      { stage: "3단계", state: "막힘", title: "배포 전환", tone: "coral" },
    ],
    gateNodeTitle: "최종 승인 gate",
    epicLabel: "에픽 진행률",
    epics: [
      { title: "프로덕션 인프라 구축", ratio: "5/7", done: 52, active: 26 },
      { title: "결제 · 청구 출시 준비", ratio: "6/8", done: 64, active: 18 },
    ],
    humanBadge: "Needs human",
    humanTitle: "프로덕션 배포 최종 승인",
    humanAction: "응답하고 닫기",
  },
  {
    locale: "ja",
    lang: "ja",
    badge: "Beads (bd) ローカル Web UI",
    headlineLines: ["エージェントの", "計画と作業記録を", "ブラウザで一望"],
    accentLineIndex: 2,
    subline: "依存グラフ · Mermaid · ボトルネック · human gate · diff",
    terminalCmd: "bd-desk start --open",
    terminalTag: "OSS · MIT",
    navNow: "いま",
    navHuman: "判断待ち",
    navGraph: "グラフ",
    stageLabels: [
      { stage: "段階 1", state: "完了", title: "API 設計", tone: "mint" },
      { stage: "段階 2", state: "進行中", title: "決済フロー", tone: "sand" },
      { stage: "段階 3", state: "停止", title: "本番切替", tone: "coral" },
    ],
    gateNodeTitle: "最終承認 gate",
    epicLabel: "エピック進捗",
    epics: [
      { title: "本番インフラ構築", ratio: "5/7", done: 52, active: 26 },
      { title: "決済・請求リリース準備", ratio: "6/8", done: 64, active: 18 },
    ],
    humanBadge: "Needs human",
    humanTitle: "本番リリース最終承認",
    humanAction: "応答してクローズ",
  },
];

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildOgHtml(spec) {
  const fontStack =
    spec.locale === "ja"
      ? '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", -apple-system, BlinkMacSystemFont, sans-serif'
      : '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  const headlines = spec.headlineLines
    .map((line, index) => {
      const cls =
        index === spec.accentLineIndex ? "headline-line headline-accent" : "headline-line";
      return `<span class="${cls}">${escapeHtml(line)}</span>`;
    })
    .join("");

  const stageNodes = spec.stageLabels
    .map(
      (node, idx) => `
      <div class="stage-node tone-${node.tone}">
        <div class="stage-meta">
          <span class="stage-dot dot-${node.tone}"></span>
          <span class="stage-step">${escapeHtml(node.stage)}</span>
          <span class="stage-state">${escapeHtml(node.state)}</span>
        </div>
        <div class="stage-title">${escapeHtml(node.title)}</div>
      </div>
      ${
        idx < spec.stageLabels.length - 1
          ? `<div class="stage-arrow" aria-hidden="true">
               <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                 <path d="M1.5 7h15.5M11.5 1.5L17 7l-5.5 5.5" stroke="#78716c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
             </div>`
          : ""
      }
    `,
    )
    .join("");

  const epicRows = spec.epics
    .map(
      (epic) => `
      <div class="epic-row">
        <div class="epic-head">
          <span class="epic-title">${escapeHtml(epic.title)}</span>
          <span class="epic-ratio">${escapeHtml(epic.ratio)}</span>
        </div>
        <div class="epic-track">
          <span class="epic-done" style="width:${epic.done}%"></span>
          <span class="epic-active" style="width:${epic.active}%"></span>
        </div>
      </div>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${spec.lang}">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background: #171615;
      color: #f6f4ef;
      font-family: ${fontStack};
      -webkit-font-smoothing: antialiased;
    }
    .canvas {
      position: relative;
      width: 1200px;
      height: 630px;
      padding: 44px 48px;
      display: grid;
      grid-template-columns: 552px 1fr;
      gap: 32px;
      align-items: center;
      background:
        radial-gradient(circle at 82% 18%, rgba(190, 218, 254, 0.22), transparent 45%),
        radial-gradient(circle at 20% 84%, rgba(167, 243, 209, 0.16), transparent 44%),
        radial-gradient(circle at 60% 90%, rgba(230, 205, 242, 0.12), transparent 40%),
        #171615;
    }
    .grid-overlay {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(to right, rgba(246, 244, 239, 0.035) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(246, 244, 239, 0.035) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(circle at 55% 45%, black 35%, transparent 90%);
      pointer-events: none;
    }
    .left {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      height: 100%;
    }
    .brand-row {
      display: inline-flex;
      align-items: center;
      gap: 13px;
      margin-bottom: 24px;
    }
    .brand-name {
      font-size: 27px;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #fffdf9;
    }
    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(255, 253, 249, 0.08);
      border: 1px solid rgba(255, 253, 249, 0.18);
      color: #d6d0c6;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .pill-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: #a7f3d1;
    }
    .headline {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: ${spec.locale === "en" ? "58px" : "56px"};
      font-weight: 800;
      line-height: 1.14;
      letter-spacing: -0.035em;
      color: #fffdf9;
      margin-bottom: 22px;
      word-break: keep-all;
    }
    .headline-line {
      display: block;
    }
    .headline-accent {
      color: #a7f3d1;
    }
    .subline {
      font-size: 20px;
      font-weight: 500;
      line-height: 1.4;
      color: #c9c1b4;
      margin-bottom: 30px;
      letter-spacing: -0.01em;
    }
    .terminal-bar {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 13px 18px;
      border-radius: 14px;
      background: #23201e;
      border: 1px solid #3c3632;
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.38);
      min-width: 430px;
    }
    .terminal-cmd {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 19px;
      font-weight: 600;
      color: #f6f4ef;
    }
    .prompt {
      color: #a7f3d1;
      font-weight: 700;
    }
    .terminal-tag {
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(190, 218, 254, 0.14);
      border: 1px solid rgba(190, 218, 254, 0.28);
      color: #bedafe;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .right {
      position: relative;
      z-index: 2;
      height: 518px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding-top: 6px;
      padding-right: 16px;
    }
    .app-window {
      position: relative;
      width: 100%;
      border-radius: 20px;
      background: #f6f4ef;
      border: 1px solid #d6cfc3;
      box-shadow: 0 28px 60px rgba(0, 0, 0, 0.55);
      overflow: hidden;
      color: #1c1917;
      padding-bottom: 58px;
    }
    .window-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 18px;
      background: #efece4;
      border-bottom: 1px solid #dfd9cd;
    }
    .traffic {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .traffic span {
      width: 11px;
      height: 11px;
      border-radius: 999px;
      border: 1px solid rgba(28, 25, 23, 0.16);
    }
    .nav-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #57534e;
    }
    .tab-pill {
      padding: 4px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .tab-active {
      background: #fed6c4;
      color: #1c1917;
    }
    .tab-human {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #e6cdf2;
      color: #1c1917;
    }
    .tab-count {
      padding: 0 6px;
      border-radius: 999px;
      background: #1c1917;
      color: #fffdf9;
      font-size: 11px;
    }
    .window-body {
      padding: 16px 18px 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .panel {
      background: #fffdf9;
      border: 1px solid #e4ded3;
      border-radius: 14px;
      padding: 14px 15px;
    }
    .panel-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 800;
      color: #57534e;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 12px;
    }
    .panel-badge {
      padding: 3px 9px;
      border-radius: 999px;
      background: #d3d3fd;
      color: #1c1917;
      font-size: 11px;
      font-weight: 800;
      text-transform: none;
      letter-spacing: 0;
    }
    .stage-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .stage-node {
      flex: 1;
      min-width: 0;
      background: #fffdf9;
      border: 1.5px solid #ddd6c9;
      border-radius: 11px;
      padding: 10px 10px;
    }
    .stage-node.tone-coral {
      border-color: #e99a9d;
      background: #fff9f9;
    }
    .stage-meta {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #6b655e;
      white-space: nowrap;
    }
    .stage-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      border: 1px solid rgba(28, 25, 23, 0.28);
      flex-shrink: 0;
    }
    .dot-mint { background: #a7f3d1; }
    .dot-sand { background: #fee1b9; }
    .dot-coral { background: #fbc9cb; }
    .stage-step {
      white-space: nowrap;
    }
    .stage-state {
      margin-left: auto;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 999px;
      background: #efece4;
      color: #44403c;
      white-space: nowrap;
    }
    .stage-title {
      font-size: 15px;
      font-weight: 800;
      color: #1c1917;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.015em;
    }
    .stage-arrow {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
    .gate-link-row {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #6d28d9;
    }
    .gate-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9px;
      background: #f5effb;
      border: 1px dashed #b794f4;
      color: #4c1d95;
      font-size: 12px;
      font-weight: 800;
    }
    .epic-row + .epic-row {
      margin-top: 11px;
    }
    .epic-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 700;
      color: #1c1917;
      margin-bottom: 5px;
    }
    .epic-ratio {
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px;
      color: #57534e;
    }
    .epic-track {
      height: 9px;
      border-radius: 999px;
      background: #e6e1d8;
      overflow: hidden;
      display: flex;
    }
    .epic-done {
      height: 100%;
      background: #6cc27d;
    }
    .epic-active {
      height: 100%;
      background: #f5d36c;
    }
    .floating-card {
      position: absolute;
      right: 0;
      bottom: 6px;
      width: 420px;
      background: #fffdf9;
      border: 1.5px solid #c9c1b4;
      border-radius: 16px;
      padding: 16px 19px;
      box-shadow: 0 22px 46px rgba(0, 0, 0, 0.45);
      color: #1c1917;
    }
    .floating-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 9px;
    }
    .floating-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      background: #fbc9cb;
      border: 1px solid rgba(28, 25, 23, 0.16);
      font-size: 12px;
      font-weight: 800;
      color: #1c1917;
    }
    .floating-id {
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px;
      font-weight: 700;
      color: #6b655e;
    }
    .floating-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .floating-title {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #1c1917;
      line-height: 1.25;
    }
    .floating-btn {
      flex-shrink: 0;
      padding: 8px 14px;
      border-radius: 9px;
      background: #1c1917;
      color: #fffdf9;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="canvas">
    <div class="grid-overlay"></div>

    <div class="left">
      <div class="brand-row">
        <svg width="38" height="38" viewBox="0 0 30 30" aria-hidden="true">
          <g stroke="#fffdf9" stroke-opacity="0.22" stroke-width="0.9">
            <circle cx="8" cy="8" r="6.2" fill="#bedafe" />
            <circle cx="22" cy="8" r="6.2" fill="#e6cdf2" />
            <circle cx="8" cy="22" r="6.2" fill="#a7f3d1" />
            <circle cx="22" cy="22" r="6.2" fill="#fee1b9" />
          </g>
        </svg>
        <span class="brand-name">beads-desk</span>
        <span class="brand-pill"><span class="pill-dot"></span>${escapeHtml(spec.badge)}</span>
      </div>

      <h1 class="headline">${headlines}</h1>
      <p class="subline">${escapeHtml(spec.subline)}</p>

      <div class="terminal-bar">
        <span class="terminal-cmd"><span class="prompt">$</span>${escapeHtml(spec.terminalCmd)}</span>
        <span class="terminal-tag">${escapeHtml(spec.terminalTag)}</span>
      </div>
    </div>

    <div class="right">
      <div class="app-window">
        <div class="window-top">
          <div class="traffic">
            <span style="background:#fbc9cb"></span>
            <span style="background:#fee1b9"></span>
            <span style="background:#a7f3d1"></span>
          </div>
          <div class="nav-tabs">
            <span class="tab-pill tab-active">${escapeHtml(spec.navNow)}</span>
            <span class="tab-pill tab-human">${escapeHtml(spec.navHuman)} <span class="tab-count">3</span></span>
            <span class="tab-pill">${escapeHtml(spec.navGraph)}</span>
          </div>
        </div>

        <div class="window-body">
          <div class="panel">
            <div class="panel-title">
              <span>${escapeHtml(spec.navGraph)} · Order</span>
              <span class="panel-badge">Mermaid &amp; Blocks</span>
            </div>
            <div class="stage-row">${stageNodes}</div>
            <div class="gate-link-row">
              <span>↑</span>
              <span class="gate-chip">● ${escapeHtml(spec.gateNodeTitle)}</span>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">
              <span>${escapeHtml(spec.epicLabel)}</span>
            </div>
            ${epicRows}
          </div>
        </div>
      </div>

      <div class="floating-card">
        <div class="floating-head">
          <span class="floating-pill"><span class="stage-dot dot-coral" style="width:7px;height:7px;"></span>${escapeHtml(spec.humanBadge)}</span>
          <span class="floating-id">gate · xl8</span>
        </div>
        <div class="floating-body">
          <div class="floating-title">${escapeHtml(spec.humanTitle)}</div>
          <div class="floating-btn">${escapeHtml(spec.humanAction)}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildIconHtml({ size, withBackdrop }) {
  const padding = withBackdrop ? Math.round(size * 0.18) : Math.round(size * 0.05);
  const svgSize = size - padding * 2;
  const bg = withBackdrop
    ? "background: radial-gradient(circle at 25% 20%, #2b2724 0%, #171615 72%);"
    : "background: transparent;";
  const strokeAttrs = withBackdrop
    ? 'stroke="#fffdf9" stroke-opacity="0.22" stroke-width="0.9"'
    : 'stroke="#1c1917" stroke-opacity="0.42" stroke-width="1.2"';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      ${bg}
    }
  </style>
</head>
<body>
  <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <g ${strokeAttrs}>
      <circle cx="8" cy="8" r="6.2" fill="#bedafe" />
      <circle cx="22" cy="8" r="6.2" fill="#e6cdf2" />
      <circle cx="8" cy="22" r="6.2" fill="#a7f3d1" />
      <circle cx="22" cy="22" r="6.2" fill="#fee1b9" />
    </g>
  </svg>
</body>
</html>`;
}

async function main() {
  mkdirSync(OG_OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    const ogContext = await browser.newContext({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    const ogPage = await ogContext.newPage();

    for (const spec of LOCALE_SPECS) {
      await ogPage.setContent(buildOgHtml(spec), { waitUntil: "load" });
      await ogPage.screenshot({
        path: join(OG_OUTPUT_DIR, `${spec.locale}.png`),
        type: "png",
      });
    }
    await ogContext.close();

    // iOS Apple Touch Icon (180x180 불투명 배경)
    const appleContext = await browser.newContext({
      viewport: { width: 180, height: 180 },
      deviceScaleFactor: 1,
    });
    const applePage = await appleContext.newPage();
    await applePage.setContent(buildIconHtml({ size: 180, withBackdrop: true }), {
      waitUntil: "load",
    });
    await applePage.screenshot({
      path: join(APP_DIR, "apple-icon.png"),
      type: "png",
    });
    await appleContext.close();

    // PNG 파비콘 fallback (96x96 투명 배경)
    const iconContext = await browser.newContext({
      viewport: { width: 96, height: 96 },
      deviceScaleFactor: 1,
    });
    const iconPage = await iconContext.newPage();
    await iconPage.setContent(buildIconHtml({ size: 96, withBackdrop: false }), {
      waitUntil: "load",
    });
    await iconPage.screenshot({
      path: join(APP_DIR, "icon.png"),
      type: "png",
      omitBackground: true,
    });
    await iconContext.close();
  } finally {
    await browser.close();
  }
}

await main();
