import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './study.css';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
import store from './redux/store';
import { startSync } from './lib/sync';
import registerServiceWorker from './serviceWorkerRegistration';

startSync(store);

// Hash based routes ("#/Details/2") keep working when the app is hosted in a
// sub-folder (GitHub Pages) and when it is opened offline from the home screen.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>
  </React.StrictMode>,
);

registerServiceWorker();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
