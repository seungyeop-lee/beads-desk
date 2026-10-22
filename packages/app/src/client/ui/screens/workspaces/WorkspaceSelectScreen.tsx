"use client";

import Link from "next/link";
import { FolderIcon } from "@/client/ui/designSystem/icons";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

export type WorkspaceChoice = {
  slug: string;
  root: string;
  /** 고르면 이동할 그 workspace의 주소입니다. */
  href: string;
};

/** workspace 이름이 없는 주소로 들어왔을 때, 등록한 workspace 가운데 하나를 골라 그 주소로 이동합니다. */
export function WorkspaceSelectScreen({ choices }: { choices: WorkspaceChoice[] }) {
  const messages = useMessages();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-8 pt-8 pb-16">
      <ScreenHeader title={messages.workspaces.selectTitle} />
      <p className="text-sm text-emphasis-70">{messages.workspaces.selectDescription}</p>
      <ul className="flex flex-col gap-2" aria-label={messages.workspaces.selectTitle}>
        {choices.map(({ slug, root, href }) => (
          <li key={slug}>
            <Link
              href={href}
              className="surface flex min-w-0 items-center gap-3 px-4 py-3 transition hover:shadow-sm"
            >
              <FolderIcon width={17} height={17} className="shrink-0 text-emphasis-60" />
              <span className="font-semibold">{slug}</span>
              <span className="min-w-0 truncate text-sm text-emphasis-60" title={root}>
                {root}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
