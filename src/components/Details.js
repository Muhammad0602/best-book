import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

function Details() {
  const { number } = useParams();
  const id = parseInt(number, 10);
  const { chapters } = useSelector((store) => store.chapters);
  const surah = chapters[id - 1];
  return (
    <div>
      <h2>Here you can read ayahs of a specific surah</h2>
      {surah.ayahs.map((ayah) => (
        <p key={ayah.number}>{ayah.text}</p>
      ))}
    </div>
  );
}

export default Details;
