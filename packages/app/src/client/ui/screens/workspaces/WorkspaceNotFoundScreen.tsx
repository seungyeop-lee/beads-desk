"use client";

import Link from "next/link";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/** 주소의 workspace 이름으로 등록한 workspace가 없을 때 보여 줍니다. */
export function WorkspaceNotFoundScreen({ name }: { name: string }) {
  const messages = useMessages();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-8 pt-8 pb-16">
      <ScreenHeader title={messages.workspaces.notFoundTitle} />
      <p className="text-sm text-emphasis-70">{messages.workspaces.notFound(name)}</p>
      <Link href="/" className="btn btn-sm self-start">
        {messages.workspaces.showAll}
      </Link>
    </main>
  );
}
