import React from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BiArrowBack, BiUser, BiUserCheck } from 'react-icons/bi';
import logo from '../images/quran.png';

function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useSelector((store) => store.auth.user);
  const home = pathname === '/';

  return (
    <header className="app-bar">
      {home ? <span className="bar-spacer" /> : (
        <button
          type="button"
          className="bar-button"
          aria-label="Back to all surahs"
          onClick={() => navigate('/')}
        >
          <BiArrowBack aria-hidden="true" />
        </button>
      )}
      <Link to="/" className="home-link" aria-label="Quran Karim, all surahs">
        <img src={logo} alt="" />
        <span>Quran Karim</span>
      </Link>
      <Link
        to="/account"
        className="bar-button"
        aria-label={user ? `Account (${user.email})` : 'Sign in'}
      >
        {user ? <BiUserCheck aria-hidden="true" /> : <BiUser aria-hidden="true" />}
      </Link>
    </header>
  );
}

export default Header;
