import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useWorkspaces } from "@/client/modules/workspace/application/useWorkspaces";
import { useScreenPathname, useWorkspaceSlug } from "@/client/ui/address/workspaceAddress";
import { FolderIcon, NewTabIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { workspaceHref } from "@/shared/contract/workspaces";

/**
 * 이 탭이 보는 workspace의 이름을 보여 주고, 여럿이면 펼침 메뉴에서 고를 수 있게 합니다. 이름은 화면 주소에 쓰는 이름이고 전체 경로는 도움말로 보입니다.
 * 메뉴에서 이름을 고르면 이 탭만 다른 workspace의 같은 화면으로 이동하고, 다른 탭은 보던 workspace를 그대로 봅니다.
 * 다른 workspace 줄의 새 탭 단추는 같은 화면을 새 탭에서 열고, 이 탭은 그대로 둡니다.
 */
export function WorkspacePicker() {
  const { data } = useWorkspaces();
  const current = useWorkspaceSlug();
  const screenPathname = useScreenPathname();
  const messages = useMessages();
  const descriptionId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const currentRoot = data?.workspaces.find((workspace) => workspace.slug === current)?.root;
  if (!data) return null;
  if (data.workspaces.length <= 1) {
    return (
      <span
        className="flex min-w-0 max-w-48 items-center gap-1.5 text-sm text-emphasis-60"
        data-tooltip={currentRoot}
        aria-description={currentRoot}
      >
        <FolderIcon width={15} height={15} className="shrink-0" />
        <span className="truncate">{current}</span>
      </span>
    );
  }
  // 목록은 열린 동안에만 그리고, focus 여부와 상관없이 보이도록 daisyUI의 dropdown-open을 붙입니다.
  return (
    <div
      ref={menuRef}
      className={`dropdown dropdown-end min-w-0 max-w-48 text-emphasis-70 ${open ? "dropdown-open" : ""}`}
    >
      <button
        ref={buttonRef}
        type="button"
        className="ghost-select flex min-w-0 max-w-full items-center gap-1.5"
        aria-label={messages.shell.workspace}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        data-tooltip={currentRoot}
        aria-describedby={`${descriptionId}-${current}`}
      >
        <FolderIcon width={15} height={15} className="shrink-0" />
        <span className="truncate">{current}</span>
      </button>
      {open && (
        <ul className="dropdown-content menu z-10 mt-1 max-h-80 w-64 flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-100 p-1.5 shadow-lg">
          {data.workspaces.map(({ slug }) => {
            const href = switchedHref(slug, screenPathname);
            const isCurrent = slug === current;
            return (
              <li key={slug} className="flex-row flex-nowrap items-center">
                <Link
                  href={href}
                  className={`min-w-0 flex-1 ${isCurrent ? "menu-active" : ""}`}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-describedby={`${descriptionId}-${slug}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="truncate">{slug}</span>
                </Link>
                {!isCurrent && (
                  <a
                    href={href}
                    target="_blank"
                    className="shrink-0 text-emphasis-60"
                    aria-label={messages.shell.openWorkspaceInNewTab(slug)}
                    data-tooltip={messages.shell.openWorkspaceInNewTab(slug)}
                    onClick={() => setOpen(false)}
                  >
                    <NewTabIcon width={15} height={15} />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data.workspaces.map(({ root, slug }) => (
        <span key={slug} id={`${descriptionId}-${slug}`} hidden>
          {root}
        </span>
      ))}
    </div>
  );
}

// query의 이슈 id와 그래프 범위는 보던 workspace의 이슈를 가리키므로 넘기지 않습니다.
// 그래프 화면은 범위 없이 열 수 없어 workspace의 첫 화면으로 갑니다.
function switchedHref(slug: string, screenPathname: string): string {
  return workspaceHref(slug, screenPathname === "/graph" ? "/" : screenPathname);
}
