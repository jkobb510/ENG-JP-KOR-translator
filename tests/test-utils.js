export function createJsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body
  };
}

// App also fetches /api/rows on mount; only /translate is stubbed per test.
export function mockTranslateResponse(respond) {
  fetch.mockImplementation(async (url) => {
    if (url === '/translate') return respond();
    return createJsonResponse([]);
  });
}

export function getTranslateCalls() {
  return fetch.mock.calls.filter(([url]) => url === '/translate');
}

export function mockMediaDevices(mediaDevices) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: mediaDevices
  });
}
