import { convertIndex, isLegacy, migrate } from '../lib/legacy';

// Old 2:22 had pause marks at positions 17 and 27; old 108:1 began with the basmala.
const marks = { 2: { 22: [17, 27] } };

describe('marks made on the first edition of the Arabic text', () => {
  it('keeps positions before a pause mark', () => {
    expect(convertIndex(marks, 2, 22, 5)).toBe(5);
  });

  it('shifts positions after a pause mark', () => {
    expect(convertIndex(marks, 2, 22, 18)).toBe(17);
    expect(convertIndex(marks, 2, 22, 28)).toBe(26);
  });

  it('moves a pause mark onto the word before it', () => {
    expect(convertIndex(marks, 2, 22, 17)).toBe(16);
  });

  it('drops the basmala from the first ayah', () => {
    expect(convertIndex(marks, 108, 1, 5)).toBe(1);
    expect(convertIndex(marks, 108, 1, 2)).toBe(0);
    expect(convertIndex(marks, 1, 1, 2)).toBe(2);
    expect(convertIndex(marks, 9, 1, 2)).toBe(2);
  });

  it('migrates a highlight once', () => {
    const old = {
      id: 'a',
      surah: 2,
      ayah: 22,
      type: 'highlight',
      data: {
        text: 'ar', edition: 'quran-uthmani', start: 16, end: 18, color: 'yellow',
      },
    };
    expect(isLegacy(old)).toBe(true);
    const next = migrate(old, marks);
    expect(next.data.start).toBe(16);
    expect(next.data.end).toBe(17);
    expect(isLegacy(next)).toBe(false);
  });

  it('leaves marks on the translation alone', () => {
    expect(isLegacy({ type: 'highlight', data: { text: 'en', edition: 'en.asad' } })).toBe(false);
    expect(isLegacy({ type: 'drawing', data: { anchor: { text: 'en', word: 3 } } })).toBe(false);
  });
});
