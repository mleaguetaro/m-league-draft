export function getLatestSnapshots(snapshots) {
  return [...snapshots].sort((a, b) => {
    const dayA = a.date || a.recordedAt.slice(0, 10);
    const dayB = b.date || b.recordedAt.slice(0, 10);
    return dayB.localeCompare(dayA) ||
    (a.source === 'official' && b.source !== 'official' ? -1 : b.source === 'official' && a.source !== 'official' ? 1 : 0) ||
    Date.parse(b.recordedAt) - Date.parse(a.recordedAt) ||
    (b.order ?? Date.parse(b.createdAt || b.recordedAt)) - (a.order ?? Date.parse(a.createdAt || a.recordedAt));
  });
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
