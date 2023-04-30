import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import logo from '../images/quran.png';
import { getSurah } from '../redux/chapters/chaptersSlice';

function Header() {
  const dispatch = useDispatch();
  const [surah, setSurah] = useState('');

  const handleSearch = () => {
    dispatch(getSurah(surah));
    setSurah('');
  };

  return (
    <>
      <div className="header">
        <img src={logo} alt="quran karim" />
        <h1>
          Quran Karim
          <span>(114 surahs)</span>
        </h1>
      </div>
      <div className="header search-container">
        <input className="search-input" type="text" placeholder="Search surah by its number" value={surah} onChange={(e) => setSurah(e.target.value)} />
        <button className="search-btn" type="submit" onClick={handleSearch}>Search</button>
      </div>
    </>
  );
}

export default Header;
