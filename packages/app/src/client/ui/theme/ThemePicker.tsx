import { PreferenceSelect } from "@/client/ui/designSystem/PreferenceSelect";
import { saveTheme } from "@/client/infra/theme/documentTheme";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { isThemeChoice, THEME_CHOICES } from "@/shared/contract/theme";
import { useTheme } from "./ThemeProvider";

/** 고른 테마를 쿠키에 남기고, 서버가 그 테마로 화면을 다시 그리게 합니다. */
export function ThemePicker() {
  const theme = useTheme();
  const messages = useMessages();
  return (
    <PreferenceSelect
      label={messages.settings.theme}
      value={theme}
      options={THEME_CHOICES}
      optionLabel={(option) => messages.settings.themes[option]}
      isValue={isThemeChoice}
      save={saveTheme}
    />
  );
}
