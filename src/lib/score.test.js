import test from 'node:test';
import assert from 'node:assert/strict';
import { season } from '../data/demoSeason.js';
import { getMatchup, getTeamTotal } from './score.js';

test('チーム合計と前回比を累積ポイントから計算する', () => {
  const matchup = getMatchup(season);
  assert.equal(matchup.totals.a, 214.1);
  assert.equal(matchup.totals.b, 146.1);
  assert.equal(matchup.gap, 68);
  assert.equal(matchup.leaderId, 'a');
  assert.equal(matchup.changes.a, 20.1);
  assert.equal(matchup.changes.b, -9.5);
});

test('メンバーのデータが欠けた場合は誤った合計を表示しない', () => {
  assert.equal(getTeamTotal(season.teams[0], { pointsByPlayer: { date: 10 } }), null);
});
