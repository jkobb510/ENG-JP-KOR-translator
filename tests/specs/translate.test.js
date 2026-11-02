const { translate, translateTo } = require('../../src/server/translate');

describe('[Unit] translate', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('uses さん for translated name honorifics without changing 氏名', async () => {
    jest.spyOn(translate, 'translate').mockResolvedValue(['小川氏は日本人です。氏名を確認します。']);

    await expect(
      translateTo('Mr. Ogawa is Japanese.', 'mr. ogawa is japanese.', 'ja', 'en')
    ).resolves.toBe('小川さんは日本人です。氏名を確認します。');
  });
});
