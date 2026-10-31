import type { Locale } from "@/shared/contract/locale";
import { enMessages } from "./enMessages";
import { koMessages } from "./koMessages";
import type { Messages } from "./messageCatalog";

export type { Messages };

export const MESSAGES: Record<Locale, Messages> = { ko: koMessages, en: enMessages };
