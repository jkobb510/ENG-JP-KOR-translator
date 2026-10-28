function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function toRemote(row) {
  return {
    word: row.word ?? '',
    translation: row.translation ?? '',
    translation2: row.translation2 ?? '',
    furigana: row.furigana ?? '',
    image: row.image ?? null,
    notes: row.notes ?? '',
    audio: row.audio ? await blobToDataUrl(row.audio) : null,
  };
}

async function fromRemote(remote) {
  const { id, image, audio, ...rest } = remote;
  const row = { ...rest, remoteId: id };
  if (image) row.image = image;
  if (audio) row.audio = await (await fetch(audio)).blob();
  return row;
}

async function request(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`${options?.method ?? 'GET'} ${path} failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export async function fetchRemoteRows() {
  const remote = await request('/api/rows');
  return Promise.all(remote.map(fromRemote));
}

export async function createRemoteRow(row) {
  const { id } = await request('/api/rows', { method: 'POST', body: JSON.stringify(await toRemote(row)) });
  return id;
}

export async function updateRemoteRow(remoteId, row) {
  await request(`/api/rows/${remoteId}`, { method: 'PUT', body: JSON.stringify(await toRemote(row)) });
}

export async function deleteRemoteRow(remoteId) {
  await request(`/api/rows/${remoteId}`, { method: 'DELETE' });
}

export async function clearRemoteRows() {
  await request('/api/rows', { method: 'DELETE' });
}
