import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getPlayerChartRows, getTeamChartRows } from '../lib/history.js';

const playerColors = {
  date: '#c62828',
  watanabe: '#e76f51',
  hori: '#9e3a52',
  shimoishi: '#c77d2f',
  sasaki: '#1565c0',
  nakabayashi: '#0088b6',
  kurosawa: '#6255a4',
  katsumata: '#29867b',
};

const shortDate = (value) => value?.slice(5).replace('-', '/') || '';
const formatTooltip = (value, name) => [`${Number(value).toFixed(1)} pt`, name];
const historyLabel = { demo: 'デモデータ', manual: '手入力データ', official: '公式Stats', mixed: '公式＋手入力' };

function ChartFrame({ children, label }) {
  return <div className="chart-frame" role="img" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  </div>;
}

function chartParts() {
  return [
    <CartesianGrid key="grid" stroke="#e9eeea" strokeDasharray="3 4" vertical={false} />,
    <XAxis key="x" dataKey="day" tickFormatter={shortDate} tick={{ fill: '#69736b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#d6ded8' }} minTickGap={18} />,
    <YAxis key="y" tick={{ fill: '#69736b', fontSize: 10 }} tickLine={false} axisLine={false} width={45} tickFormatter={(value) => Number(value).toFixed(0)} />,
    <Tooltip key="tooltip" formatter={formatTooltip} labelFormatter={(date) => date} contentStyle={{ border: '1px solid #dce3dd', borderRadius: 6, fontSize: 12 }} />,
    <ReferenceLine key="zero" y={0} stroke="#aab7ac" strokeDasharray="4 4" />,
  ];
}

export default function Point({ seasonData, historyMode }) {
  const [selectedIds, setSelectedIds] = useState(['date', 'sasaki']);
  const teams = seasonData.teams;
  const playerIds = Object.keys(seasonData.players);
  const teamRows = getTeamChartRows(seasonData.snapshots, teams);
  const playerRows = getPlayerChartRows(seasonData.snapshots, playerIds);

  function togglePlayer(id) {
    setSelectedIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
  }

  return <>
    <div className="page-intro">
      <div><p className="eyebrow eyebrow--accent">2026–27 REGULAR SEASON</p><h1>ポイント推移</h1></div>
      <span className="demo-pill">{historyLabel[historyMode]}</span>
    </div>

    <section className="chart-card" aria-labelledby="team-chart-title">
      <div className="chart-card__heading"><div><p className="eyebrow eyebrow--accent">TEAM POINT</p><h2 id="team-chart-title">チームポイント推移</h2></div><span>4選手合計</span></div>
      <div className="chart-legend">
        {teams.map((team) => <span key={team.id}><i style={{ background: team.color }} />{team.name}</span>)}
      </div>
      <ChartFrame label="日付ごとのチーム累積ポイント推移">
        <LineChart data={teamRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          {chartParts()}
          {teams.map((team) => <Line key={team.id} type="linear" dataKey={team.id} name={team.name} stroke={team.color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
        </LineChart>
      </ChartFrame>
    </section>

    <section className="chart-card" aria-labelledby="player-chart-title">
      <div className="chart-card__heading"><div><p className="eyebrow eyebrow--accent">PLAYER POINT</p><h2 id="player-chart-title">選手ポイント推移</h2></div><span>複数選択可</span></div>
      <div className="player-picks" aria-label="比較する選手">
        {teams.map((team) => <div className="player-picks__team" key={team.id}>
          <div className="player-picks__team-name" style={{ color: team.color }}>{team.name}</div>
          <div className="player-picks__buttons">
            {team.memberIds.map((id) => <button key={id} type="button" className={selectedIds.includes(id) ? 'is-selected' : ''} style={{ '--player-color': playerColors[id] }} aria-pressed={selectedIds.includes(id)} onClick={() => togglePlayer(id)}>{seasonData.players[id].name}</button>)}
          </div>
        </div>)}
      </div>
      {selectedIds.length ? <ChartFrame label="選択した選手のシーズン累積ポイント推移">
        <LineChart data={playerRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          {chartParts()}
          {selectedIds.map((id) => <Line key={id} type="linear" dataKey={id} name={seasonData.players[id].name} stroke={playerColors[id]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
        </LineChart>
      </ChartFrame> : <div className="chart-empty">選手を選択してください。</div>}
    </section>
  </>;
}
