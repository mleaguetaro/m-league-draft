import { getRecords } from '../lib/records.js';

const point = (value) => value === null || value === undefined ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)} pt`;
const date = (value) => value ? value.replaceAll('-', '/') : '記録なし';
const historyLabel = { demo: 'デモデータ', manual: '手入力データ', official: '公式Stats', mixed: '公式＋手入力' };

function RecordCard({ title, entry, team, absolute = false }) {
  return <div className="record-card" style={{ '--record-color': team?.color || 'var(--league-green)' }}>
    <span>{title}</span>
    <strong>{entry ? absolute ? `${entry.value.toFixed(1)} pt` : point(entry.value) : '—'}</strong>
    <small>{entry ? date(entry.label || entry.date) : '記録なし'}</small>
  </div>;
}

export default function Records({ seasonData, historyMode }) {
  const [teamA, teamB] = seasonData.teams;
  const records = getRecords(seasonData);
  return <>
    <div className="page-intro">
      <div><p className="eyebrow eyebrow--accent">2026–27 REGULAR SEASON</p><h1>対戦記録</h1></div>
      <span className="demo-pill">{historyLabel[historyMode]}</span>
    </div>

    <section className="records-section" aria-labelledby="records-high-title">
      <h2 id="records-high-title">最高到達ポイント</h2>
      <div className="record-grid record-grid--two">
        {seasonData.teams.map((team) => <RecordCard key={team.id} title={team.name} entry={records.highest[team.id]} team={team} />)}
      </div>
    </section>

    <section className="records-section" aria-labelledby="records-lead-title">
      <h2 id="records-lead-title">ポイント差とリード</h2>
      <div className="record-grid">
        <RecordCard title="最大ポイント差" entry={records.maxGap} absolute />
        <RecordCard title={`${teamA.name} 最大リード`} entry={records.maxLead[teamA.id]} team={teamA} />
        <RecordCard title={`${teamB.name} 最大リード`} entry={records.maxLead[teamB.id]} team={teamB} />
      </div>
    </section>

    <section className="records-section" aria-labelledby="records-top-title">
      <h2 id="records-top-title">チーム内最多ポイント</h2>
      <div className="record-grid record-grid--two">
        {seasonData.teams.map((team) => {
          const player = records.topPlayers[team.id];
          return <div className="record-card record-card--player" key={team.id} style={{ '--record-color': team.color }}>
            <span>{team.name}</span><strong>{player?.name || '—'}</strong><small>{player ? point(player.point) : '記録なし'}</small>
          </div>;
        })}
      </div>
    </section>

    <section className="records-section" aria-labelledby="records-recent-title">
      <h2 id="records-recent-title">直近のポイント変動</h2>
      <div className="record-recent">
        {records.recentChanges.length ? records.recentChanges.map((row) => <div className="record-recent__row" key={row.id}>
          <time dateTime={row.date}>{date(row.label || row.date)}</time>
          {seasonData.teams.map((team) => <div key={team.id} style={{ '--record-color': team.color }}><span>{team.name}</span><strong>{row.changes[team.id] === null ? '初回' : point(row.changes[team.id])}</strong></div>)}
        </div>) : <p className="record-recent__empty">履歴を入力すると表示されます。</p>}
      </div>
    </section>
    <p className="demo-note">※記録は{historyLabel[historyMode]}の履歴から計算しています。</p>
  </>;
}
