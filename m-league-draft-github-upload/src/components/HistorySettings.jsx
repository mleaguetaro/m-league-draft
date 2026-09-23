import { useState } from 'react';
import { getTeamTotal } from '../lib/score.js';
import { isDuplicateSnapshot, makeManualSnapshot } from '../lib/history.js';

const emptyForm = () => ({ date: '', pointsByPlayer: {} });

export default function HistorySettings({ seasonData, manualSnapshots, onSave, onDelete, loadError, editable = true, sharedMode = false }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const playerIds = Object.keys(seasonData.players);

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setError('');
    setConfirmDeleteId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      if (playerIds.some((id) => String(form.pointsByPlayer[id] ?? '').trim() === '')) {
        throw new Error('8選手すべての累積ポイントを入力してください。');
      }
      const points = Object.fromEntries(playerIds.map((id) => [id, Number(form.pointsByPlayer[id])]));
      const existing = manualSnapshots.find((item) => item.id === editingId) || null;
      const snapshot = makeManualSnapshot(form.date, points, playerIds, existing);
      if (isDuplicateSnapshot(snapshot, manualSnapshots)) {
        throw new Error('同じ日付・同じポイントの履歴は保存済みです。');
      }
      setBusy(true);
      await onSave(snapshot, editingId);
      resetForm();
    } catch (cause) {
      setError(cause?.message || '履歴を保存できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  function handleEdit(snapshot) {
    setForm({
      date: snapshot.date,
      pointsByPlayer: Object.fromEntries(playerIds.map((id) => [id, String(snapshot.pointsByPlayer[id] ?? '')])),
    });
    setEditingId(snapshot.id);
    setError('');
    setConfirmDeleteId(null);
    document.getElementById('history-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleDelete(snapshot) {
    setBusy(true);
    setError('');
    try {
      await onDelete(snapshot.id);
      setConfirmDeleteId(null);
      if (editingId === snapshot.id) resetForm();
    } catch {
      setError('履歴を削除できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  return <section className="history-settings" aria-labelledby="history-settings-title">
    <div className="history-settings__heading">
      <div><p className="eyebrow eyebrow--accent">POINT HISTORY</p><h2 id="history-settings-title">{editable ? '過去ポイント入力' : '過去ポイント履歴'}</h2></div>
      <span>2026–27</span>
    </div>
    {editable && <><p className="history-settings__hint">各選手の、その日時点のシーズン累積ポイントを入力してください。</p>
    <form id="history-form" className="history-form" onSubmit={handleSubmit}>
      <label className="history-form__date">日付
        <input type="date" required value={form.date} onInput={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))} onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))} />
      </label>
      <div className="history-form__teams">
        {seasonData.teams.map((team) => <fieldset key={team.id} style={{ '--team-color': team.color }}>
          <legend>{team.name}</legend>
          {team.memberIds.map((id) => <label key={id} className="history-form__player"><span>{seasonData.players[id].name}</span>
            <span className="history-form__point-input"><input type="number" step="0.1" inputMode="decimal" required value={form.pointsByPlayer[id] ?? ''} onChange={(event) => setForm((previous) => ({ ...previous, pointsByPlayer: { ...previous.pointsByPlayer, [id]: event.target.value } }))} aria-label={`${seasonData.players[id].name} 累積ポイント`} /><small>pt</small></span>
          </label>)}
        </fieldset>)}
      </div>
      <div className="history-form__actions">
        <button type="submit" disabled={busy}>{busy ? '保存中…' : editingId ? '変更を保存' : '履歴を保存'}</button>
        {editingId && <button className="history-form__cancel" type="button" disabled={busy} onClick={resetForm}>キャンセル</button>}
      </div>
      {(error || loadError) && <p className="history-form__error" role="alert">{error || loadError}</p>}
    </form></>}

    <div className="history-list">
      <h3>保存した履歴 <small>{manualSnapshots.length}件</small></h3>
      {manualSnapshots.length ? [...manualSnapshots].reverse().map((snapshot) => <div className="history-list__item" key={snapshot.id}>
        <time dateTime={snapshot.date}>{snapshot.date.replaceAll('-', '/')}</time>
        <div className="history-list__totals">
          {seasonData.teams.map((team) => <span key={team.id} style={{ color: team.color }}>{team.name} <strong>{getTeamTotal(team, snapshot)?.toFixed(1) ?? '—'} pt</strong></span>)}
        </div>
        {editable && <div className="history-list__actions">{confirmDeleteId === snapshot.id
          ? <><button className="history-list__delete-confirm" type="button" disabled={busy} onClick={() => handleDelete(snapshot)}>削除する</button><button className="history-list__cancel-delete" type="button" disabled={busy} onClick={() => setConfirmDeleteId(null)}>やめる</button></>
          : <><button type="button" disabled={busy} onClick={() => handleEdit(snapshot)}>修正</button><button type="button" disabled={busy} onClick={() => setConfirmDeleteId(snapshot.id)}>削除</button></>}</div>}
      </div>) : <p className="history-list__empty">手入力履歴はまだありません。</p>}
    </div>
    <p className="history-settings__note">{sharedMode ? '手入力履歴は共有されます。変更には管理者ログインが必要です。' : '手入力履歴はこの端末に保存されます。共有保存は未設定です。'}</p>
  </section>;
}
