import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import Home from '../components/Home';

const mockStore = configureStore([]);

describe('Home component', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      chapters: {
        chapters: [
          {
            number: 1,
            name: 'سُورَةُ ٱلْفَاتِحَةِ',
            englishName: 'Al-Fatihah',
          },
          {
            number: 2,
            name: 'سُورَةُ البَقَرَةِ',
            englishName: 'Al-Baqarah',
          },
        ],
      },
    });
  });

  it('should render a list of chapters', () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/']}>
          <Home />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Al-Fatihah')).toBeInTheDocument();
    expect(screen.getByText('The Opener')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Al-Baqarah')).toBeInTheDocument();
    expect(screen.getByText('The Cow')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

//   it('should dispatch getChapters action when component screen.is mounted', () => {
//     render(<Provider store={store}><Home /></Provider>);
//     const actions = store.getActions();
//     expect(actions[0].type).toEqual('chapters/getChapters/pending');
//   });
});
