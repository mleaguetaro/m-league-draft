import { compareSnapshots, getTeamTotal } from './score.js';

const DATABASE = 'm-league-draft-history';
const STORE = 'snapshots';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function makeManualSnapshot(date, pointsByPlayer, playerIds, existingSnapshot = null) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('正しい日付を入力してください。');
  }
  const points = {};
  for (const id of playerIds) {
    const value = pointsByPlayer[id];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('8選手すべての累積ポイントを入力してください。');
    }
    points[id] = value;
  }
  return {
    id: existingSnapshot?.id || `manual-${date}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}`,
    date,
    recordedAt: `${date}T23:59:00+09:00`,
    createdAt: existingSnapshot?.createdAt || new Date().toISOString(),
    order: existingSnapshot?.order ?? (globalThis.performance?.timeOrigin || Date.now()) + (globalThis.performance?.now?.() || 0),
    source: 'manual',
    pointsByPlayer: points,
    statsByPlayer: existingSnapshot?.statsByPlayer || {},
  };
}

export function makeManualPlayerSnapshot(date, playerId, point, round, table, existingSnapshot = null) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('正しい日付を入力してください。');
  }
  if (!playerId || typeof point !== 'number' || !Number.isFinite(point)) {
    throw new Error('選手と累積ポイントを入力してください。');
  }
  if (![1, 2].includes(round) || !['A', 'B'].includes(table)) {
    throw new Error('第1・第2試合と卓を選んでください。');
  }
  return {
    id: existingSnapshot?.id || `manual-${date}-${round}${table}-${playerId}-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
    date,
    recordedAt: `${date}T00:00:00+09:00`,
    createdAt: existingSnapshot?.createdAt || new Date().toISOString(),
    round,
    table,
    order: round * 10 + (table === 'B' ? 1 : 0),
    source: 'manual',
    pointsByPlayer: { [playerId]: point },
    statsByPlayer: existingSnapshot?.statsByPlayer || {},
  };
}

export function findManualPlayerEntry(snapshot, manualSnapshots) {
  const [playerId] = Object.keys(snapshot.pointsByPlayer);
  return manualSnapshots.find((item) => item.id !== snapshot.id && item.date === snapshot.date &&
    item.round === snapshot.round && item.table === snapshot.table &&
    Object.hasOwn(item.pointsByPlayer, playerId));
}

export function isDuplicateSnapshot(snapshot, manualSnapshots) {
  return manualSnapshots.some((item) => item.id !== snapshot.id && item.date === snapshot.date &&
    (item.round ?? 3) === (snapshot.round ?? 3) && (item.table ?? '') === (snapshot.table ?? '') &&
    Object.keys(snapshot.pointsByPlayer).every((id) => item.pointsByPlayer[id] === snapshot.pointsByPlayer[id]));
}

export function getActiveSnapshots(demoSnapshots, manualSnapshots) {
  const snapshots = manualSnapshots.length ? manualSnapshots : demoSnapshots;
  return [...snapshots].sort(compareSnapshots);
}

export function snapshotLabel(snapshot) {
  const date = snapshot.date || snapshot.recordedAt?.slice(0, 10) || '';
  const table = snapshot.table === 'A+B' ? 'A・B卓' : `${snapshot.table}卓`;
  return snapshot.round ? `${date} 第${snapshot.round}試合 ${table}` : date;
}

export function getCombinedSnapshots(demoSnapshots, officialSnapshots, manualSnapshots, playerIds = []) {
  const actual = [...officialSnapshots, ...manualSnapshots];
  if (!actual.length) return getActiveSnapshots(demoSnapshots, []);
  const ids = playerIds.length ? playerIds : [...new Set([...demoSnapshots, ...actual].flatMap((item) => Object.keys(item.pointsByPlayer || {})))];
  const points = Object.fromEntries(ids.map((id) => [id, 0]));
  const ordered = [...actual].sort(compareSnapshots);
  const groups = new Map();
  for (const snapshot of ordered) {
    const date = snapshot.date || snapshot.recordedAt?.slice(0, 10);
    const key = snapshot.round
      ? `${date}|${snapshot.round}`
      : `${date}|legacy|${JSON.stringify(Object.entries(snapshot.pointsByPlayer || {}).sort(([a], [b]) => a.localeCompare(b)))}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(snapshot);
  }
  const merged = [];
  for (const group of groups.values()) {
    // A and B tables in the same round are simultaneous, so apply both before
    // emitting one team point. Official results win for players in those games.
    group.sort((a, b) =>
      (a.source === 'official-game' || a.source === 'official' ? 0 : 1) - (b.source === 'official-game' || b.source === 'official' ? 0 : 1) ||
      compareSnapshots(a, b));
    const officialPlayers = new Set(group.flatMap((item) => item.source === 'official-game' ? Object.keys(item.gamePointsByPlayer || {}) : []));
    for (const snapshot of group) {
      for (const [id, value] of Object.entries(snapshot.pointsByPlayer || {})) {
        if (snapshot.source === 'manual' && officialPlayers.has(id)) continue;
        if (ids.includes(id) && typeof value === 'number' && Number.isFinite(value)) points[id] = value;
      }
    }
    const last = !group[0].round
      ? group.find((item) => item.source === 'official') || group.at(-1)
      : group.at(-1);
    const tables = [...new Set(group.map((item) => item.table).filter(Boolean))].sort();
    merged.push({
      ...last,
      table: tables.length > 1 ? 'A+B' : tables[0] || last.table,
      tables,
      gamePointsByPlayer: Object.assign({}, ...group.filter((item) => item.source === 'official-game').map((item) => item.gamePointsByPlayer)),
      gameEntries: group.filter((item) => item.source === 'official-game').map((item) => ({ table: item.table, gamePointsByPlayer: item.gamePointsByPlayer })),
      pointsByPlayer: { ...points },
      entryIds: group.map((item) => item.id),
    });
  }
  return merged;
}

export function getTeamChartRows(snapshots, teams) {
  return snapshots.map((snapshot) => ({
    day: snapshot.date || snapshot.recordedAt.slice(0, 10),
    label: snapshotLabel(snapshot),
    ...Object.fromEntries(teams.map((team) => [team.id, getTeamTotal(team, snapshot)])),
  }));
}

export function getPlayerChartRows(snapshots, playerIds) {
  return snapshots.map((snapshot) => ({
    day: snapshot.date || snapshot.recordedAt.slice(0, 10),
    label: snapshotLabel(snapshot),
    ...Object.fromEntries(playerIds.map((id) => [id, snapshot.pointsByPlayer[id] ?? null])),
  }));
}

export async function loadManualSnapshots() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly');
    let snapshots = [];
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => { snapshots = getActiveSnapshots([], request.result); };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => { database.close(); resolve(snapshots); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export async function saveManualSnapshot(snapshot, previousId) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    if (previousId && previousId !== snapshot.id) store.delete(previousId);
    store.put(snapshot);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export async function deleteManualSnapshot(id) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}
