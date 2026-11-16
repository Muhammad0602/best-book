/* eslint-disable no-console, no-await-in-loop */
// Builds src/data/quran/<surah>.json: the Arabic text of every surah in the
// King Fahd Complex "QPC Hafs" encoding, which matches the UthmanicHafs font.
// Source: the public quran.com API. Run with: node scripts/build-quran-text.js
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'src', 'data', 'quran');
const API = 'https://api.quran.com/api/v4/verses/by_chapter';

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (let surah = 1; surah <= 114; surah += 1) {
    const response = await fetch(`${API}/${surah}?fields=text_qpc_hafs&per_page=300&words=false`);
    if (!response.ok) throw new Error(`Surah ${surah}: HTTP ${response.status}`);
    const { verses, pagination } = await response.json();
    if (pagination.total_records !== verses.length) throw new Error(`Surah ${surah}: incomplete`);
    // Every verse ends with its number, which the font draws as the ayah sign.
    const ayahs = verses.map((verse) => verse.text_qpc_hafs.trim().replace(/\s+[\u0660-\u0669]+$/, ''));
    fs.writeFileSync(path.join(OUT, `${surah}.json`), `${JSON.stringify(ayahs)}\n`);
    process.stdout.write(`\r${surah}/114`);
  }
  console.log('\ndone');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
