/* eslint-disable no-console */
// Builds src/data/legacy-uthmani.json, used once per reader to move marks made
// on the first edition of the Arabic text (alquran.cloud "quran-uthmani") onto
// the current one. For every ayah it lists the old word positions that were
// pause marks rather than words. Run with: node scripts/build-legacy-map.js
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'src', 'data', 'legacy-uthmani.json');
// Arabic letters, plus the hizb sign, which is still a "word" of its own.
const WORD = /[ء-يٱ-ۓ۞]/;

const main = async () => {
  const response = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const { data } = await response.json();
  const map = {};
  data.surahs.forEach((surah) => {
    surah.ayahs.forEach((ayah) => {
      const marks = [];
      ayah.text.trim().split(/\s+/).forEach((token, index) => {
        if (!WORD.test(token)) marks.push(index);
      });
      if (marks.length === 0) return;
      if (!map[surah.number]) map[surah.number] = {};
      map[surah.number][ayah.numberInSurah] = marks;
    });
  });
  fs.writeFileSync(OUT, `${JSON.stringify(map)}\n`);
  console.log('done');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
