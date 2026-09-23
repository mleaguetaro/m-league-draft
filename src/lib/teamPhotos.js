const DATABASE = 'm-league-draft';
const STORE = 'teamPhotos';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadTeamPhotos() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const photos = {};
    const transaction = database.transaction(STORE, 'readonly');
    const store = transaction.objectStore(STORE);
    for (const id of ['a', 'b']) {
      const request = store.get(id);
      request.onsuccess = () => { if (request.result) photos[id] = request.result; };
    }
    transaction.oncomplete = () => { database.close(); resolve(photos); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

async function updateTeamPhoto(id, photo) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    if (photo) store.put(photo, id);
    else store.delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export const saveTeamPhoto = (id, photo) => updateTeamPhoto(id, photo);
export const removeTeamPhoto = (id) => updateTeamPhoto(id, null);

export async function prepareTeamPhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください。');
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('画像を読み込めませんでした。'));
      element.src = source;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('画像を処理できませんでした。');
    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, 256, 256);
    context.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, 256, 256);
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(source);
  }
}
