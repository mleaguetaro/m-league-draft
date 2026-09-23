export function compareSnapshots(a, b) {
  const dayA = a.date || a.recordedAt?.slice(0, 10) || '';
  const dayB = b.date || b.recordedAt?.slice(0, 10) || '';
  return dayA.localeCompare(dayB) ||
    (a.round ?? 3) - (b.round ?? 3) ||
    String(a.table || '').localeCompare(String(b.table || '')) ||
    Date.parse(a.recordedAt || a.createdAt) - Date.parse(b.recordedAt || b.createdAt) ||
    (a.order ?? 0) - (b.order ?? 0) ||
    (a.source === 'official-game' || a.source === 'official' ? 1 : 0) - (b.source === 'official-game' || b.source === 'official' ? 1 : 0);
}

export function getLatestSnapshots(snapshots) {
  return [...snapshots].sort((a, b) => compareSnapshots(b, a));
}

export function getTeamTotal(team, snapshot) {
  if (!snapshot) return null;
  const points = team.memberIds.map((id) => snapshot.pointsByPlayer[id]);
  if (points.some((point) => typeof point !== 'number' || !Number.isFinite(point))) {
    return null;
  }
  return Math.round(points.reduce((total, point) => total + point, 0) * 10) / 10;
}

export function getMatchup(season) {
  const [latest, previous] = getLatestSnapshots(season.snapshots);
  const [teamA, teamB] = season.teams;
  const totalA = getTeamTotal(teamA, latest);
  const totalB = getTeamTotal(teamB, latest);
  const previousA = getTeamTotal(teamA, previous);
  const previousB = getTeamTotal(teamB, previous);
  const gap = totalA === null || totalB === null ? null : Math.round(Math.abs(totalA - totalB) * 10) / 10;
  const leaderId = gap === null || gap === 0 ? null : totalA > totalB ? teamA.id : teamB.id;

  return {
    latest,
    previous,
    gap,
    leaderId,
    totals: { [teamA.id]: totalA, [teamB.id]: totalB },
    changes: {
      [teamA.id]: totalA === null || previousA === null ? null : Math.round((totalA - previousA) * 10) / 10,
      [teamB.id]: totalB === null || previousB === null ? null : Math.round((totalB - previousB) * 10) / 10,
    },
  };
}
