# Mリーグ・ドラフト対戦

2チームが4選手ずつ選び、2026-27シーズンのレギュラーポイント合計を比べるWebアプリです。Phase 5まで実装しています。

## 実装済み

- React / Vite の構成と、白基調・Mリーグ公式サイトの成績表示と同じ緑 RGB(18, 103, 36) を使ったスマートフォン向けHOME画面
- 指定された8選手の累積ポイント表示。初期状態では公式Statsから取得した2026年9月23日の値を使用
- チーム4人の合計、ポイント差、前回更新比の自動計算
- 将来メンバーを変更しやすい `memberIds` ベースのデータ構造
- POINTでチーム合計と選手別の累積ポイントを折れ線グラフ表示。選手は複数選択可能
- SETTINGSで1試合・1選手ずつ累積ポイントを入力・修正・削除。日付、第1/第2試合、A/B卓を記録し、連闘も別々に扱う
- PLAYERSで[Mリーグ公式Stats](https://m-league.jp/stats/)から取得した8選手の現在成績と、カードから開く18項目の詳細
- COMPAREで任意の2選手を選び、公式成績の10項目を数値と棒グラフで比較
- RECORDSで最高到達ポイント、最大ポイント差、両チームの最大リード、チーム内最多ポイント選手、直近5件のポイント変動を履歴から計算
- KUSUNOKI（赤）とKISHIMOTO（青）の表示、Mリーグ公式サイトのアイコンと選手写真
- SETTINGSで端末の画像ファイルからチーム写真を選択・削除
- SETTINGSでチーム名・カラー・写真を変更し、HOME、POINT、PLAYERS、COMPARE、RECORDSへ反映
- GitHub Actionsで公式Statsと[日程・結果](https://m-league.jp/games/)を取得し、試合ごとのJSONとポイント履歴を更新してGitHub Pagesへ公開
- Supabaseを設定するとチーム設定・写真・手入力履歴を端末間で共有。閲覧は公開、変更は管理者だけに制限
- 管理者ログイン後、SETTINGSで現在のパスワードを使って管理者パスワードを変更可能

公開先は [GitHub Pages](https://mleaguetaro.github.io/m-league-draft/) です。Supabaseを設定した公開サイトではチーム設定・写真・手入力履歴を共有します。ローカルでSupabaseを設定していない場合は、この端末だけに保存します。

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

公式ポイント履歴は `src/data/officialHistory.json` に保存します。各試合のID、日付、回戦、卓、対象選手の獲得ポイントと試合後の累積ポイントを持ちます。`statsByPlayer` は将来の成績履歴用に残します。手入力履歴は1選手・1試合の累積ポイントを `src/lib/history.js` で処理します。同一回戦のA/B卓は同時開催として合算後にチーム推移へ反映し、同じ選手の第1/第2試合は別記録です。手入力行の回戦と卓は既存Supabaseテーブルの `order_number` に10/11/20/21として保存するため、DB移行は不要です。RECORDSの集計は `src/lib/records.js` にあります。

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

`py` が使えない環境では `python` に置き換えてください。公式Statsの対象8選手と18項目がそろった場合だけStatsのJSONを更新します。続いて公式の[日程・結果](https://m-league.jp/games/)から各試合のID・出場選手・獲得ポイントを取得し、累積値と試合数がStatsに一致した場合だけ公式履歴を更新します。取得や解析、照合に失敗した場合は既存の履歴を保持します。公式結果の公開前やStatsとの更新時差があると、次回の自動実行まで履歴更新を待ちます。

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

ワークフローは毎日 **01:30 JST** と、月・火・木・金の試合日に **20:30 / 22:30 / 翌00:30 JST** に公式データを確認します。公開済みの試合結果を試合IDで取り込み、チーム合計はアプリ内で自動計算します。取得に失敗した場合はデプロイを中止し、公開済みのデータを残します。GitHub Pagesは静的サイトなので、手入力履歴とチーム設定の共有には上記のSupabaseが必要です。`vite.config.js` の `base: './'` はリポジトリ名を含む公開URLに対応しています。
