import { getLatestSnapshots, getTeamTotal } from './score.js';

const round = (value) => Math.round(value * 10) / 10;

export function getRecords(seasonData) {
  const [teamA, teamB] = seasonData.teams;
  const ordered = getLatestSnapshots(seasonData.snapshots).reverse();
  const rows = ordered.map((snapshot) => ({
    snapshot,
    date: snapshot.date || snapshot.recordedAt?.slice(0, 10) || '',
    totals: {
      [teamA.id]: getTeamTotal(teamA, snapshot),
      [teamB.id]: getTeamTotal(teamB, snapshot),
    },
  }));

  const highest = Object.fromEntries(seasonData.teams.map((team) => [team.id, null]));
  let maxGap = null;
  const maxLead = { [teamA.id]: null, [teamB.id]: null };
  for (const row of rows) {
    for (const team of seasonData.teams) {
      const value = row.totals[team.id];
      if (value !== null && (!highest[team.id] || value > highest[team.id].value)) {
        highest[team.id] = { value, date: row.date };
      }
    }
    const a = row.totals[teamA.id];
    const b = row.totals[teamB.id];
    if (a === null || b === null) continue;
    const difference = round(a - b);
    const gap = Math.abs(difference);
    if (!maxGap || gap > maxGap.value) maxGap = { value: gap, date: row.date, leaderId: difference > 0 ? teamA.id : difference < 0 ? teamB.id : null };
    if (difference > 0 && (!maxLead[teamA.id] || difference > maxLead[teamA.id].value)) maxLead[teamA.id] = { value: difference, date: row.date };
    if (difference < 0 && (!maxLead[teamB.id] || -difference > maxLead[teamB.id].value)) maxLead[teamB.id] = { value: -difference, date: row.date };
  }

  const latest = rows.at(-1)?.snapshot;
  const topPlayers = Object.fromEntries(seasonData.teams.map((team) => {
    const ranked = team.memberIds
      .map((id) => ({ id, name: seasonData.players[id]?.name || id, point: latest?.pointsByPlayer[id] }))
      .filter((item) => typeof item.point === 'number' && Number.isFinite(item.point))
      .sort((a, b) => b.point - a.point);
    return [team.id, ranked[0] || null];
  }));

  const recentChanges = rows.map((row, index) => {
    const previous = rows[index - 1];
    return {
      date: row.date,
      id: row.snapshot.id,
      totals: row.totals,
      changes: Object.fromEntries(seasonData.teams.map((team) => {
        const current = row.totals[team.id];
        const old = previous?.totals[team.id];
        return [team.id, current === null || old === null || old === undefined ? null : round(current - old)];
      })),
    };
  }).slice(-5).reverse();

  return { highest, maxGap, maxLead, topPlayers, recentChanges };
}
