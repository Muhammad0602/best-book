import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';
import { getEnglish } from '../redux/english/englishSlice';

function Details() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { number } = useParams();
  const id = parseInt(number, 10);
  const { chapters } = useSelector((store) => store.chapters);
  const { english } = useSelector((store) => store.english);
  const surah = chapters.length > 1 ? chapters[id - 1] : chapters;
  const surahEng = english && english[id-1];

  useEffect(() => {
    dispatch(getEnglish());
  }, [dispatch])

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="details">
      <button onClick={() => navigate('/')} type="button">
        <BiArrowBack aria-hidden="true" />
        <span className="visually-hidden">Go back to the home page</span>
      </button>
      <h2>
        {surah.name}
        {' '}
        <span>
          (
          {surah.englishNameTranslation}
          )
        </span>
      </h2>
      <article className="ayahs">
        {surah.ayahs?.map((ayah, index) => (
          <div key={ayah.number}>
             <p className="ayah">{ayah.text}</p>
             <p className="ayah english-ayah">{surahEng?.ayahs[index]?.text}</p>
          </div>
         
        ))}
      </article>
    </div>
  );
}

export default Details;
