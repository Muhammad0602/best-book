import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Route, Routes, useLocation, useNavigate,
} from 'react-router-dom';
import Home from './components/Home';
import Details from './components/Details';
import Header from './components/Header';
import Account from './components/Account';
import QuranSearch from './components/QuranSearch';

function App() {
  const recovery = useSelector((store) => store.auth.recovery);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Arriving from a "reset password" email: go straight to the form.
  useEffect(() => {
    if (recovery && pathname !== '/account') navigate('/account');
  }, [recovery, pathname, navigate]);

  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Details/:number" element={<Details />} />
        <Route path="/account" element={<Account />} />
        <Route path="/search" element={<QuranSearch />} />
      </Routes>
    </div>
  );
}

export default App;
