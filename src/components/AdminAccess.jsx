import { useState } from 'react';

export default function AdminAccess({ authorized, checking, onLogin, onLogout, onChangePassword, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await onLogin(email.trim(), password);
      setPassword('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (cause) {
      setMessage(cause?.message || 'ログインできませんでした。');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setMessage('');
    try {
      await onLogout();
      setPassword('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('');
    }
    catch (cause) { setMessage(cause?.message || 'ログアウトできませんでした。'); }
    finally { setBusy(false); }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordMessage('');
    if (newPassword !== confirmPassword) {
      setPasswordMessage('新しいパスワードが一致しません。');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage('新しいパスワードは8文字以上にしてください。');
      return;
    }
    setBusy(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('パスワードを変更しました。');
    } catch (cause) {
      setPasswordMessage(cause?.message || 'パスワードを変更できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  return <section className="admin-access" aria-labelledby="admin-access-title">
    <h2 id="admin-access-title">管理者ログイン</h2>
    {checking ? <p>ログイン状態を確認中…</p> : authorized ? <>
      <div className="admin-access__authorized"><span>変更できます。</span><button type="button" disabled={busy} onClick={logout}>ログアウト</button></div>
      <details className="admin-access__password">
        <summary>管理者パスワードを変更</summary>
        <form onSubmit={changePassword}>
          <label>現在のパスワード<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <label>新しいパスワード<input type="password" autoComplete="new-password" minLength="8" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label>新しいパスワード（確認）<input type="password" autoComplete="new-password" minLength="8" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          <button type="submit" disabled={busy}>{busy ? '変更中…' : '変更する'}</button>
        </form>
        {passwordMessage && <p className={passwordMessage === 'パスワードを変更しました。' ? 'admin-access__success' : 'admin-access__error'} role="status">{passwordMessage}</p>}
      </details>
    </> : <>
      <p>設定と過去ポイントの変更にはログインが必要です。</p>
      <form onSubmit={submit}>
        <label>メールアドレス<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>パスワード<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? '確認中…' : 'ログイン'}</button>
      </form>
    </>}
    {(message || error) && <p className="admin-access__error" role="alert">{message || error}</p>}
  </section>;
}
