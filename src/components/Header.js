import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BiArrowBack, BiSearch, BiUser, BiUserCheck,
} from 'react-icons/bi';
import logo from '../images/quran.png';
import SettingsPanel from './SettingsPanel';

function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useSelector((store) => store.auth.user);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const home = pathname === '/';

  return (
    <>
      <header className="app-bar">
        <div className="bar-start">
          {!home && (
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
        </div>
        <div className="bar-actions">
          {pathname !== '/search' && (
            <Link to="/search" className="bar-button" aria-label="Search and go to">
              <BiSearch aria-hidden="true" />
            </Link>
          )}
          <button
            type="button"
            className="bar-button bar-text"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            Aa
          </button>
          <Link
            to="/account"
            className="bar-button"
            aria-label={user ? `Account (${user.email})` : 'Sign in'}
          >
            {user ? <BiUserCheck aria-hidden="true" /> : <BiUser aria-hidden="true" />}
          </Link>
        </div>
      </header>
      {settingsOpen && <SettingsPanel onClose={closeSettings} />}
    </>
  );
}

export default Header;
