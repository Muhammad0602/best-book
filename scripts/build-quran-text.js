/* eslint-disable no-console, no-await-in-loop */
// Builds, from the public quran.com API:
//   src/data/quran/<surah>.json  the Arabic text of every surah in the King Fahd
//                                Complex "QPC Hafs" encoding (matches the
//                                UthmanicHafs font);
//   src/data/pages.json          for every surah, the pages of the Madinah
//                                mushaf it covers: [[page, first ayah], ...].
// Run with: node scripts/build-quran-text.js
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'src', 'data');
const OUT = path.join(DATA, 'quran');
const API = 'https://api.quran.com/api/v4/verses/by_chapter';

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const pages = [];
  for (let surah = 1; surah <= 114; surah += 1) {
    const response = await fetch(`${API}/${surah}?fields=text_qpc_hafs&per_page=300&words=false`);
    if (!response.ok) throw new Error(`Surah ${surah}: HTTP ${response.status}`);
    const { verses, pagination } = await response.json();
    if (pagination.total_records !== verses.length) throw new Error(`Surah ${surah}: incomplete`);
    // Every verse ends with its number, which the font draws as the ayah sign.
    const ayahs = verses.map((verse) => verse.text_qpc_hafs.trim().replace(/\s+[\u0660-\u0669]+$/, ''));
    fs.writeFileSync(path.join(OUT, `${surah}.json`), `${JSON.stringify(ayahs)}\n`);
    const runs = [];
    verses.forEach((verse) => {
      const last = runs[runs.length - 1];
      if (!last || last[0] !== verse.page_number) {
        runs.push([verse.page_number, verse.verse_number]);
      }
    });
    pages.push(runs);
    process.stdout.write(`\r${surah}/114`);
  }
  fs.writeFileSync(path.join(DATA, 'pages.json'), `${JSON.stringify(pages)}\n`);
  console.log('\ndone');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
