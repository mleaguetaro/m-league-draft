import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTeamSettings } from './teamSettings.js';

const defaults = [{ id: 'a' }, { id: 'b' }];

test('チーム名と色を検証し、名前の空白と色を正規化する', () => {
  assert.deepEqual(validateTeamSettings([
    { id: 'a', name: '  KUSUNOKI  ', color: '#C62828' },
    { id: 'b', name: 'KISHIMOTO', color: '#1565C0' },
  ], defaults), [
    { id: 'a', name: 'KUSUNOKI', color: '#c62828' },
    { id: 'b', name: 'KISHIMOTO', color: '#1565c0' },
  ]);
  assert.throws(() => validateTeamSettings([{ id: 'a', name: ' ', color: '#c62828' }, { id: 'b', name: 'B', color: '#1565c0' }], defaults));
  assert.throws(() => validateTeamSettings([{ id: 'a', name: 'A', color: 'red' }, { id: 'b', name: 'B', color: '#1565c0' }], defaults));
});
