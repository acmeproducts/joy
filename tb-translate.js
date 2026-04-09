/**
 * tb-translate.js
 * Real-time translation using Web APIs (Google Translate via fetch)
 */

const tbTranslate = {
  cache: {},
  supportedLangs: {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    th: 'Thai',
    ru: 'Russian',
    ar: 'Arabic',
    hi: 'Hindi'
  },

  async translate(text, sourceCode, targetCode) {
    if (!text.trim()) return '';
    if (sourceCode === targetCode) return text;

    const cacheKey = `${sourceCode}-${targetCode}:${text}`;
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    try {
      // Use Google Translate API via free endpoint
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceCode}|${targetCode}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.responseStatus === 200 && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        this.cache[cacheKey] = translated;
        tbLog.log('Translation complete', { from: sourceCode, to: targetCode, chars: text.length });
        return translated;
      } else {
        tbLog.warn('Translation failed', { status: data.responseStatus });
        return text;
      }
    } catch (err) {
      tbLog.error('Translation error', err);
      return text; // Fallback to original
    }
  },

  clearCache() {
    this.cache = {};
  }
};
