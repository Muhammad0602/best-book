import axios from 'axios';

/*
  Where the texts that do not ship with the app come from. Everything here is
  fetched when the reader asks for it and then kept by the service worker, so
  it can be read again offline.
*/

const QURAN_COM = 'https://api.quran.com/api/v4';
const ALQURAN_CLOUD = 'https://api.alquran.cloud/v1';
const JSDELIVR = 'https://cdn.jsdelivr.net/gh';

export const TRANSLATIONS = [
  { id: 'en.khattab', name: 'The Clear Quran', author: 'Dr. Mustafa Khattab' },
  { id: 'en.sahih', name: 'Saheeh International', author: 'Saheeh International' },
  { id: 'en.asad', name: 'The Message of the Quran', author: 'Muhammad Asad' },
];

export const DEFAULT_TRANSLATION = 'en.khattab';
// Marks made on the translation before there was a choice.
export const FIRST_TRANSLATION = 'en.asad';

// Footnote markers and any other markup are dropped: plain text only.
const plain = (text) => (text || '')
  .replace(/<sup[^>]*>.*?<\/sup>/g, '')
  .replace(/<[^>]+>/g, '')
  .trim();

// Resolves to the text of every ayah of the surah, in order.
export const loadTranslation = async (edition, surah) => {
  if (edition === 'en.khattab') {
    const { data } = await axios.get(
      `${JSDELIVR}/fawazahmed0/quran-api@1/editions/eng-mustafakhattaba/${surah}.json`,
    );
    return data.chapter.map((verse) => plain(verse.text));
  }
  if (edition === 'en.sahih') {
    const { data } = await axios.get(`${QURAN_COM}/quran/translations/20?chapter_number=${surah}`);
    return data.translations.map((verse) => plain(verse.text));
  }
  const { data } = await axios.get(`${ALQURAN_CLOUD}/surah/${surah}/en.asad`);
  return data.data.ayahs.map((ayah) => plain(ayah.text));
};

const wholeCache = new Map();

// The whole of one translation, for searching: one list of ayahs per surah.
export const loadWholeTranslation = (edition, counts) => {
  if (wholeCache.has(edition)) return wholeCache.get(edition);
  const split = (flat) => {
    const out = [];
    let at = 0;
    counts.forEach((count) => {
      out.push(flat.slice(at, at + count));
      at += count;
    });
    return out;
  };
  let request;
  if (edition === 'en.khattab') {
    request = axios.get(`${JSDELIVR}/fawazahmed0/quran-api@1/editions/eng-mustafakhattaba.json`)
      .then(({ data }) => split(data.quran.map((verse) => plain(verse.text))));
  } else if (edition === 'en.sahih') {
    request = axios.get(`${QURAN_COM}/quran/translations/20`)
      .then(({ data }) => split(data.translations.map((verse) => plain(verse.text))));
  } else {
    request = axios.get(`${ALQURAN_CLOUD}/quran/en.asad`)
      .then(({ data }) => data.data.surahs.map((surah) => surah.ayahs.map((a) => plain(a.text))));
  }
  const promise = request.catch((error) => {
    wholeCache.delete(edition);
    throw error;
  });
  wholeCache.set(edition, promise);
  return promise;
};

export const TAFSIRS = [
  {
    id: 14, slug: 'ar-tafsir-ibn-kathir', name: 'ابن كثير', english: 'Ibn Kathir',
  },
  {
    id: 15, slug: 'ar-tafsir-al-tabari', name: 'الطبري', english: 'Al-Tabari',
  },
  {
    id: 90, slug: 'ar-tafseer-al-qurtubi', name: 'القرطبي', english: 'Al-Qurtubi',
  },
  {
    id: 94, slug: 'ar-tafsir-al-baghawi', name: 'البغوي', english: 'Al-Baghawi',
  },
  {
    id: 91, slug: 'ar-tafseer-al-saddi', name: 'السعدي', english: 'Al-Sa\'di',
  },
  {
    id: 93, slug: 'ar-tafsir-al-wasit', name: 'الوسيط (طنطاوي)', english: 'Al-Wasit (Tantawi)',
  },
  {
    id: 16, slug: 'ar-tafsir-muyassar', name: 'الميسر', english: 'Al-Muyassar',
  },
];

export const DEFAULT_TAFSIR = 14;

// The tafsir arrives as HTML; only its text is used, paragraph by paragraph.
export const paragraphsOf = (html) => {
  const text = (html || '').trim();
  if (!text) return [];
  if (!/<[a-z][^>]*>/i.test(text) || typeof DOMParser === 'undefined') {
    return text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  }
  const { body } = new DOMParser().parseFromString(text, 'text/html');
  const blocks = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
  const source = blocks.length > 0
    ? Array.from(blocks).map((node) => node.textContent)
    : [body.textContent];
  return source
    .flatMap((part) => part.split(/\n+/))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

const tafsirCache = new Map();

// Resolves to the paragraphs of one mufassir's commentary on one ayah.
export const loadTafsir = async (tafsirId, surah, ayah) => {
  const key = `${tafsirId}:${surah}:${ayah}`;
  if (tafsirCache.has(key)) return tafsirCache.get(key);
  const tafsir = TAFSIRS.find((item) => item.id === tafsirId) || TAFSIRS[0];
  let paragraphs;
  try {
    const { data } = await axios.get(`${QURAN_COM}/tafsirs/${tafsir.id}/by_ayah/${surah}:${ayah}`);
    paragraphs = paragraphsOf(data.tafsir.text);
  } catch (error) {
    // Second source, should the first one be unreachable.
    const { data } = await axios.get(
      `${JSDELIVR}/spa5k/tafsir_api@main/tafsir/${tafsir.slug}/${surah}/${ayah}.json`,
    );
    paragraphs = paragraphsOf(data.text);
  }
  tafsirCache.set(key, paragraphs);
  return paragraphs;
};
