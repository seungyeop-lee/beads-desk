"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon, SettingsIcon } from "@/client/ui/designSystem/icons";
import { useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { NewIssueDialog } from "@/client/ui/issues/NewIssueDialog";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { SettingsDialog } from "@/client/ui/settings/SettingsDialog";
import { SCREEN_TABS } from "./screenTabs";
import { WorkspacePicker } from "./WorkspacePicker";

/** 화면 이동 탭과, 어느 화면에서나 설정을 열거나 새 이슈를 만들고 그 화면 위에 상세를 여는 버튼입니다. */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const issueHref = useIssueHref();
  const messages = useMessages();
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-base-300 bg-base-100/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[96rem] items-center gap-6 px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <BeadsMark />
          <span className="text-[15px] font-bold tracking-tight">beads-desk</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label={messages.shell.screens}>
          {SCREEN_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={pathname === tab.href ? "page" : undefined}
              className={`nav-tab ${tab.tone}`}
            >
              {messages[tab.screen].title}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <WorkspacePicker />
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-base-content/70"
            aria-label={messages.settings.title}
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon width={17} height={17} />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm gap-1.5 rounded-full pr-4 pl-3"
            onClick={() => setCreating(true)}
          >
            <PlusIcon width={15} height={15} />
            {messages.shell.newIssue}
          </button>
        </div>
      </div>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      {creating && (
        <NewIssueDialog
          onCreated={(issueId) => {
            setCreating(false);
            router.push(issueHref(issueId), { scroll: false });
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </header>
  );
}

/** 이슈, 에픽, 보드, 결정 네 화면의 색으로 칠한 구슬 네 개입니다. 지금 화면은 이 네 화면을 모아 보는 화면이라 넣지 않습니다. */
function BeadsMark() {
  return (
    <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
      {SCREEN_TABS.filter((tab) => tab.href !== "/focus").map((tab) => (
        <span key={tab.href} className={`tone-dot ${tab.tone} size-2`} />
      ))}
    </span>
  );
}
