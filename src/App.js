import { Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Details from './components/Details';
import Header from './components/Header';

function App() {
  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Details/:number" element={<Details />} />
      </Routes>
    </div>
  );
}

export default App;
