"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { NewIssueDialog } from "@/client/ui/issues/NewIssueDialog";

const TABS = [
  { href: "/issues", label: "이슈" },
  { href: "/board", label: "보드" },
];

/** 화면 이동 탭과, 어느 화면에서나 새 이슈를 만들고 그 화면 위에 상세를 여는 버튼입니다. */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const issueHref = useIssueHref();
  const [creating, setCreating] = useState(false);

  return (
    <header className="border-b border-base-300 bg-base-100">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-2">
        <span className="font-bold">beads-desk</span>
        <nav className="tabs tabs-box tabs-sm" aria-label="화면">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={pathname === tab.href ? "page" : undefined}
              className={`tab ${pathname === tab.href ? "tab-active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="btn btn-primary btn-sm ml-auto"
          onClick={() => setCreating(true)}
        >
          새 이슈
        </button>
      </div>
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
