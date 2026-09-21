import { classMeetingsHref } from '../navigation/classNavigation';

describe('classMeetings navigation', () => {
  it('builds href with classId param for Expo Router', () => {
    expect(classMeetingsHref('turma-3a')).toEqual({
      pathname: '/(app)/class-meetings',
      params: { classId: 'turma-3a' },
    });
  });
});
