const { initTokenizer, toReading } = require('../../src/server/toKana.js');

describe('[Unit] toKana', () => {
  beforeAll((done) => {
    initTokenizer((error) => {
      if (error) {
        done(error);
        return;
      }
      done();
    });
  });

  test('preserves the topic particle spelling は in furigana', () => {
    expect(toReading('小川さんは日本人です')).toBe('おがわさんはにほんじんです');
  });

  test('uses the directional particle reading え in furigana', () => {
    expect(toReading('駅へ行きます')).toBe('えきえいきます');
  });
});
