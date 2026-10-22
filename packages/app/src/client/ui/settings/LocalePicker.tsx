import { PreferenceSelect } from "@/client/ui/designSystem/PreferenceSelect";
import { saveLocale } from "@/client/infra/locale/documentLocale";
import { isLocale, LOCALES, type Locale } from "@/shared/contract/locale";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";

/** 언어 이름은 어느 언어로 보고 있든 그 언어 자신의 이름으로 보여 줍니다. */
const LANGUAGE_NAMES: Record<Locale, string> = { ko: "한국어", en: "English" };

/** 고른 언어를 쿠키에 남기고, 서버가 그 언어로 화면을 다시 그리게 합니다. */
export function LocalePicker() {
  const locale = useLocale();
  const messages = useMessages();
  return (
    <PreferenceSelect
      label={messages.settings.language}
      value={locale}
      options={LOCALES}
      optionLabel={(option) => LANGUAGE_NAMES[option]}
      isValue={isLocale}
      save={saveLocale}
    />
  );
}
