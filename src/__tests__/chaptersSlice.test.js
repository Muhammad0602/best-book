import chaptersReducer, { initialState, getChapters } from '../redux/chapters/chaptersSlice';

describe('chapters reducer', () => {
  it('should return the initial state', () => {
    expect(chaptersReducer(undefined, {})).toEqual(initialState);
  });

  it('should handle getChapters.pending', () => {
    const nextState = chaptersReducer(initialState, getChapters.pending());
    expect(nextState.isLoading).toEqual(true);
  });

  it('should handle getChapters.fulfilled', () => {
    const payload = [{ number: 1, name: 'سُورَةُ ٱلْفَاتِحَةِ', englishName: 'Al-Faatiha' },
      { number: 2, name: 'سُورَةُ البَقَرَةِ', englishName: 'Al-Baqara' }];
    const nextState = chaptersReducer(initialState, getChapters.fulfilled(payload));
    expect(nextState.chapters).toEqual(payload);
    expect(nextState.isLoading).toEqual(false);
  });

  it('should handle getChapters.rejected', () => {
    const nextState = chaptersReducer(initialState, getChapters.rejected());
    expect(nextState.isLoading).toEqual(false);
  });
});
