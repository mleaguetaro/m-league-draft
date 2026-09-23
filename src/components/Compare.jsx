import { useState } from 'react';
import officialStats from '../data/officialStats.json';

const metrics = [
  { key: 'point', label: 'ポイント', type: 'point', direction: 'high' },
  { key: 'averageRank', label: '平均着順', type: 'rank', direction: 'low' },
  { key: 'topRate', label: 'トップ率', type: 'rate', direction: 'high' },
  { key: 'rentaiRate', label: '連対率', type: 'rate', direction: 'high' },
  { key: 'winRate', label: 'アガリ率', type: 'rate', direction: 'high' },
  { key: 'dealInRate', label: '放銃率', type: 'rate', direction: 'low' },
  { key: 'reachRate', label: 'リーチ率', type: 'rate', direction: null },
  { key: 'callRate', label: '副露率', type: 'rate', direction: null },
  { key: 'averageScore', label: '平均打点', type: 'score', direction: 'high' },
  { key: 'averageDealIn', label: '放銃平均打点', type: 'score', direction: 'low' },
];

const numberFormat = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 });

function formatValue(value, type) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (type === 'point') return `${value > 0 ? '+' : ''}${value.toFixed(1)} pt`;
  if (type === 'rank') return value.toFixed(2);
  if (type === 'rate') return `${(value * 100).toFixed(1)}%`;
  return `${numberFormat.format(value)} 点`;
}

function barWidth(value, other) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const maximum = Math.max(Math.abs(value), Math.abs(other ?? 0), 0.001);
  return Math.max(value === 0 ? 0 : 8, Math.abs(value) / maximum * 100);
}

function MetricRow({ metric, left, right, colors }) {
  const a = left?.[metric.key];
  const b = right?.[metric.key];
  const comparable = typeof a === 'number' && typeof b === 'number' && metric.direction;
  const leftBetter = comparable && a !== b && (metric.direction === 'high' ? a > b : a < b);
  const rightBetter = comparable && a !== b && !leftBetter;
  return <div className="compare-metric">
    <div className="compare-metric__heading"><h3>{metric.label}</h3>{metric.direction === 'low' && <span>低い方が良い</span>}</div>
    <div className="compare-metric__pair">
      <div className={`compare-metric__side ${leftBetter ? 'is-better' : ''}`}>
        <strong>{formatValue(a, metric.type)}</strong>
        <div className="compare-metric__track"><span className={a < 0 ? 'is-negative' : ''} style={{ width: `${barWidth(a, b)}%`, backgroundColor: colors[0] }} /></div>
      </div>
      <div className={`compare-metric__side ${rightBetter ? 'is-better' : ''}`}>
        <strong>{formatValue(b, metric.type)}</strong>
        <div className="compare-metric__track"><span className={b < 0 ? 'is-negative' : ''} style={{ width: `${barWidth(b, a)}%`, backgroundColor: colors[1] }} /></div>
      </div>
    </div>
  </div>;
}

export default function Compare({ seasonData }) {
  const allIds = seasonData.teams.flatMap((team) => team.memberIds);
  const [leftId, setLeftId] = useState(allIds[0]);
  const [rightId, setRightId] = useState(allIds[4] || allIds[1]);
  const leftTeam = seasonData.teams.find((team) => team.memberIds.includes(leftId));
  const rightTeam = seasonData.teams.find((team) => team.memberIds.includes(rightId));
  const stats = officialStats.season === seasonData.id ? officialStats.players : {};

  function chooseLeft(id) {
    if (id === rightId) setRightId(leftId);
    setLeftId(id);
  }
  function chooseRight(id) {
    if (id === leftId) setLeftId(rightId);
    setRightId(id);
  }

  return <>
    <div className="page-intro">
      <div><p className="eyebrow eyebrow--accent">2026–27 REGULAR SEASON</p><h1>選手比較</h1></div>
      <span className="demo-pill">公式Stats</span>
    </div>
    <section className="compare-panel" aria-label="比較する選手と成績">
      <div className="compare-selectors">
        {[[leftId, chooseLeft, leftTeam, '選手1'], [rightId, chooseRight, rightTeam, '選手2']].map(([id, choose, team, label]) => <label key={label} className="compare-selector" style={{ '--team-color': team?.color || 'var(--league-green)' }}>
          <span>{label}</span>
          <select value={id} onChange={(event) => choose(event.target.value)}>
            {seasonData.teams.map((draftTeam) => <optgroup key={draftTeam.id} label={draftTeam.name}>
              {draftTeam.memberIds.map((playerId) => <option key={playerId} value={playerId}>{seasonData.players[playerId]?.name || playerId}</option>)}
            </optgroup>)}
          </select>
          <small>{team?.name}</small>
        </label>)}
      </div>
      <div className="compare-column-labels" aria-hidden="true"><span style={{ color: leftTeam?.color }}>{seasonData.players[leftId]?.name}</span><span style={{ color: rightTeam?.color }}>{seasonData.players[rightId]?.name}</span></div>
      <p className="compare-legend"><span aria-hidden="true">●</span> 数値が優勢な選手。斜線はマイナス値。リーチ率・副露率は優劣を付けません。</p>
      <div className="compare-metrics">
        {metrics.map((metric) => <MetricRow key={metric.key} metric={metric} left={stats[leftId]} right={stats[rightId]} colors={[leftTeam?.color, rightTeam?.color]} />)}
      </div>
    </section>
    <p className="official-stats-note">成績取得：{officialStats.season === seasonData.id ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(officialStats.fetchedAt)) + ' JST' : '未取得'} · <a href="https://m-league.jp/stats/" target="_blank" rel="noreferrer">Mリーグ公式Stats</a></p>
  </>;
}
