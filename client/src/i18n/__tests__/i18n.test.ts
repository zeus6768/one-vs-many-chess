import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectLanguage } from '../index';
import { ko } from '../ko';
import { en } from '../en';

function setLang(lang: string) {
  Object.defineProperty(navigator, 'language', {
    value: lang,
    configurable: true,
  });
}

describe('detectLanguage', () => {
  const original = navigator.language;

  afterEach(() => {
    setLang(original);
  });

  it('returns "ko" for "ko"', () => {
    setLang('ko');
    expect(detectLanguage()).toBe('ko');
  });

  it('returns "ko" for "ko-KR"', () => {
    setLang('ko-KR');
    expect(detectLanguage()).toBe('ko');
  });

  it('returns "en" for "en-US"', () => {
    setLang('en-US');
    expect(detectLanguage()).toBe('en');
  });

  it('returns "en" for "fr" (unknown language falls back to en)', () => {
    setLang('fr');
    expect(detectLanguage()).toBe('en');
  });

  it('returns "en" for empty string', () => {
    setLang('');
    expect(detectLanguage()).toBe('en');
  });
});

describe('translation completeness', () => {
  const koKeys = Object.keys(ko) as (keyof typeof ko)[];

  it('en has all keys from ko', () => {
    for (const key of koKeys) {
      expect(en).toHaveProperty(key);
    }
  });

  it('no Korean translation value is empty', () => {
    for (const [key, value] of Object.entries(ko)) {
      expect(value, `ko.${key} is empty`).not.toBe('');
    }
  });

  it('no English translation value is empty', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key} is empty`).not.toBe('');
    }
  });
});
