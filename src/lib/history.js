import { getLatestSnapshots, getTeamTotal } from './score.js';

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

export function isDuplicateSnapshot(snapshot, manualSnapshots) {
  return manualSnapshots.some((item) => item.id !== snapshot.id && item.date === snapshot.date &&
    Object.keys(snapshot.pointsByPlayer).every((id) => item.pointsByPlayer[id] === snapshot.pointsByPlayer[id]));
}

export function getActiveSnapshots(demoSnapshots, manualSnapshots) {
  const snapshots = manualSnapshots.length ? manualSnapshots : demoSnapshots;
  return [...snapshots].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt) ||
    (a.order ?? Date.parse(a.createdAt || a.recordedAt)) - (b.order ?? Date.parse(b.createdAt || b.recordedAt)));
}

export function getCombinedSnapshots(demoSnapshots, officialSnapshots, manualSnapshots) {
  const actual = [...officialSnapshots, ...manualSnapshots];
  if (!actual.length) return getActiveSnapshots(demoSnapshots, []);
  const seen = new Set();
  const unique = actual.filter((snapshot) => {
    const date = snapshot.date || snapshot.recordedAt?.slice(0, 10);
    const signature = `${date}:${JSON.stringify(Object.entries(snapshot.pointsByPlayer || {}).sort(([a], [b]) => a.localeCompare(b)))}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
  return getLatestSnapshots(unique).reverse();
}

export function getTeamChartRows(snapshots, teams) {
  return snapshots.map((snapshot) => ({
    day: snapshot.date || snapshot.recordedAt.slice(0, 10),
    ...Object.fromEntries(teams.map((team) => [team.id, getTeamTotal(team, snapshot)])),
  }));
}

export function getPlayerChartRows(snapshots, playerIds) {
  return snapshots.map((snapshot) => ({
    day: snapshot.date || snapshot.recordedAt.slice(0, 10),
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
