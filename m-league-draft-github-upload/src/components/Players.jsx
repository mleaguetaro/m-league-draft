import { useEffect, useState } from 'react';
import officialStats from '../data/officialStats.json';

const statGroups = [
  { title: '基本成績', items: [
    ['games', '試合数', 'count'], ['rounds', '総局数', 'count'], ['point', 'ポイント', 'point'], ['averageRank', '平均着順', 'rank'],
  ] },
  { title: '着順・順位率', items: [
    ['firstPlaceCount', '1位回数', 'count'], ['secondPlaceCount', '2位回数', 'count'], ['thirdPlaceCount', '3位回数', 'count'], ['fourthPlaceCount', '4位回数', 'count'],
    ['topRate', 'トップ率', 'rate'], ['rentaiRate', '連対率', 'rate'], ['avoidLastRate', 'ラス回避率', 'rate'],
  ] },
  { title: '打点・プレースタイル', items: [
    ['bestScore', 'ベストスコア', 'score'], ['averageScore', '平均打点', 'score'], ['callRate', '副露率', 'rate'], ['reachRate', 'リーチ率', 'rate'],
    ['winRate', 'アガリ率', 'rate'], ['dealInRate', '放銃率', 'rate'], ['averageDealIn', '放銃平均打点', 'score'],
  ] },
];

const numberFormat = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 });

function formatStat(value, type) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (type === 'point') return `${value > 0 ? '+' : ''}${value.toFixed(1)} pt`;
  if (type === 'rate') return `${(value * 100).toFixed(1)}%`;
  if (type === 'rank') return value.toFixed(2);
  if (type === 'score') return `${numberFormat.format(value)} 点`;
  return numberFormat.format(value);
}

function formatFetchedAt(value) {
  if (!value || Number.isNaN(Date.parse(value))) return '未取得';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function getSelectedPlayerId() {
  const [section, id] = window.location.hash.replace('#', '').split('/');
  return section === 'players' ? id : null;
}

function Portrait({ player, className }) {
  const [failed, setFailed] = useState(false);
  return <span className={className} aria-hidden="true">
    {player.imageUrl && !failed
      ? <img src={player.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      : player.name.slice(0, 1)}
  </span>;
}

function PlayerCard({ player, stats, team }) {
  return <a className="stats-player-card" href={`#players/${player.id}`} style={{ '--team-color': team.color }}>
    <Portrait player={player} className="stats-player-card__photo" />
    <div className="stats-player-card__body">
      <span className="stats-player-card__team">{team.name}</span>
      <h3>{player.name}</h3>
      <span className="stats-player-card__official-team">{stats?.officialTeam || '公式成績待ち'}</span>
      <div className="stats-player-card__numbers">
        <strong>{formatStat(stats?.point, 'point')}</strong>
        <span>{formatStat(stats?.games, 'count')}試合</span>
      </div>
      <div className="stats-player-card__sub"><span>平均着順 {formatStat(stats?.averageRank, 'rank')}</span><span>トップ率 {formatStat(stats?.topRate, 'rate')}</span></div>
    </div>
    <span className="stats-player-card__arrow" aria-hidden="true">›</span>
  </a>;
}

function PlayerDetail({ player, stats, team }) {
  return <>
    <a className="player-detail__back" href="#players">← 選手一覧に戻る</a>
    <section className="player-detail" style={{ '--team-color': team.color }} aria-labelledby="player-detail-title">
      <div className="player-detail__hero">
        <Portrait player={player} className="player-detail__photo" />
        <div>
          <span className="player-detail__team">{team.name} · {stats?.officialTeam || '公式成績待ち'}</span>
          <h1 id="player-detail-title">{player.name}</h1>
          <p className="player-detail__point">{formatStat(stats?.point, 'point')}</p>
        </div>
      </div>
      {statGroups.map((group) => <div className="player-detail__group" key={group.title}>
        <h2>{group.title}</h2>
        <dl>{group.items.map(([field, label, type]) => <div key={field}><dt>{label}</dt><dd>{formatStat(stats?.[field], type)}</dd></div>)}</dl>
      </div>)}
    </section>
  </>;
}

export default function Players({ seasonData }) {
  const [selectedId, setSelectedId] = useState(getSelectedPlayerId);
  useEffect(() => {
    const update = () => setSelectedId(getSelectedPlayerId());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  const validSeason = officialStats?.season === seasonData.id;
  const stats = validSeason ? officialStats.players || {} : {};
  const player = selectedId && seasonData.players[selectedId];
  const team = player && seasonData.teams.find((item) => item.memberIds.includes(selectedId));

  return <>
    {player && team ? <PlayerDetail player={player} stats={stats[selectedId]} team={team} /> : <>
      <div className="page-intro">
        <div><p className="eyebrow eyebrow--accent">2026–27 REGULAR SEASON</p><h1>選手成績</h1></div>
        <span className="demo-pill">公式Stats</span>
      </div>
      <div className="stats-rosters">
        {seasonData.teams.map((draftTeam) => <section key={draftTeam.id} className="stats-rosters__team" style={{ '--team-color': draftTeam.color }} aria-label={`${draftTeam.name}の選手`}>
          <div className="stats-rosters__heading"><span>{draftTeam.id.toUpperCase()}</span><h2>{draftTeam.name}</h2></div>
          <div className="stats-rosters__cards">{draftTeam.memberIds.map((id) => <PlayerCard key={id} player={seasonData.players[id]} stats={stats[id]} team={draftTeam} />)}</div>
        </section>)}
      </div>
    </>}
    <p className="official-stats-note">公式Stats取得：{validSeason ? `${formatFetchedAt(officialStats.fetchedAt)} JST` : 'データ未取得'} · <a href="https://m-league.jp/stats/" target="_blank" rel="noreferrer">Mリーグ公式Stats</a></p>
  </>;
}
