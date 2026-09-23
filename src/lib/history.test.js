import test from 'node:test';
import assert from 'node:assert/strict';
import { season } from '../data/demoSeason.js';
import { getMatchup } from './score.js';
import { getActiveSnapshots, getCombinedSnapshots, getPlayerChartRows, getTeamChartRows, isDuplicateSnapshot, makeManualSnapshot } from './history.js';

const playerIds = Object.keys(season.players);

test('手入力は8人の累積値を要求し、日付ごとの履歴になる', () => {
  const values = Object.fromEntries(playerIds.map((id, index) => [id, index - 3]));
  const snapshot = makeManualSnapshot('2026-09-23', values, playerIds);
  assert.match(snapshot.id, /^manual-2026-09-23-/);
  assert.equal(snapshot.source, 'manual');
  assert.equal(snapshot.pointsByPlayer.date, -3);
  assert.throws(() => makeManualSnapshot('2026-02-30', values, playerIds), /日付/);
  assert.throws(() => makeManualSnapshot('2026-09-23', { ...values, date: NaN }, playerIds), /8選手/);
});

test('同日でもポイントが変われば保存でき、完全に同じ内容だけ重複とする', () => {
  const base = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const first = makeManualSnapshot('2026-09-23', base, playerIds);
  const duplicate = makeManualSnapshot('2026-09-23', base, playerIds);
  const changed = makeManualSnapshot('2026-09-23', { ...base, date: 5 }, playerIds);
  assert.equal(isDuplicateSnapshot(duplicate, [first]), true);
  assert.equal(isDuplicateSnapshot(changed, [first]), false);
  assert.equal(makeManualSnapshot('2026-09-24', base, playerIds, first).id, first.id);
  const matchup = getMatchup({ ...season, snapshots: [{ ...first, order: 100 }, { ...changed, order: 200 }] });
  assert.equal(matchup.latest.pointsByPlayer.date, 5);
  assert.equal(matchup.previous.pointsByPlayer.date, 0);
});

test('手入力履歴を日付順で採用し、チーム合計と選手推移を計算する', () => {
  const first = makeManualSnapshot('2026-09-20', Object.fromEntries(playerIds.map((id) => [id, 0])), playerIds);
  const second = makeManualSnapshot('2026-09-22', Object.fromEntries(playerIds.map((id, index) => [id, index + 1])), playerIds);
  const active = getActiveSnapshots(season.snapshots, [second, first]);
  assert.deepEqual(active.map((item) => item.date), ['2026-09-20', '2026-09-22']);
  assert.deepEqual(getTeamChartRows(active, season.teams).map(({ a, b }) => [a, b]), [[0, 0], [10, 26]]);
  assert.deepEqual(getPlayerChartRows(active, ['date', 'sasaki']).map(({ day, date, sasaki }) => [day, date, sasaki]), [['2026-09-20', 0, 0], ['2026-09-22', 1, 5]]);
});

test('公式と手入力の履歴を統合し、同日・同ポイントの重複だけ省く', () => {
  const values = Object.fromEntries(playerIds.map((id, index) => [id, index]));
  const official = { id: 'official-1', date: '2026-09-23', recordedAt: '2026-09-23T12:00:00Z', source: 'official', pointsByPlayer: values };
  const duplicate = { ...official, id: 'manual-duplicate', source: 'manual' };
  const changed = { ...official, id: 'manual-changed', recordedAt: '2026-09-23T15:00:00Z', source: 'manual', pointsByPlayer: { ...values, date: 30 } };
  assert.deepEqual(getCombinedSnapshots(season.snapshots, [official], [changed, duplicate]).map((item) => item.id), ['manual-changed', 'official-1']);
  assert.deepEqual(getCombinedSnapshots(season.snapshots, [], []).map((item) => item.id), season.snapshots.map((item) => item.id));
  const sameDayManual = { ...changed, recordedAt: '2026-09-23T23:59:00+09:00' };
  const combined = getCombinedSnapshots([], [official], [sameDayManual]);
  assert.equal(getMatchup({ ...season, snapshots: combined }).latest.id, official.id);
});
