import { useState } from "react";
import { useSavedValue } from "./useSavedValue";

// 렌더링마다 새로 만든 ref 함수는 커밋할 때마다 다시 호출되어, 사용자가 다른 칸으로 옮긴 포커스를 되찾아 옵니다.
// module 수준 함수를 넘겨 입력란이 나타날 때 한 번만 포커스를 줍니다.
export const focusOnMount = (element: HTMLElement | null) => element?.focus();

/**
 * 보여 주던 값을 고쳐 저장하는 흐름입니다. draft가 null이면 편집 중이 아닙니다.
 * 저장에 성공하면 다시 조회한 값이 도착할 때까지 저장한 값을 보여 줍니다.
 *
 * @param onSave 저장에 성공하면 true를 돌려줍니다.
 * @param required true이면 빈 값으로 저장하지 않습니다.
 */
export function useInlineEdit(
  value: string,
  onSave: (value: string) => Promise<boolean>,
  required = false,
) {
  const [shown, showSaved] = useSavedValue(value);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft === null || saving) return;
    if (draft === shown) return setDraft(null);
    if (required && draft.trim().length === 0) return;
    setSaving(true);
    const saved = await onSave(draft);
    setSaving(false);
    if (saved) {
      showSaved(draft);
      setDraft(null);
    }
  };

  return {
    shown,
    draft,
    saving,
    edit: () => setDraft(shown),
    change: setDraft,
    cancel: () => setDraft(null),
    save,
  };
}
