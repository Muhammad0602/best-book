import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CgSearch } from 'react-icons/cg';
import logo from '../images/quran.png';
import { setSearch } from '../redux/chapters/chaptersSlice';

function Header() {
  const dispatch = useDispatch();
  const { search } = useSelector(store => store.chapters)

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
        <input className="search-input" type="text" placeholder="Search a surah" value={search} onChange={(e) => dispatch(setSearch(e.target.value))} />
        <CgSearch aria-hidden="true" className="search-icon" />
      </div>
    </>
  );
}

export default Header;
