# Mリーグ・ドラフト対戦

2チームが4選手ずつ選び、2026-27シーズンのレギュラーポイント合計を比べるWebアプリです。Phase 5まで実装しています。

## 実装済み

- React / Vite の構成と、白基調・Mリーグ公式サイトの成績表示と同じ緑 RGB(18, 103, 36) を使ったスマートフォン向けHOME画面
- 指定された8選手の累積ポイント表示。初期状態では公式Statsから取得した2026年9月23日の値を使用
- チーム4人の合計、ポイント差、前回更新比の自動計算
- 将来メンバーを変更しやすい `memberIds` ベースのデータ構造
- POINTでチーム合計と選手別の累積ポイントを折れ線グラフ表示。選手は複数選択可能
- SETTINGSで8選手の累積ポイント履歴を日付ごとに入力・修正・削除
- PLAYERSで[Mリーグ公式Stats](https://m-league.jp/stats/)から取得した8選手の現在成績と、カードから開く18項目の詳細
- COMPAREで任意の2選手を選び、公式成績の10項目を数値と棒グラフで比較
- RECORDSで最高到達ポイント、最大ポイント差、両チームの最大リード、チーム内最多ポイント選手、直近5件のポイント変動を履歴から計算
- KUSUNOKI（赤）とKISHIMOTO（青）の表示、Mリーグ公式サイトのアイコンと選手写真
- SETTINGSで端末の画像ファイルからチーム写真を選択・削除
- SETTINGSでチーム名・カラー・写真を変更し、HOME、POINT、PLAYERS、COMPARE、RECORDSへ反映
- GitHub Actionsで公式Stats取得、8選手の検証、JSONとポイント履歴の更新、GitHub Pagesへの公開を自動実行
- Supabaseを設定するとチーム設定・写真・手入力履歴を端末間で共有。閲覧は公開、変更は管理者だけに制限

**公開URLとSupabaseの設定は、GitHubリポジトリとSupabaseプロジェクトを作成した後に有効になります。** 未設定の間、公式ポイント履歴は共通のJSONを使いますが、チーム設定・写真・手入力履歴はこの端末だけの保存です。画面上部に共有未設定と表示します。

## ローカル起動

Windowsでは、[Node.js公式ダウンロードページ](https://nodejs.org/en/download)から **LTS版のWindows Installer（.msi）** をダウンロードして実行します。通常のインストールでnpmも入ります。インストール後はPowerShellを開き直し、次を実行して確認してください。

```powershell
node --version
npm.cmd --version
```

Node.jsは24 LTSを推奨します。両方のバージョンが表示されたら、PowerShellでこのプロジェクトのフォルダへ移動して起動します。PowerShellが `npm.ps1` の実行をブロックする場合も、以下の `npm.cmd` は実行ポリシーを変更せずに使えます。

```powershell
npm.cmd install
npm.cmd run dev
```

表示されたローカルURLをブラウザで開いてください。開発サーバーは同じLAN内の端末からもアクセスできますが、外部公開の設定は別途必要です。

## 確認・ビルド

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

静的ファイルは `dist/` に出力されます。JavaScriptのテストは `src/lib/`、Pythonのテストは `scripts/` にあります。

## データ構造

初期データは `src/data/demoSeason.js` にあります。

- `players`: 選手ID、表示名、[Mリーグ公式サイト](https://m-league.jp/)の選手写真URL。写真が読み込めない場合は頭文字を表示します。
- `teams`: チームID、名前、色、チーム写真URL、所属選手IDの配列
- `snapshots`: 日時と選手ごとのシーズン累積ポイント

合計は `src/lib/score.js` が各チームの `memberIds` を使って計算します。データが欠けたときは誤った合計を出さず、画面に `—` を表示します。公式成績は `src/data/officialStats.json` に保存し、選手IDを初期データと共通にして取得日時と出典を記録します。

公式ポイント履歴は `src/data/officialHistory.json` に保存します。8人全員の累積ポイントに加え、将来使えるよう全Statsを `statsByPlayer` に保存します。手入力履歴は `src/lib/history.js` で処理します。HOME、POINT、RECORDSは公式履歴と手入力履歴を日付順に統合し、同じ日・同じ8人のポイントは重複表示しません。RECORDSの集計は `src/lib/records.js` にあります。

チーム名・カラーは `src/lib/teamSettings.js` で検証します。初期値はKUSUNOKI（赤）とKISHIMOTO（青）です。Supabase未設定時だけ端末のIndexedDBに保存します。Supabase設定後は `src/lib/sharedData.js` が共有データを読み書きします。

公式アイコンと選手写真はMリーグ公式サイトのURLから読み込みます。公式サイト側の画像URLが変わると、アプリ側で差し替えが必要です。

SETTINGSで選んだチーム写真は正方形に縮小します。Supabase設定後は公開のStorageバケットに保存し、全端末で表示します。未設定時はこの端末のIndexedDBに保存します。

## 公式データ取得方法

Python 3.10以上を用意し、プロジェクトのフォルダで実行します。

```powershell
py -m pip install -r requirements.txt
py scripts\fetch_official_stats.py
py scripts\update_official_history.py
npm.cmd run build
```

`py` が使えない環境では `python` に置き換えてください。公式ページの対象8選手と18項目がそろった場合だけStatsのJSONを更新します。続いて、8人のポイントが前回から変わった場合だけ公式履歴に追加します。同じ日・同じ8人のポイントは重複保存しません。取得や解析に失敗した場合は既存JSONを保持します。

取得処理の確認は `py -m unittest discover -s scripts -p 'test_*.py'` で実行できます。

## 共有データの設定（Supabase）

SupabaseのFreeプランを使用できます。無料枠には制限があり、1週間アクセスがないプロジェクトは停止する場合があります。最新条件は[Supabaseの料金ページ](https://supabase.com/pricing/)で確認してください。

先に下の「GitHub Pagesへの公開」でURLを作り、そのURLを控えてから次を進めてください。

1. Supabaseでプロジェクトを作成します。
2. `supabase/schema.sql` の `change-to-your-email@example.com` を管理者のメールアドレスに変更し、SQL Editorで実行します。このメールアドレスだけが設定・履歴・写真を変更できます。
3. Supabaseの Authentication → Users → Add user → Send invitation で管理者を招待し、パスワードを設定します。招待前に Authentication の Site URL を公開URLへ設定してください。
4. ローカルでは `.env.example` を `.env.local` にコピーし、SupabaseのProject URLとPublishable keyを入力します。`npm.cmd run dev` を再起動します。**Secret key / service_role keyはWebアプリに入れないでください。**
5. 公開時はGitHubリポジトリの Settings → Secrets and variables → Actions → Variables に `SUPABASE_URL` と `SUPABASE_PUBLISHABLE_KEY` を登録し、Actionsの **Run workflow** を実行して再公開します。

Supabaseを設定すると、一般閲覧者は同じチーム設定・写真・手入力履歴を閲覧でき、SETTINGSの変更操作は管理者ログイン後だけ表示されます。データベースのRLSも一般閲覧者の書き込みを拒否します。以前この端末に保存した手入力履歴は自動移行されません。必要な履歴は管理者ログイン後に共有画面へ入力してください。

## GitHub Pagesへの公開

1. このフォルダのソースを、公開GitHubリポジトリの `main` ブランチに入れます。`node_modules/`、`dist/`、`.env.local` は入れません。
2. リポジトリの Settings → Pages → Build and deployment → Source で **GitHub Actions** を選びます。
3. Settings → Actions → General → Workflow permissions で **Read and write permissions** を選びます。自動更新したJSONをコミットするために必要です。
4. `main` へのpushで `.github/workflows/update-and-deploy.yml` がビルドして公開します。Actionsの **Run workflow** でも手動で再公開できます。手動で公式Statsも取得する場合は `refresh_stats` を選びます。

ワークフローは毎日 **01:30 JST** に公式Statsを取得し、8選手のJSONと公式ポイント履歴を更新して公開します。チーム合計はアプリ内で自動計算します。取得に失敗した場合はデプロイを中止し、公開済みのデータを残します。GitHub Pagesは静的サイトなので、手入力履歴とチーム設定の共有には上記のSupabaseが必要です。`vite.config.js` の `base: './'` はリポジトリ名を含む公開URLに対応しています。
