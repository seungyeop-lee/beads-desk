"use client";

import type { Messages } from "@/client/modules/locale/domain/messageCatalog";
import { useWorkspaceSlug } from "@/client/ui/address/workspaceAddress";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { AppLogo } from "./AppLogo";

/**
 * 이슈 본문의 링크로 새 탭에 여는 화면(diff, 폴더)의 머리글입니다. 이 탭이 어느 workspace의 어떤 viewer인지만 보여 줍니다.
 * 앱 화면으로 옮겨 가는 탭과 버튼을 두지 않고, 판단 기다림 알림과 탭 제목의 개수도 AppHeader를 쓰는 탭에만 맡깁니다.
 */
export function ViewerHeader({ viewer }: { viewer: keyof Messages["shell"]["viewers"] }) {
  const messages = useMessages();
  const workspace = useWorkspaceSlug();
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-base-300 bg-base-100/85 backdrop-blur">
      <div className="content-width flex h-14 min-w-0 items-center gap-2.5 px-4 sm:px-8">
        <AppLogo />
        <span className="text-emphasis-50" aria-hidden="true">
          ·
        </span>
        <span className="shrink-0 text-sm font-medium">{messages.shell.viewers[viewer]}</span>
        <span className="text-emphasis-50" aria-hidden="true">
          ·
        </span>
        <span className="min-w-0 truncate text-sm text-emphasis-60">{workspace}</span>
      </div>
    </header>
  );
}
