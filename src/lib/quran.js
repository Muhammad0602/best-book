import surahList from '../data/surahs.json';
import pageMap from '../data/pages.json';
import juzStarts from '../data/juz.json';

/* Facts about the text used across the app: numbering, pages and juz. */

export const SURAHS = surahList;
export const PAGE_COUNT = 604;
export const JUZ_COUNT = 30;

// Number of the first ayah of each surah in the whole Quran, minus one.
const OFFSETS = SURAHS.reduce((list, surah, index) => {
  list.push(index === 0 ? 0 : list[index - 1] + SURAHS[index - 1].numberOfAyahs);
  return list;
}, []);

export const globalAyah = (surah, ayah) => OFFSETS[surah - 1] + ayah;

export const isValidAyah = (surah, ayah) => Number.isInteger(surah) && Number.isInteger(ayah)
  && surah >= 1 && surah <= SURAHS.length && ayah >= 1 && ayah <= SURAHS[surah - 1].numberOfAyahs;

const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);

// The juz (1-30) an ayah belongs to.
export const juzOf = (surah, ayah) => {
  let juz = 1;
  juzStarts.forEach((start, index) => {
    if (before(start, [surah, ayah])) juz = index + 1;
  });
  return juz;
};

export const juzStart = (juz) => juzStarts[juz - 1];

// The first ayah on a page of the Madinah mushaf: [surah, ayah].
export const pageStart = (page) => {
  for (let surah = 1; surah <= pageMap.length; surah += 1) {
    const run = pageMap[surah - 1].find(([number]) => number === page);
    if (run) return [surah, run[1]];
  }
  return null;
};

export const arabicNumber = (value) => String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[digit]);

export const reference = (surah, ayah) => `${SURAHS[surah - 1].englishName} ${surah}:${ayah}`;

// Arabic without vowel signs and Quranic marks, with the letter variants
// folded together, for searching.
export const normalizeArabic = (text) => (text || '')
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ')
  .trim();

let arabicCache = null;

// The Arabic text of every surah (comes with the app), plus its search form.
export const loadAllArabic = () => {
  if (!arabicCache) {
    arabicCache = Promise.all(SURAHS.map((surah) => import(`../data/quran/${surah.number}.json`)))
      .then((modules) => modules.map((module) => {
        const ayahs = module.default;
        return { ayahs, plain: ayahs.map(normalizeArabic) };
      }))
      .catch((error) => {
        arabicCache = null;
        throw error;
      });
  }
  return arabicCache;
};
