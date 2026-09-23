import { useState } from 'react';
import { getTeamTotal } from '../lib/score.js';
import { findManualPlayerEntry, isDuplicateSnapshot, makeManualPlayerSnapshot, snapshotLabel } from '../lib/history.js';

const emptyForm = () => ({ date: '', round: 1, table: 'A', playerId: '', point: '' });

export default function HistorySettings({ seasonData, manualSnapshots, onSave, onDelete, loadError, editable = true, sharedMode = false }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const players = Object.values(seasonData.players);

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
      if (String(form.point).trim() === '') throw new Error('累積ポイントを入力してください。');
      const existing = manualSnapshots.find((item) => item.id === editingId) || null;
      const snapshot = makeManualPlayerSnapshot(form.date, form.playerId, Number(form.point), Number(form.round), form.table, existing);
      if (isDuplicateSnapshot(snapshot, manualSnapshots)) throw new Error('同じ試合・同じ選手のポイントは保存済みです。');
      if (findManualPlayerEntry(snapshot, manualSnapshots)) throw new Error('この試合の選手は登録済みです。保存済みの行から「修正」を選んでください。');
      const officialGame = seasonData.snapshots.find((item) => item.date === snapshot.date && item.round === snapshot.round &&
        item.gameEntries?.some((game) => game.table === snapshot.table && Object.hasOwn(game.gamePointsByPlayer || {}, form.playerId)));
      if (officialGame) throw new Error('この選手の試合結果は公式データに登録済みです。');
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
    const ids = Object.keys(snapshot.pointsByPlayer);
    if (ids.length !== 1 || !snapshot.round || !snapshot.table) {
      setError('旧形式の一括履歴はこの画面で修正できません。');
      return;
    }
    setForm({ date: snapshot.date, round: snapshot.round, table: snapshot.table, playerId: ids[0], point: String(snapshot.pointsByPlayer[ids[0]]) });
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
    {editable && <>
      <p className="history-settings__hint">1試合・1選手ずつ、その試合後のシーズン累積ポイントを入力します。連闘は第1・第2試合をそれぞれ登録できます。</p>
      <form id="history-form" className="history-form" onSubmit={handleSubmit}>
        <div className="history-form__fields">
          <label>日付<input type="date" required value={form.date} onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))} /></label>
          <label>試合<select value={form.round} onChange={(event) => setForm((previous) => ({ ...previous, round: Number(event.target.value) }))}><option value={1}>第1試合</option><option value={2}>第2試合</option></select></label>
          <label>卓<select value={form.table} onChange={(event) => setForm((previous) => ({ ...previous, table: event.target.value }))}><option value="A">A卓</option><option value="B">B卓</option></select></label>
          <label>選手<select required value={form.playerId} onChange={(event) => setForm((previous) => ({ ...previous, playerId: event.target.value }))}><option value="">選択してください</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
          <label>累積ポイント<span className="history-form__point-input"><input type="number" step="0.1" inputMode="decimal" required value={form.point} onChange={(event) => setForm((previous) => ({ ...previous, point: event.target.value }))} /><small>pt</small></span></label>
        </div>
        <div className="history-form__actions">
          <button type="submit" disabled={busy}>{busy ? '保存中…' : editingId ? '変更を保存' : '1人分を保存'}</button>
          {editingId && <button className="history-form__cancel" type="button" disabled={busy} onClick={resetForm}>キャンセル</button>}
        </div>
        {(error || loadError) && <p className="history-form__error" role="alert">{error || loadError}</p>}
      </form>
    </>}

    <div className="history-list">
      <h3>保存した履歴 <small>{manualSnapshots.length}件</small></h3>
      {manualSnapshots.length ? [...manualSnapshots].reverse().map((snapshot) => {
        const ids = Object.keys(snapshot.pointsByPlayer);
        const resolved = seasonData.snapshots.find((item) => item.entryIds?.includes(snapshot.id));
        return <div className="history-list__item" key={snapshot.id}>
          <time dateTime={snapshot.date}>{snapshotLabel(snapshot).replaceAll('-', '/')}</time>
          {ids.length === 1 ? <div className="history-list__totals"><span>{seasonData.players[ids[0]]?.name || ids[0]} <strong>{snapshot.pointsByPlayer[ids[0]].toFixed(1)} pt</strong></span></div>
            : <div className="history-list__totals">{seasonData.teams.map((team) => <span key={team.id} style={{ color: team.color }}>{team.name} <strong>{getTeamTotal(team, resolved)?.toFixed(1) ?? '—'} pt</strong></span>)}</div>}
          {editable && <div className="history-list__actions">{confirmDeleteId === snapshot.id
            ? <><button className="history-list__delete-confirm" type="button" disabled={busy} onClick={() => handleDelete(snapshot)}>削除する</button><button className="history-list__cancel-delete" type="button" disabled={busy} onClick={() => setConfirmDeleteId(null)}>やめる</button></>
            : <>{ids.length === 1 && <button type="button" disabled={busy} onClick={() => handleEdit(snapshot)}>修正</button>}<button type="button" disabled={busy} onClick={() => setConfirmDeleteId(snapshot.id)}>削除</button></>}</div>}
        </div>;
      }) : <p className="history-list__empty">手入力履歴はまだありません。</p>}
    </div>
    <p className="history-settings__note">{sharedMode ? '手入力履歴は共有されます。変更には管理者ログインが必要です。' : '手入力履歴はこの端末に保存されます。共有保存は未設定です。'}</p>
  </section>;
}
