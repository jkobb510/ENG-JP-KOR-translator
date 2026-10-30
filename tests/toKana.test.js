const { initTokenizer, toReading } = require('../src/server/toKana.js');

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

  test('uses the topic particle reading わ in furigana', () => {
    expect(toReading('タケシは日本人です')).toBe('たけしわにほんじんです');
  });

  test('uses the directional particle reading え in furigana', () => {
    expect(toReading('駅へ行きます')).toBe('えきえいきます');
  });
});
