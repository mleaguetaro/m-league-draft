import { useEffect, useState } from 'react';

export default function TeamSettings({ teams, onSave, loadError, editable = true, sharedMode = false }) {
  const [draft, setDraft] = useState(() => teams.map(({ id, name, color }) => ({ id, name, color })));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const signature = JSON.stringify(teams.map(({ id, name, color }) => ({ id, name, color })));

  useEffect(() => setDraft(teams.map(({ id, name, color }) => ({ id, name, color }))), [signature]);

  function update(id, field, value) {
    setDraft((previous) => previous.map((team) => team.id === id ? { ...team, [field]: value } : team));
    setMessage('');
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await onSave(draft);
      setMessage('保存しました。');
    } catch (error) {
      setMessage(error?.message || '保存できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  return <section className="team-settings" aria-labelledby="team-settings-title">
    <h2 id="team-settings-title">チーム名・カラー</h2>
    {editable ? <form onSubmit={submit}>
      <div className="team-settings__grid">
        {draft.map((team) => <div className="team-settings__card" key={team.id} style={{ '--team-color': team.color }}>
          <span className="team-settings__label">TEAM {team.id.toUpperCase()}</span>
          <label>チーム名<input type="text" value={team.name} maxLength={24} required onChange={(event) => update(team.id, 'name', event.target.value)} /></label>
          <label>チームカラー<span className="team-settings__color"><input type="color" value={team.color} onChange={(event) => update(team.id, 'color', event.target.value)} /><code>{team.color.toUpperCase()}</code></span></label>
        </div>)}
      </div>
      <div className="team-settings__actions"><button type="submit" disabled={busy}>{busy ? '保存中…' : '設定を保存'}</button>{message && <span role="status">{message}</span>}</div>
    </form> : <div className="team-settings__grid">{teams.map((team) => <div className="team-settings__card team-settings__card--read" key={team.id} style={{ '--team-color': team.color }}><span className="team-settings__label">TEAM {team.id.toUpperCase()}</span><strong>{team.name}</strong><span className="team-settings__color"><i style={{ background: team.color }} />{team.color.toUpperCase()}</span></div>)}</div>}
    <p className="team-settings__note">{sharedMode ? 'チーム設定は共有されます。変更には管理者ログインが必要です。' : '設定はこの端末に保存されます。共有保存は未設定です。'}</p>
    {loadError && <p className="team-settings__error" role="alert">{loadError}</p>}
  </section>;
}
