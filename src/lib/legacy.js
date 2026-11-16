import { ARABIC_EDITION } from '../redux/chapters/chaptersSlice';

/*
  The first version of the app used another edition of the Arabic text, in
  which pause marks were separate "words" and the first ayah of most surahs
  began with the basmala. Marks made on that text are moved to the same
  words of the current text.

  `marks` (src/data/legacy-uthmani.json) lists, per surah and ayah, the old
  word positions that were pause marks.
*/

const BASMALA_WORDS = 4;

export const isLegacy = (annotation) => {
  const { data } = annotation;
  if (data.edition === ARABIC_EDITION) return false;
  if (annotation.type === 'highlight') return data.text === 'ar';
  return annotation.type === 'drawing' && data.anchor?.text === 'ar';
};

export const convertIndex = (marks, surah, ayah, index) => {
  const basmala = ayah === 1 && surah !== 1 && surah !== 9 ? BASMALA_WORDS : 0;
  const list = marks[surah]?.[ayah] || [];
  // A pause mark now belongs to the word before it.
  const before = list.filter((position) => position <= index).length;
  return Math.max(0, index - basmala - before);
};

export const migrate = (annotation, marks) => {
  const { surah, ayah, data } = annotation;
  const convert = (index) => convertIndex(marks, surah, ayah, index);
  const next = annotation.type === 'highlight'
    ? { ...data, start: convert(data.start), end: convert(data.end) }
    : { ...data, anchor: { ...data.anchor, word: convert(data.anchor.word) } };
  return {
    ...annotation,
    data: { ...next, edition: ARABIC_EDITION },
    updatedAt: new Date().toISOString(),
  };
};
