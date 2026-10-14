import { useRouter } from "next/navigation";
import { saveTheme } from "@/client/infra/theme/documentTheme";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { isThemeChoice, THEME_CHOICES } from "@/shared/contract/theme";
import { useTheme } from "./ThemeProvider";

/** 고른 테마를 쿠키에 남기고, 서버가 그 테마로 화면을 다시 그리게 합니다. */
export function ThemePicker() {
  const theme = useTheme();
  const messages = useMessages();
  const router = useRouter();
  return (
    <select
      className="select w-full"
      aria-label={messages.settings.theme}
      value={theme}
      onChange={(event) => {
        const next = event.target.value;
        if (!isThemeChoice(next)) return;
        saveTheme(next);
        router.refresh();
      }}
    >
      {THEME_CHOICES.map((option) => (
        <option key={option} value={option}>
          {messages.settings.themes[option]}
        </option>
      ))}
    </select>
  );
}
