import { lazy, Suspense, useEffect, useState } from 'react';
import { season } from './data/demoSeason.js';
import officialHistory from './data/officialHistory.json';
import officialStats from './data/officialStats.json';
import { getMatchup } from './lib/score.js';
import { deleteManualSnapshot, getCombinedSnapshots, getActiveSnapshots, loadManualSnapshots, saveManualSnapshot } from './lib/history.js';
import { loadTeamPhotos, prepareTeamPhoto, removeTeamPhoto, saveTeamPhoto } from './lib/teamPhotos.js';
import { loadTeamSettings, saveTeamSettings } from './lib/teamSettings.js';
import { checkAdmin, deleteSharedSnapshot, loadSharedData, removeSharedTeamPhoto, saveSharedSnapshot, saveSharedTeamSettings, sharedEnabled, signInAdmin, signOutAdmin, supabase, uploadSharedTeamPhoto } from './lib/sharedData.js';
import HistorySettings from './components/HistorySettings.jsx';
import TeamSettings from './components/TeamSettings.jsx';
import AdminAccess from './components/AdminAccess.jsx';

const Point = lazy(() => import('./components/Point.jsx'));
const Players = lazy(() => import('./components/Players.jsx'));
const Compare = lazy(() => import('./components/Compare.jsx'));
const Records = lazy(() => import('./components/Records.jsx'));

const tabs = [
  { id: 'home', label: 'HOME', icon: 'home' },
  { id: 'point', label: 'POINT', icon: 'chart' },
  { id: 'players', label: 'PLAYERS', icon: 'players' },
  { id: 'compare', label: 'COMPARE', icon: 'compare' },
  { id: 'records', label: 'RECORDS', icon: 'records' },
  { id: 'settings', label: 'SETTINGS', icon: 'settings' },
];

const iconPaths = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-7h6v7" /></>,
  chart: <><path d="M3 20h18" /><path d="m4 15 5-5 4 3 7-8" /><path d="M16 5h4v4" /></>,
  players: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2H3Z" /><path d="M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1h-3" /></>,
  compare: <><path d="M12 3v18M3 7h6M15 7h6M6 7l-3 6h6L6 7ZM18 7l-3 6h6l-3-6ZM8 21h8" /></>,
  records: <><path d="M6 3h12v18l-6-3-6 3V3Z" /><path d="m9 10 2 2 4-4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2 2-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.05 1.57V21h-2.8v-.09A1.7 1.7 0 0 0 10.94 19a1.7 1.7 0 0 0-1.88.34l-.06.06-2-2 .06-.06A1.7 1.7 0 0 0 7.4 15.5 1.7 1.7 0 0 0 5.83 14.4H5v-2.8h.83A1.7 1.7 0 0 0 7.4 10.5a1.7 1.7 0 0 0-.34-1.88L7 8.56l2-2 .06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12 5.39V5h2.8v.39A1.7 1.7 0 0 0 15.86 7a1.7 1.7 0 0 0 1.88-.34l.06-.06 2 2-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 21 11.6h.01v2.8H21A1.7 1.7 0 0 0 19.4 15Z" transform="translate(-1 -1)" /></>,
};

function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

function formatPoints(value, showPlus = true) {
  if (value === null || value === undefined) return '—';
  return `${showPlus && value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

function formatDate(value) {
  if (!value) return '未更新';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function historyLabel(mode) {
  return { demo: 'デモデータ', manual: '手入力データ', official: '公式Stats', mixed: '公式＋手入力' }[mode] || 'データ未取得';
}

function getTabFromHash() {
  const id = window.location.hash.replace('#', '').split('/')[0].toLowerCase();
  return tabs.some((tab) => tab.id === id) ? id : 'home';
}

function Navigation({ activeTab }) {
  return <nav className="navigation" aria-label="メインナビゲーション">
    <div className="navigation__inner">
      {tabs.map((tab) => <a
        className={`navigation__link ${activeTab === tab.id ? 'is-active' : ''}`}
        href={`#${tab.id}`}
        key={tab.id}
        aria-current={activeTab === tab.id ? 'page' : undefined}
      >
        <Icon name={tab.icon} size={20} />
        <span>{tab.label}</span>
      </a>)}
    </div>
  </nav>;
}

function Header({ activeTab }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return <header className="site-header">
    <div className="site-header__brand" aria-label="M.LEAGUE DRAFT">
      {logoFailed
        ? <span className="brand-mark brand-mark--fallback" aria-hidden="true">M</span>
        : <img className="brand-mark" src="https://m-league.jp/assets/media/img/common/favicon_64-64.png" alt="" onError={() => setLogoFailed(true)} />}
      <span className="brand-name">M.LEAGUE <strong>DRAFT</strong></span>
    </div>
    <Navigation activeTab={activeTab} />
    <div className="site-header__season">2026–27</div>
  </header>;
}

function TeamIcon({ team, photo, variant }) {
  const source = photo || team.imageUrl;
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [source]);

  return <span className={`team-icon team-icon--${variant}`} style={{ '--team-color': team.color }} aria-hidden="true">
    {source && !failed
      ? <img src={source} alt="" onError={() => setFailed(true)} />
      : team.id.toUpperCase()}
  </span>;
}

function ScoreCard({ team, photo, total, change, isLeader }) {
  return <div className={`score-card ${isLeader ? 'score-card--leader' : ''}`} style={{ '--team-color': team.color }}>
    <div className="score-card__top"><TeamIcon team={team} photo={photo} variant="score" /><span className="score-card__team">{team.name}</span></div>
    <div className="score-card__score"><span className="score-card__number">{formatPoints(total)}</span><span className="score-card__unit">pt</span></div>
    <div className="score-card__change"><span className="score-card__change-label">前回更新比</span><span className={change === null ? '' : change >= 0 ? 'is-positive' : 'is-negative'}>{formatPoints(change)} pt</span></div>
  </div>;
}

function PlayerPortrait({ player }) {
  const [failed, setFailed] = useState(false);

  return <span className="player-row__portrait" aria-hidden="true">
    {player?.imageUrl && !failed
      ? <img src={player.imageUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      : <span>{player?.name?.slice(0, 1) ?? '？'}</span>}
  </span>;
}

function TeamRoster({ team, photo, players, latest, previous, total }) {
  return <section className="roster-card" style={{ '--team-color': team.color }} aria-label={`${team.name}の選手`}>
    <div className="roster-card__heading">
      <div className="roster-card__identity"><TeamIcon team={team} photo={photo} variant="roster" /><h3>{team.name}</h3></div>
      <span className="roster-card__total">{formatPoints(total)} <small>pt</small></span>
    </div>
    <div className="roster-card__columns"><span>選手</span><span>ポイント / 前回比</span></div>
    <div className="roster-card__list">
      {team.memberIds.map((id) => {
        const current = latest?.pointsByPlayer[id];
        const old = previous?.pointsByPlayer[id];
        const change = typeof current === 'number' && typeof old === 'number' ? Math.round((current - old) * 10) / 10 : null;
        return <div className="player-row" key={id}>
          <div className="player-row__left"><PlayerPortrait player={players[id]} /><span className="player-row__name">{players[id]?.name ?? '選手未登録'}</span></div>
          <div className="player-row__right"><strong>{formatPoints(current)}</strong><span className={`player-row__delta ${change === null ? '' : change >= 0 ? 'is-positive' : 'is-negative'}`}>{formatPoints(change)}</span></div>
        </div>;
      })}
    </div>
  </section>;
}

function Home({ seasonData, teamPhotos, historyMode }) {
  const matchup = getMatchup(seasonData);
  const updatedAt = matchup.latest?.source === 'official' && officialStats.season === seasonData.id ? officialStats.fetchedAt : matchup.latest?.recordedAt;
  const [teamA, teamB] = seasonData.teams;
  const leader = seasonData.teams.find((team) => team.id === matchup.leaderId);
  const gap = matchup.gap;
  const firstShare = matchup.totals.a !== null && matchup.totals.b !== null && matchup.totals.a > 0 && matchup.totals.b > 0
    ? Math.max(8, Math.min(92, (matchup.totals.a / (matchup.totals.a + matchup.totals.b)) * 100))
    : 50;

  return <>
    <div className="page-intro">
      <div><p className="eyebrow eyebrow--accent">2026–27 REGULAR SEASON</p><h1>ドラフト対戦</h1></div>
      <span className="demo-pill">{historyLabel(historyMode)}</span>
    </div>

    <section className="matchup" aria-labelledby="matchup-title" style={{ '--team-a-color': teamA.color, '--team-b-color': teamB.color, '--leader-color': leader?.color ?? 'var(--league-green)' }}>
      <div className="matchup__topline"><span>{teamA.name}</span><span>VS</span><span>{teamB.name}</span></div>
      <div className="matchup__lead">
        <p id="matchup-title" className="matchup__lead-label">現在のポイント差</p>
        <div className="matchup__lead-score"><span>{gap === null ? '—' : gap.toFixed(1)}</span><small>pt</small></div>
        <p className="matchup__lead-team">{leader ? `${leader.name} がリード` : gap === 0 ? '同点' : 'データ待ち'}</p>
      </div>
      <div className="matchup__scores">
        <ScoreCard team={teamA} photo={teamPhotos[teamA.id]} total={matchup.totals.a} change={matchup.changes.a} isLeader={matchup.leaderId === teamA.id} />
        <span className="matchup__versus" aria-hidden="true">VS</span>
        <ScoreCard team={teamB} photo={teamPhotos[teamB.id]} total={matchup.totals.b} change={matchup.changes.b} isLeader={matchup.leaderId === teamB.id} />
      </div>
      <div className="matchup__balance" aria-hidden="true"><span style={{ width: `${firstShare}%` }} /><span /></div>
      <div className="matchup__meta">{historyMode === 'manual' ? '記録日 ' : '更新 '}<time dateTime={updatedAt}>{historyMode === 'manual' ? matchup.latest?.date?.replaceAll('-', '/') : formatDate(updatedAt)}</time>{historyMode === 'manual' ? '' : ' JST'}</div>
    </section>

    <div className="section-heading"><h2>選手別ポイント</h2></div>
    <div className="rosters">
      {seasonData.teams.map((team) => <TeamRoster key={team.id} team={team} photo={teamPhotos[team.id]} players={seasonData.players} latest={matchup.latest} previous={matchup.previous} total={matchup.totals[team.id]} />)}
    </div>
    <p className="demo-note">※ポイントは{historyLabel(historyMode)}。選手写真・ロゴ：<a href="https://m-league.jp/" target="_blank" rel="noreferrer">Mリーグ公式サイト</a></p>
  </>;
}

function Settings({ seasonData, teamPhotos, onPhotoSelected, onPhotoRemoved, photoBusy, photoError, manualSnapshots, onHistorySave, onHistoryDelete, historyError, onTeamSave, teamSettingsError, sharedMode, canEdit, checkingAuth, onLogin, onLogout, authError }) {
  return <>
    <div className="page-intro">
      <div><p className="eyebrow eyebrow--accent">TEAM SETTINGS</p><h1>設定</h1></div>
    </div>
    {sharedMode && <AdminAccess authorized={canEdit} checking={checkingAuth} onLogin={onLogin} onLogout={onLogout} error={authError} />}
    <TeamSettings teams={seasonData.teams} onSave={onTeamSave} loadError={teamSettingsError} editable={canEdit} sharedMode={sharedMode} />
    <section className="photo-settings" aria-labelledby="photo-settings-title">
      <h2 id="photo-settings-title">チーム写真</h2>
      <div className="photo-settings__grid">
        {seasonData.teams.map((team) => <div className="photo-settings__card" key={team.id} style={{ '--team-color': team.color }}>
          <TeamIcon team={team} photo={teamPhotos[team.id]} variant="settings" />
          <div className="photo-settings__details">
            <span className="photo-settings__label">TEAM {team.id.toUpperCase()}</span>
            <strong>{team.name}</strong>
            {canEdit && <div className="photo-settings__actions">
              <label className="photo-settings__upload">
                {photoBusy === team.id ? '処理中…' : '写真を選ぶ'}
                <input type="file" accept="image/*" disabled={photoBusy !== null} onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onPhotoSelected(team.id, file);
                  event.target.value = '';
                }} />
              </label>
              {(teamPhotos[team.id] || (sharedMode && team.imageUrl)) && <button type="button" disabled={photoBusy !== null} onClick={() => onPhotoRemoved(team.id)}>削除</button>}
            </div>}
          </div>
        </div>)}
      </div>
      <p className="photo-settings__note">{sharedMode ? '写真は共有されます。変更には管理者ログインが必要です。' : '写真はこの端末に保存されます。共有保存は未設定です。'}</p>
      {photoError && <p className="photo-settings__error" role="alert">{photoError}</p>}
    </section>
    <HistorySettings seasonData={seasonData} manualSnapshots={manualSnapshots} onSave={onHistorySave} onDelete={onHistoryDelete} loadError={historyError} editable={canEdit} sharedMode={sharedMode} />
  </>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [teamPhotos, setTeamPhotos] = useState({});
  const [photoBusy, setPhotoBusy] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [manualSnapshots, setManualSnapshots] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [teamSettings, setTeamSettings] = useState(() => season.teams.map(({ id, name, color }) => ({ id, name, color })));
  const [teamSettingsError, setTeamSettingsError] = useState('');
  const [sharingError, setSharingError] = useState('');
  const [sharingLoading, setSharingLoading] = useState(sharedEnabled);
  const [canEdit, setCanEdit] = useState(!sharedEnabled);
  const [checkingAuth, setCheckingAuth] = useState(sharedEnabled);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const updateTab = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', updateTab);
    return () => window.removeEventListener('hashchange', updateTab);
  }, []);

  useEffect(() => {
    if (sharedEnabled) return;
    let active = true;
    loadTeamPhotos().then((photos) => {
      if (active) setTeamPhotos(photos);
    }).catch(() => {
      if (active) setPhotoError('このブラウザでは写真を保存できません。');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (sharedEnabled) return;
    let active = true;
    loadManualSnapshots().then((snapshots) => {
      if (active) setManualSnapshots(snapshots);
    }).catch(() => {
      if (active) setHistoryError('このブラウザでは履歴を読み込めません。');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (sharedEnabled) return;
    let active = true;
    loadTeamSettings(season.teams).then((settings) => {
      if (active) setTeamSettings(settings);
    }).catch(() => {
      if (active) setTeamSettingsError('このブラウザではチーム設定を読み込めません。');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!sharedEnabled) return;
    let active = true;
    loadSharedData().then(({ teamSettings: savedTeams, manualSnapshots: savedHistory }) => {
      if (!active) return;
      setTeamSettings(savedTeams);
      setManualSnapshots(savedHistory);
      setSharingError('');
    }).catch(() => {
      if (active) setSharingError('共有データを読み込めません。接続を確認して再読み込みしてください。');
    }).finally(() => { if (active) setSharingLoading(false); });
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error) throw error;
      const authorized = data.user ? await checkAdmin() : false;
      if (active) setCanEdit(authorized);
    }).catch(() => {
      if (active) setAuthError('ログイン状態を確認できませんでした。');
    }).finally(() => { if (active) setCheckingAuth(false); });
    return () => { active = false; };
  }, []);

  async function handleLogin(email, password) {
    await signInAdmin(email, password);
    setCanEdit(true);
    setAuthError('');
    const current = await loadSharedData();
    setTeamSettings(current.teamSettings);
    setManualSnapshots(current.manualSnapshots);
    setSharingError('');
  }

  async function handleLogout() {
    await signOutAdmin();
    setCanEdit(false);
  }

  async function handlePhotoSelected(id, file) {
    setPhotoBusy(id);
    setPhotoError('');
    try {
      if (sharedEnabled) {
        if (!canEdit) throw new Error('管理者ログインが必要です。');
        const previousPath = teamSettings.find((team) => team.id === id)?.photoPath;
        const photo = await uploadSharedTeamPhoto(id, file, previousPath);
        setTeamSettings((previous) => previous.map((team) => team.id === id ? { ...team, ...photo } : team));
        return;
      }
      const photo = await prepareTeamPhoto(file);
      await saveTeamPhoto(id, photo);
      setTeamPhotos((previous) => ({ ...previous, [id]: photo }));
    } catch (error) {
      setPhotoError(error?.message || '写真を保存できませんでした。');
    } finally {
      setPhotoBusy(null);
    }
  }

  async function handlePhotoRemoved(id) {
    setPhotoBusy(id);
    setPhotoError('');
    try {
      if (sharedEnabled) {
        if (!canEdit) throw new Error('管理者ログインが必要です。');
        await removeSharedTeamPhoto(id, teamSettings.find((team) => team.id === id)?.photoPath);
        setTeamSettings((previous) => previous.map((team) => team.id === id ? { ...team, imageUrl: null, photoPath: null } : team));
        return;
      }
      await removeTeamPhoto(id);
      setTeamPhotos((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
    } catch {
      setPhotoError('写真を削除できませんでした。');
    } finally {
      setPhotoBusy(null);
    }
  }

  async function handleHistorySave(snapshot, previousId) {
    if (sharedEnabled) {
      if (!canEdit) throw new Error('管理者ログインが必要です。');
      await saveSharedSnapshot(snapshot);
    } else {
      await saveManualSnapshot(snapshot, previousId);
    }
    setManualSnapshots((previous) => getActiveSnapshots([], [...previous.filter((item) => item.id !== previousId && item.id !== snapshot.id), snapshot]));
  }

  async function handleHistoryDelete(id) {
    if (sharedEnabled) {
      if (!canEdit) throw new Error('管理者ログインが必要です。');
      await deleteSharedSnapshot(id);
    } else {
      await deleteManualSnapshot(id);
    }
    setManualSnapshots((previous) => previous.filter((item) => item.id !== id));
  }

  async function handleTeamSave(teams) {
    if (sharedEnabled && !canEdit) throw new Error('管理者ログインが必要です。');
    const saved = sharedEnabled ? await saveSharedTeamSettings(teams, season.teams) : await saveTeamSettings(teams, season.teams);
    setTeamSettings((previous) => previous.map((team) => ({ ...team, ...saved.find((item) => item.id === team.id) })));
    setTeamSettingsError('');
  }

  const officialSnapshots = officialHistory.season === season.id ? officialHistory.snapshots : [];
  const historyMode = officialSnapshots.length && manualSnapshots.length ? 'mixed' : officialSnapshots.length ? 'official' : manualSnapshots.length ? 'manual' : 'demo';
  const teams = season.teams.map((team) => ({ ...team, ...teamSettings.find((item) => item.id === team.id) }));
  const seasonData = { ...season, teams, snapshots: getCombinedSnapshots(season.snapshots, officialSnapshots, manualSnapshots) };

  return <div className="app-shell">
    <Header activeTab={activeTab} />
    <main className="main-content">
      {sharedEnabled ? sharingLoading ? <p className="sharing-banner">共有データを読み込み中…</p> : sharingError && <p className="sharing-banner sharing-banner--error" role="alert">{sharingError}</p> : <p className="sharing-banner">共有保存は未設定です。チーム設定と手入力履歴はこの端末だけに保存されます。</p>}
      {activeTab === 'home'
        ? <Home seasonData={seasonData} teamPhotos={teamPhotos} historyMode={historyMode} />
        : activeTab === 'point'
          ? <Suspense fallback={<div className="chart-loading">グラフを読み込み中…</div>}><Point seasonData={seasonData} historyMode={historyMode} /></Suspense>
        : activeTab === 'players'
          ? <Suspense fallback={<div className="chart-loading">選手成績を読み込み中…</div>}><Players seasonData={seasonData} /></Suspense>
        : activeTab === 'compare'
          ? <Suspense fallback={<div className="chart-loading">比較を読み込み中…</div>}><Compare seasonData={seasonData} /></Suspense>
        : activeTab === 'records'
          ? <Suspense fallback={<div className="chart-loading">記録を読み込み中…</div>}><Records seasonData={seasonData} historyMode={historyMode} /></Suspense>
        : activeTab === 'settings'
          ? <Settings seasonData={seasonData} teamPhotos={teamPhotos} onPhotoSelected={handlePhotoSelected} onPhotoRemoved={handlePhotoRemoved} photoBusy={photoBusy} photoError={photoError} manualSnapshots={manualSnapshots} onHistorySave={handleHistorySave} onHistoryDelete={handleHistoryDelete} historyError={historyError} onTeamSave={handleTeamSave} teamSettingsError={teamSettingsError} sharedMode={sharedEnabled} canEdit={canEdit} checkingAuth={checkingAuth} onLogin={handleLogin} onLogout={handleLogout} authError={authError} />
          : null}
    </main>
    <footer className="site-footer"><span>M.LEAGUE DRAFT</span><span>2026–27 · {historyMode.toUpperCase()}</span></footer>
  </div>;
}
