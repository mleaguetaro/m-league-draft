import { useState } from 'react';

export default function AdminAccess({ authorized, checking, onLogin, onLogout, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await onLogin(email.trim(), password);
      setPassword('');
    } catch (cause) {
      setMessage(cause?.message || 'ログインできませんでした。');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setMessage('');
    try { await onLogout(); }
    catch (cause) { setMessage(cause?.message || 'ログアウトできませんでした。'); }
    finally { setBusy(false); }
  }

  return <section className="admin-access" aria-labelledby="admin-access-title">
    <h2 id="admin-access-title">管理者ログイン</h2>
    {checking ? <p>ログイン状態を確認中…</p> : authorized ? <div className="admin-access__authorized"><span>変更できます。</span><button type="button" disabled={busy} onClick={logout}>ログアウト</button></div> : <>
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
