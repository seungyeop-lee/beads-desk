# beads-desk 使い方ガイド

🇺🇸 [English](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md) | 🇰🇷 [한국어](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ko.md) | 🇯🇵 日本語

インストール方法は [README](https://github.com/seungyeop-lee/beads-desk/blob/main/README.ja.md#はじめに) にあります。

## コマンド

`bd-desk` は beads workspace のディレクトリかそのサブディレクトリで実行します。

- `bd-desk start`: サーバーをバックグラウンドで起動し、現在のディレクトリの workspace を開く URL(例: `http://127.0.0.1:3000/w/my-project`)を表示します。ターミナルを閉じてもサーバーは動き続けます。コマンドを付けずに `bd-desk` だけを実行しても `start` として動作します。サーバーがすでに動いている場合は新しく起動せず、現在のディレクトリの workspace を追加してその URL を表示します。
- `bd-desk stop`: サーバーを停止します。動いているサーバーがない場合は終了コード 2 で終わります。
- `bd-desk restart`: 追加した workspace とその URL を保ったまま、同じポートでサーバーを再起動します。現在のディレクトリの workspace が追加されていればその URL を、そうでなければサーバーの URL を表示します。動いているサーバーがない場合は、現在のディレクトリの workspace でサーバーを起動します。
- `bd-desk --help`(または `-h`): 使い方を表示します。

workspace が Dolt サーバーを使うように設定されている場合(server mode)、`bd-desk stop` は beads-desk のサーバーだけを停止し、bd が起動した Dolt サーバーは動き続けます。bd は、Dolt サーバーを起動元の bd コマンドより長く動き続けるように、別のバックグラウンドプロセスとして起動します。Dolt サーバーを止めるには、workspace のディレクトリで `bd dolt stop` を実行します。workspace を削除したり移動したりする前に、このコマンドで Dolt サーバーを止めてください。shared-server mode では、このコンピューターのすべての beads プロジェクトが 1 つの Dolt サーバーを共有するため、`bd dolt stop` を実行すると、ほかのプロジェクトが使っているサーバーも止まります。

main checkout に `.beads` がある git リポジトリなら、そのリポジトリの worktree で実行しても構いません。bd と同じく worktree を workspace として使い、main リポジトリのイシューを表示します。

## オプション

- `--port <番号>`: サーバーのポートを指定します。指定しない場合は 3000 番から空いている最初のポートを使います。動いているサーバーは `start` をもう一度実行してもポートが変わらないため、ポートを変えるには `bd-desk restart --port <番号>` を実行します。
- `--open`: サーバーの準備ができたらブラウザを開きます。
- `--version`(または `-v`): インストールされている bd-desk のバージョンを表示します。

## 複数の workspace を併用する

すべての画面の URL は `/w/<workspace 名>` で始まるので、アドレスバーで今見ている workspace がわかります。workspace 名はディレクトリ名で、空白と URL にそのまま使えない文字は `_` に置き換えられます。追加した workspace 同士でディレクトリ名が同じ場合は、後から追加したほうに `-2`、`-3` のように番号が付きます。

サーバーが動いているときに別の beads workspace で `bd-desk start` を実行すると、その workspace がサーバーに追加され、URL が表示されます。タブごとに自分の URL の workspace を表示するので、複数の workspace を別々のタブやウィンドウに開いて並べて見られます。画面右上の選択ボックスは、現在のタブだけを別の workspace に移します。

`http://127.0.0.1:3000/issues` のように workspace 名のない URL は、追加した workspace が 1 つならその workspace の同じ画面を開きます。workspace が複数あると、どの workspace で開くかを選ぶ画面が表示されます。

## `bd` で変更した内容が画面に反映される仕組み

タブが開いている間、サーバーは workspace のデータベースが変わったかを確認し、変わっていれば開いているタブにデータを読み直させます。そのため、ユーザーやエージェントがターミナルで `bd` を使って変更した内容が、再読み込みしなくても数秒以内に表示されます。embedded mode では Dolt データベースの `.dolt/noms/manifest` ファイルを、server mode では `bd sql` で照会したデータベースのハッシュ(`DOLT_HASHOF_DB()`)を比較します。

## ブラウザ通知

エージェントが何かを残したときに通知を受け取るには、設定を開いて **判断待ちが発生したら通知する** をオンにします。最初にオンにするとき、ブラウザが通知の許可を求めます。ブラウザがこのサイトの通知をブロックしている場合は、アドレスバーの横にあるサイト設定で通知を許可するまでオンにできません。

- beads-desk のタブで開いている workspace に新しい判断待ちが発生すると、通知が表示されます。通知をオンにしたときやタブを開いたときにすでにあった項目は通知しません。
- タブを複数開いていても、新しい項目ごとの通知は 1 回だけです。
- その workspace をフォーカスされたタブで見ている間は、通知は表示されません。
- 通知をクリックすると、その workspace の判断待ち画面が新しいタブで開きます。
- 設定と許可はサーバーのアドレスごとに保存されます。サーバーが別のポートで起動した場合は、通知をもう一度オンにします。

## イシュー本文のローカルファイルリンク

イシュー本文に絶対パスで書いたファイルへのリンクと画像は、アプリ内で開きます。Windows では、`C:\Users\me\report.md` や `C:/Users/me/report.md` のようにドライブ文字で始まるパスも使えます。ファイルは次のディレクトリの中にある場合だけ開きます。

- タブの URL にある workspace のディレクトリ
- その git リポジトリの worktree(`git worktree list` に表示されるディレクトリ)
- OS の一時ディレクトリ(macOS の `$TMPDIR`、Windows の `%TEMP%`)
- `/tmp` と `/var/tmp`(macOS と Linux のみ)
- サーバーを実行しているユーザーのホームディレクトリにある `~/.beads-starter` と、その下のすべてのサブディレクトリ

これ以外のファイルを開くと `許可された範囲外のファイルです。` と表示されます。

一時ディレクトリを許可しているのは、エージェントのセッションがレポートに添付したスクリーンショットなどのファイルをすぐに確認できるようにするためです。OS は数日後や再起動時に `/tmp` と `$TMPDIR` のファイルを削除することがあり、`/var/tmp` のファイルは再起動しても残るので、長く残す記録には `/tmp` や `$TMPDIR` のファイルへのリンクを使わないでください。

ほかのディレクトリのファイルも開くには、そのディレクトリを `BEADS_DESK_LOCAL_FILE_ROOTS` 環境変数に入れてサーバーを起動します。

```sh
BEADS_DESK_LOCAL_FILE_ROOTS="<ディレクトリ>:<別のディレクトリ>" bd-desk start
```

Windows の PowerShell では次のように指定します。

```powershell
$env:BEADS_DESK_LOCAL_FILE_ROOTS = "<ディレクトリ>;<別のディレクトリ>"
bd-desk start
```

- ディレクトリが複数ある場合は、`PATH` と同じく `:` で区切ります。Windows では `;` で区切ります。
- 絶対パスか `~` で始まるパスを使います。先頭の `~` は引用符の中にあってもホームディレクトリに展開され、Windows では `~/` だけでなく `~\` もホームディレクトリに展開されます。相対パスは無視されます。
- 指定したディレクトリの中のファイルだけが開きます。シンボリックリンクは指している実際のパスで判断するため、指定したディレクトリの中にあるシンボリックリンクでも、外のファイルを指していれば開きません。存在しないディレクトリはスキップします。
- この値はサーバーの起動時にだけ読み込まれます。サーバーがすでに動いている場合、`bd-desk start` は workspace を追加するだけで新しい値は無視するので、値を変えるには環境変数を指定したまま `bd-desk restart` を実行します。`restart` のときに環境変数を付け忘れると追加したディレクトリなしで再起動するため、シェルの設定ファイルに書いておくことをおすすめします。

開いたファイルは拡張子に応じて次のように表示されます。

- `.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`、`.avif`: 画像として表示されます。
- `.webm`、`.mp4`: 動画として再生されます。
- そのほかの拡張子(HTML、SVG、スクリプトファイルを含む): アプリと同じ origin で実行されないように、テキストとして表示されます。

ローカルファイルへのリンクと `https://` などの外部アドレスへのリンクは新しいタブで開くので、見ていたイシューの画面はそのまま残ります。`/epics` のようなアプリ画面へのリンクは現在のタブで移動します。

`.diff`、`.patch`、`.md`、`.log`、`.txt` ファイルへのリンクは、ファイル名の前に chevron が付いたチップとして表示されます。チップをクリックするか、チップにフォーカスを置いて Enter か Space を押すと、イシューの画面を離れずに、リンクがある段落やリスト項目のすぐ下にファイルの内容が展開され、もう一度行うと折りたたまれます。ファイル自体を新しいタブで開くには、チップのすぐ右にある ↗ アイコンをクリックするか、チップを Cmd/Ctrl を押しながらクリックするか中ボタンでクリックします。`.diff` と `.patch` は diff ビューで表示します。ファイルごとに、パス、`新規ファイル` や `名前変更` などのバッジ、追加・削除の行数を載せたヘッダーが付き、行ごとに変更前と変更後の行番号が付きます。追加・削除された行は背景に色を付け、変更された行の中では変更された単語を強調表示します。ファイルの diff として読めない `.diff`・`.patch` ファイルは、追加・削除された行の文字色だけを変えたテキストで表示します。`.md` はレンダリングしない Markdown のソースを表示しつつ、見出し、強調、リンク、リストの記号、コードを色分けし、コードブロックはその言語に合わせて色を付けます。`.log` と `.txt` はそのまま表示します。内容が長い場合は、展開されたボックスの中でスクロールします。1 MB を超えるファイルは内容を読み込まず、プレビューを省略した旨の文言と、ファイルを新しいタブで開くリンクを表示します。チップとアイコンは本文を編集していないときだけ表示され、編集中はこれらのリンクも通常のリンクとして表示されます。

## アップデートとアンインストール

アップデートするには、インストールコマンドをもう一度実行してから `bd-desk restart` を実行します。これで動いているサーバーが新しいバージョンに切り替わります。

アンインストールするには、先に `bd-desk stop` でサーバーを停止してから、`npm uninstall -g @seungyeop-lee/beads-desk` か `pnpm remove -g @seungyeop-lee/beads-desk` を実行します。

## ファイルの場所

サーバーの状態ファイル(`server.json`)とログ(`server.log`)は `$XDG_RUNTIME_DIR/beads-desk` に保存されます。`XDG_RUNTIME_DIR` が設定されていない場合は OS の一時ディレクトリの下の `beads-desk` に保存され、Windows ではこのディレクトリは `%TEMP%\beads-desk` です。

## トラブルシューティング

サーバーが起動しない場合は、まず `server.log`([ファイルの場所](#ファイルの場所)を参照)を確認します。CLI のメッセージは英語でのみ表示されます。

- `No beads workspace found: <ディレクトリ>`: `.beads` があるディレクトリかそのサブディレクトリで実行します。新しいプロジェクトなら、先に `bd init` を実行します。
- `Warning: the server could not run bd. Make sure bd is on PATH, or set BD_BIN to its path.`(macOS、Linux): `bd` を `PATH` に追加するか `BD_BIN` を設定してから、同じシェルで `bd-desk restart` を実行します。
- `Warning: the server could not run bd. Make sure bd.exe is on PATH, or set BD_BIN to the full path of bd.exe.`(Windows): `bd.exe` があるディレクトリを `PATH` に追加するか、`BD_BIN` に `bd.exe` のフルパスを設定してから、同じシェルで `bd-desk restart` を実行します。pnpm や volta で bd をインストールした場合は、`BD_BIN` に `bd.cmd` の shim ではなく `bd.exe` を指定します。PowerShell では次のように実行します。

  ```powershell
  $env:BD_BIN = "<bd.exe のフルパス>"
  bd-desk restart
  ```

- `Port <番号> is already in use.`: `--port` で指定したポートを別のプログラムが使っています。別のポートを指定するか、`--port` を外して実行し、空いている最初のポートを使わせます。
- `The running server (pid <pid>) is not responding. Stop it with bd-desk stop, then start again.`: `bd-desk stop` を実行してから、もう一度 `bd-desk start` を実行します。同じ問題が繰り返す場合は `server.log` を確認します。
