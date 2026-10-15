import { useEffect, useRef } from "react";
import { ChevronDownIcon } from "./icons";

export type CheckboxMenuOption<T extends string> = { value: T; label: string; tone: string };

type Props<T extends string> = {
  label: string;
  /** 고른 항목을 요약해 label 옆에 보이는 글자입니다. */
  summary: string;
  options: readonly CheckboxMenuOption<T>[];
  selected: readonly T[];
  onChange: (selected: T[]) => void;
};

/** 여러 항목을 체크박스로 고르는 펼침 메뉴입니다. 메뉴 바깥을 누르면 닫힙니다. */
export function CheckboxMenu<T extends string>({
  label,
  summary,
  options,
  selected,
  onChange,
}: Props<T>) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  // details는 summary를 누를 때만 닫히므로, 목록 바깥을 누르면 직접 닫습니다.
  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const toggle = (value: T) =>
    onChange(
      selected.includes(value)
        ? selected.filter((chosen) => chosen !== value)
        : [...selected, value],
    );

  return (
    <details ref={menuRef} className="dropdown">
      <summary className="btn btn-sm btn-ghost gap-1.5 rounded-full font-medium">
        {label}
        <span className="text-base-content/50">{summary}</span>
        <ChevronDownIcon width={14} height={14} className="text-base-content/50" />
      </summary>
      <ul className="dropdown-content menu z-10 mt-1 w-44 rounded-box border border-base-300 bg-base-100 p-1.5 shadow-lg">
        {options.map((option) => (
          <li key={option.value}>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="checkbox checkbox-xs rounded"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span className={`tone-dot ${option.tone}`} />
              {option.label}
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}
