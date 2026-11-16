import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { CgSearch } from 'react-icons/cg';
import { BiUser, BiUserCheck } from 'react-icons/bi';
import logo from '../images/quran.png';
import { setSearch } from '../redux/chapters/chaptersSlice';

function Header() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { search } = useSelector((store) => store.chapters);
  const user = useSelector((store) => store.auth.user);
  const home = pathname === '/';

  return (
    <>
      <Link
        to="/account"
        className="account-link"
        aria-label={user ? `Account (${user.email})` : 'Sign in'}
      >
        {user ? <BiUserCheck aria-hidden="true" /> : <BiUser aria-hidden="true" />}
      </Link>
      <div className={`header${home ? '' : ' header-compact'}`}>
        <Link to="/" className="home-link" aria-label="Quran Karim, all surahs">
          <img src={logo} alt="" />
          <h1>
            Quran Karim
            <span>(114 surahs)</span>
          </h1>
        </Link>
      </div>
      {home && (
        <div className="header search-container">
          <input
            className="search-input"
            type="text"
            placeholder="Search a surah"
            aria-label="Search a surah"
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
          />
          <CgSearch aria-hidden="true" className="search-icon" />
        </div>
      )}
    </>
  );
}

export default Header;
