import { setFirstLetterLowercase } from '../src/adapter';

describe('setFirstLetterLowercase', () => {
  it('should return a string with the first letter lowercase', () => {
    expect(setFirstLetterLowercase('Hello')).toEqual('hello');
    expect(setFirstLetterLowercase('WORLD')).toEqual('wORLD');
    expect(setFirstLetterLowercase('')).toEqual('');
  });
});
