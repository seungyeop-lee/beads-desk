import type { Locale } from "@/shared/contract/locale";
import { enMessages } from "./enMessages";
import { koMessages, type Messages } from "./koMessages";

export type { Messages };

export const MESSAGES: Record<Locale, Messages> = { ko: koMessages, en: enMessages };
