import React from 'react';
import { Provider } from 'react-redux';
import renderer from 'react-test-renderer';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import store from '../redux/store';
import Home from '../components/Home';
import Details from '../components/Details';

describe('Renders without crashing', () => {
  it('should render correctly', () => {
    const number = 4;
    const tree = renderer.create(
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path={`/Details/${number}`} element={<Details />} />
          </Routes>
        </BrowserRouter>
      </Provider>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Home should render correctly', () => {
    const tree = renderer.create(
      <Provider store={store}>
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      </Provider>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
