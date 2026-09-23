const DATABASE = 'm-league-draft-team-settings';
const STORE = 'teams';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function validateTeamSettings(teams, defaults) {
  if (!Array.isArray(teams) || teams.length !== defaults.length) throw new Error('チーム設定を確認してください。');
  return defaults.map((team) => {
    const input = teams.find((item) => item.id === team.id);
    const name = input?.name?.trim();
    const color = input?.color?.toLowerCase();
    if (!name || name.length > 24) throw new Error('チーム名は1～24文字で入力してください。');
    if (!/^#[0-9a-f]{6}$/.test(color || '')) throw new Error('チームカラーを選んでください。');
    return { id: team.id, name, color };
  });
}

export async function loadTeamSettings(defaults) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => {
      const stored = new Map(request.result.map((item) => [item.id, item]));
      const merged = defaults.map((team) => {
        const candidate = stored.get(team.id);
        if (!candidate) return { id: team.id, name: team.name, color: team.color };
        try { return validateTeamSettings([candidate], [team])[0]; }
        catch { return { id: team.id, name: team.name, color: team.color }; }
      });
      resolve(merged);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export async function saveTeamSettings(teams, defaults) {
  const validated = validateTeamSettings(teams, defaults);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    for (const team of validated) store.put(team);
    transaction.oncomplete = () => { database.close(); resolve(validated); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}
