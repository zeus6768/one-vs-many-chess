import { useState } from 'react';
import { ko, type I18nKey } from './ko';
import { en } from './en';

type Lang = 'ko' | 'en';

export function detectLanguage(): Lang {
  const lang = navigator.language || '';
  return lang.startsWith('ko') ? 'ko' : 'en';
}

const strings = { ko, en } as const;

export function useI18n() {
  const [lang] = useState<Lang>(detectLanguage);
  const t = (key: I18nKey): string => strings[lang][key];
  return { t, lang };
}
