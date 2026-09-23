import assert from 'node:assert/strict';
import test from 'node:test';
import { getRecords } from './records.js';

const season = {
  teams: [
    { id: 'a', memberIds: ['p1', 'p2'] },
    { id: 'b', memberIds: ['p3', 'p4'] },
  ],
  players: { p1: { name: 'A1' }, p2: { name: 'A2' }, p3: { name: 'B1' }, p4: { name: 'B2' } },
  snapshots: [
    { id: '3', date: '2026-09-03', recordedAt: '2026-09-03T23:59:00+09:00', pointsByPlayer: { p1: 15, p2: -5, p3: 20, p4: -5 } },
    { id: '1', date: '2026-09-01', recordedAt: '2026-09-01T23:59:00+09:00', pointsByPlayer: { p1: -20, p2: -10, p3: -5, p4: -5 } },
    { id: '2', date: '2026-09-02', recordedAt: '2026-09-02T23:59:00+09:00', pointsByPlayer: { p1: 25, p2: 5, p3: -10, p4: 5 } },
  ],
};

test('履歴から最高到達点・両チームの最大リード・直近変動を算出する', () => {
  const result = getRecords(season);
  assert.deepEqual(result.highest.a, { value: 30, date: '2026-09-02', label: '2026-09-02' });
  assert.deepEqual(result.highest.b, { value: 15, date: '2026-09-03', label: '2026-09-03' });
  assert.deepEqual(result.maxGap, { value: 35, date: '2026-09-02', label: '2026-09-02', leaderId: 'a' });
  assert.deepEqual(result.maxLead.a, { value: 35, date: '2026-09-02', label: '2026-09-02' });
  assert.deepEqual(result.maxLead.b, { value: 20, date: '2026-09-01', label: '2026-09-01' });
  assert.deepEqual(result.topPlayers.a, { id: 'p1', name: 'A1', point: 15 });
  assert.deepEqual(result.recentChanges.map((item) => item.changes.a), [-20, 60, null]);
});

test('履歴が空の場合は記録を未取得として返す', () => {
  const result = getRecords({ ...season, snapshots: [] });
  assert.equal(result.highest.a, null);
  assert.equal(result.maxGap, null);
  assert.equal(result.topPlayers.b, null);
  assert.deepEqual(result.recentChanges, []);
});
