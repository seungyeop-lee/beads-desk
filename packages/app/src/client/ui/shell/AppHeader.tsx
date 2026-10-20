"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHumanDecisionNotices } from "@/client/modules/humanDecisions/application/humanDecisionNotices";
import { useHumanDecisionCount } from "@/client/modules/humanDecisions/application/useHumanDecisionCount";
import {
  useScreenPathname,
  useWorkspaceHref,
  useWorkspaceSlug,
} from "@/client/ui/address/workspaceAddress";
import { PlusIcon, SettingsIcon } from "@/client/ui/designSystem/icons";
import { useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { NewIssueDialog } from "@/client/ui/issues/NewIssueDialog";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { SettingsDialog } from "@/client/ui/settings/SettingsDialog";
import { LOGO_BEADS } from "./logoBeads";
import { SCREEN_TABS } from "./screenTabs";
import { WorkspacePicker } from "./WorkspacePicker";

/** 화면 이동 탭과, 어느 화면에서나 설정을 열거나 새 이슈를 만들고 그 화면 위에 상세를 여는 버튼입니다. */
export function AppHeader() {
  const screenPathname = useScreenPathname();
  const workspaceHref = useWorkspaceHref();
  const router = useRouter();
  const issueHref = useIssueHref();
  const messages = useMessages();
  const humanDecisions = useHumanDecisionCount();
  useHumanDecisionNotices(useWorkspaceSlug());
  // 탭의 숫자는 판단할 일이 있다는 신호이므로, 0이거나 아직 읽지 못했거나 다시 읽다 실패하면 보이지 않습니다.
  const humanDecisionCount = humanDecisions.error ? 0 : (humanDecisions.data ?? 0);
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-base-300 bg-base-100/85 backdrop-blur">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-8 xl:h-14 xl:flex-nowrap xl:gap-6 xl:py-0">
        <Link href={workspaceHref()} className="flex shrink-0 items-center gap-2.5">
          <BeadsMark />
          <span className="text-[15px] font-bold tracking-tight">beads-desk</span>
        </Link>
        <nav
          className="order-last flex w-full min-w-0 items-center gap-1 overflow-x-auto xl:order-none xl:w-auto"
          aria-label={messages.shell.screens}
        >
          {SCREEN_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={workspaceHref(tab.href)}
              aria-current={screenPathname === tab.href ? "page" : undefined}
              className={`nav-tab ${tab.tone}`}
            >
              {messages[tab.screen].title}
              {tab.href === "/human" && humanDecisionCount > 0 && (
                <span className="nav-tab-count">
                  <span aria-hidden="true">{humanDecisionCount}</span>
                  <span className="sr-only">
                    {" "}
                    {messages.shell.awaitingCount(humanDecisionCount)}
                  </span>
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 xl:flex-none">
          <WorkspacePicker />
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square shrink-0 text-base-content/70"
            aria-label={messages.settings.title}
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon width={17} height={17} />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm shrink-0 gap-1.5 rounded-full pr-4 pl-3"
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

function BeadsMark() {
  return (
    <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
      {LOGO_BEADS.map(({ tone }) => (
        <span key={tone} className={`tone-dot ${tone} size-2`} />
      ))}
    </span>
  );
}
