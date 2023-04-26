import React from 'react';
import logo from '../images/quran.png';

function Header() {
  return (
    <div className="header">
      <img src={logo} alt="quran karim" />
      <h1>
        Quran Karim
        <span>(114 surahs)</span>
      </h1>
    </div>
  );
}

export default Header;
