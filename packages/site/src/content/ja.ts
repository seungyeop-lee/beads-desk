import type { SiteContent } from "./types";

export const jaContent: SiteContent = {
  locale: "ja",
  localeLabel: "日本語",
  skipToContent: "メインコンテンツへスキップ",
  nav: {
    primaryLabel: "メインナビゲーション",
    languageLabel: "言語切り替え",
    features: "機能",
    requirements: "動作環境",
    install: "はじめに",
    github: "GitHub",
    npm: "npm",
  },
  hero: {
    eyebrow: "Beads (bd) 向けローカル Web UI",
    headline: "エージェントが Beads に残した記録をブラウザでレビュー。",
    subtitle:
      "エージェントが立てた計画、記録した決定、Mermaid 図やスクリーンショット、diff、人への質問をブラウザで確認・編集できます。ターミナルでの bd 作業ともそのまま連携します。",
    primaryCta: "はじめに",
    secondaryCta: "GitHub で見る",
    quickStartTitle: "Beads workspace ですぐに開始",
    installLabel: "npm でグローバルインストール",
    startLabel: "ローカルサーバーを起動してブラウザを開く",
    videoCaption:
      "いま画面の締め切り一覧とボトルネックを確認し、今日締め切りのイシューの blocks グラフ、Mermaid シーケンス図の拡大、添付スクリーンショット、置き換えられた決定までたどるデモ動画です。",
    videoLabel: "beads-desk デモ動画（音声なし）",
    videoPauseLabel: "一時停止",
    videoPlayLabel: "再生",
    videoPauseAriaLabel: "一時停止：デモ動画を止める",
    videoPlayAriaLabel: "再生：デモ動画を再生する",
  },
  copy: {
    buttonPrefix: "コマンドをコピー:",
    copied: "コピーしました",
    failed: "コピーに失敗",
  },
  featuresSection: {
    eyebrow: "主な機能",
    title: "bd CLI の流れを崩さずエージェントの作業をレビュー",
    subtitle:
      "すべての読み取りと更新は bd CLI を通じて行われ、ターミナルで bd を使って変更した内容も数秒以内に開いているタブへ反映されます。",
    enlargeLabel: "スクリーンショットを拡大",
    closeDialogLabel: "プレビューを閉じる",
    items: [
      {
        id: "issues",
        badge: "Issues",
        tone: "azure",
        title: "すべてのイシューを作業状態ごとに表示",
        summary:
          "進行中、着手可能、ブロック中、保留、クローズのタブでイシューを整理し、ボトルネック表示へもすぐ切り替えられます。",
        bullets: [
          "種類、ラベル、作成日・クローズ日、epic 未所属のみで絞り込み、所属するエピックへ直接移動できます。",
          "ID、タイトル、本文、コメントまで検索し、一致した箇所をその場で確認できます。",
          "ステータスと優先度を一覧から直接変更できます。",
        ],
        screenshots: [
          {
            src: "/media/screenshots/issues.png",
            alt: "作業状態タブ、フィルター、種類タグ、ステータス・優先度チップ、エピックリンクを表示するイシュー画面",
            width: 2880,
            height: 1800,
            caption: "作業状態タブと各種フィルター、直接編集を備えたイシュー画面",
          },
        ],
      },
      {
        id: "now-bottlenecks",
        badge: "Now & Bottlenecks",
        tone: "sand",
        title: "期限の近い作業と先に解除すべきボトルネックを把握",
        summary:
          "いま画面で締め切りが近いイシューを追い、ボトルネック表示でほかの作業を止めているイシューを影響順に見つけます。",
        bullets: [
          "Now は締め切りのあるオープンのイシューを期限切れ、今日締め切り、3日以内に整理します。",
          "Bottlenecks は待っているイシューが多い順に並べ、関連する締め切りとクローズ時に着手可能になる件数を示します。",
          "進行中・着手可能・ブロック中の件数、直近7日間の推移チャート、エピック進捗バーも同じ画面で確認できます。",
        ],
        screenshots: [
          {
            src: "/media/screenshots/now.png",
            alt: "期限切れ・今日締め切り・3日以内のイシュー、待ち件数順のボトルネック、エピック進捗バーを表示するいま画面",
            width: 2880,
            height: 1440,
            caption:
              "締め切りグループ、ボトルネック順位、7日間チャート、エピック進捗をまとめた画面",
          },
        ],
      },
      {
        id: "graph",
        badge: "Graph",
        tone: "lavender",
        title: "計画を段階ごとのグラフでレビュー",
        summary:
          "blocks 依存関係によってエピックがどのように段階分割され、どこで human gate や外部要因が止めているかを確認します。",
        bullets: [
          "エピックの順序表示では、進行中の段階とそれをブロックしているイシューを確認できます。エピック外のブロッカーも表示されます。",
          "先行条件がなく作業を1件だけブロックする gate は、そのカード内に表示されます。行を選ぶと gate の詳細が開きます。",
          "どのイシューからでも先行・後続グラフで前後の作業をたどれます。関連する決定は基準カード内で確認できます。",
        ],
        screenshots: [
          {
            src: "/media/screenshots/graph.png",
            alt: "5段階のエピックグラフで最後の作業カードが紫色の枠で強調され、その中に未解決の human gate が表示された画面",
            width: 2880,
            height: 1440,
            caption: "最後の作業は、カード内に表示されたリリース可否の判断を待っています。",
          },
        ],
      },
      {
        id: "attachments-diff",
        badge: "Attachments & Diff",
        tone: "mint",
        title: "図・ログ・JSON・diff をアプリ内で直接読む",
        summary:
          "エージェントが添付した Markdown ノート、Mermaid 図、スクリーンショット、録画、パッチファイルをツールを切り替えずに閲覧できます。",
        bullets: [
          "Markdown と Mermaid 図を描画しクリックで拡大。ローカル画像や .mp4・.webm 録画もイシュー内で再生できます。",
          ".md、.txt、.log、.json、.jsonl は専用テキスト画面で開くか段落下にそのまま展開し、JSON は Pretty と原文を切り替えられます。",
          ".diff と .patch ファイルは変更ファイルツリー、長い行の折り返し、単語単位の変更ハイライト付きで確認できます。",
        ],
        screenshots: [
          {
            src: "/media/screenshots/attachments.png",
            alt: "Mermaid シーケンス図、添付されたチェックアウト画面のスクリーンショット、段落下に展開されたノートと diff を示すイシュー詳細画面",
            width: 2880,
            height: 3600,
            caption: "Mermaid 図、ローカル画像、段落下に展開したノートと diff",
          },
          {
            src: "/media/screenshots/diff.png",
            alt: "左側に変更ファイルツリー、右側に折り返し表示のパッチ内容を表示する diff 画面",
            width: 2880,
            height: 1800,
            caption: "変更ファイルツリーと行折り返しを備えた専用 diff ビューア",
          },
        ],
      },
      {
        id: "decisions",
        badge: "Decisions",
        tone: "lilac",
        title: "設計上の決定と置き換え履歴を残す",
        summary:
          "decision タイプのイシューを専用画面に集め、有効な決定とクローズ済みの決定を整理します。",
        bullets: [
          "有効な決定とクローズされた決定を明確に分けて一覧表示します。",
          "supersedes と superseded-by のリンクから、過去の決定が置き換わった経緯をたどれます。",
        ],
        screenshots: [
          {
            src: "/media/screenshots/decisions.png",
            alt: "有効な決定とクローズされた決定を分け supersedes と superseded-by リンクを表示する決定画面",
            width: 2880,
            height: 1800,
            caption: "置き換えリンクで決定の変遷を追える決定画面",
          },
        ],
      },
      {
        id: "needs-human",
        badge: "Needs human",
        tone: "coral",
        title: "エージェントからの質問に回答する",
        summary:
          "human ラベル付きの質問と確認依頼 (human gate) を、それぞれがブロックしている作業と一緒に一覧します。",
        bullets: [
          "人の判断待ちとなっている質問や human gate を、後ろで待っている作業とともに確認できます。",
          "この画面から直接応答またはクローズして、ブロックされていた作業をすぐに解除できます。",
          "ブラウザ通知を有効にすれば、別のウィンドウで作業中でも新しい依頼に気づけます。",
        ],
        screenshots: [
          {
            src: "/media/screenshots/needs-human.png",
            alt: "選択した human gate の応答入力欄とブロックされているタスクを表示する判断待ち画面",
            width: 2880,
            height: 1800,
            caption: "ブロック中の作業を確認しながらその場で応答できる判断待ち画面",
          },
        ],
      },
      {
        id: "activity",
        badge: "Activity",
        tone: "sky",
        title: "離席中の変更履歴をまとめて確認",
        summary:
          "workspace 全体の作成・クローズ・コメントに加え、events journal 有効時の編集・削除履歴を新しい順に追えます。",
        bullets: [
          "workspace で作成、クローズ、コメントされたイシューを新しい順に表示します。",
          "bd config set events-journal true を有効にすると、説明・ステータス・タイトル・ラベルの編集や削除履歴も記録されます。",
          "ここから前回見た記録の区切り線で、前回確認した位置をすぐに見分けられます。",
        ],
        screenshots: [
          {
            src: "/media/screenshots/activity.png",
            alt: "作成・クローズ・コメント履歴と前回見た記録の区切り線を表示するアクティビティ画面",
            width: 2880,
            height: 1800,
            caption: "前回閲覧位置の区切り線で差分を素早く追えるアクティビティ画面",
          },
        ],
      },
      {
        id: "hygiene",
        badge: "Hygiene",
        tone: "sage",
        title: "トラッカーを健全な状態に保つ",
        summary:
          "長期間放置されたイシュー、コミット言及済みの未クローズイシュー、推奨セクション不足、重複候補、クローズ可能なエピックを検出します。",
        bullets: [
          "放置イシュー、コミットに記載されたままのオープンイシュー、bd 推奨セクションが抜けたイシューを自動抽出します。",
          "重複候補を見比べて、同じ画面から重複としてクローズできます。",
          "配下がすべてクローズされ完了できる状態のエピックも一覧できます。",
        ],
        screenshots: [
          {
            src: "/media/screenshots/hygiene.png",
            alt: "放置イシュー、重複候補、不足セクション、クローズ可能なエピック、孤立イシューをまとめた整理画面",
            width: 2880,
            height: 1800,
            caption: "重複整理やエピック完了漏れを防ぐ整理画面",
          },
        ],
      },
    ],
    alsoTitle: "そのほかの機能",
    alsoItems: [
      {
        name: "Epics & Board",
        description:
          "オープン・クローズ済みエピックの進捗を検索したり、ボード上でカードをドラッグして状態を変更できます。",
      },
      {
        name: "サイドパネル",
        description:
          "現在開いているイシューの横に関連イシューを並べて表示し、見比べながら確認できます。",
      },
      {
        name: "タブごとの workspace 切り替え",
        description:
          "1つのローカルサーバーで、ブラウザのタブごとに異なる bd workspace を同時に開けます。",
      },
      {
        name: "3言語とライト・ダークテーマ",
        description:
          "設定画面から日本語・英語・韓国語の UI とライト・ダークテーマを切り替えられます。",
      },
    ],
  },
  requirementsSection: {
    eyebrow: "動作環境",
    title: "ローカルの bd 環境があればすぐに使えます",
    items: [
      {
        label: "対応 OS",
        detail:
          "macOS、Linux、Windows に対応しています。bd 1.3.4 を用いて macOS と GitHub Actions の windows-latest でテスト済みです。",
      },
      {
        label: "Node.js",
        detail: "Node.js 22 以降が必要です。",
      },
      {
        label: "bd CLI",
        detail:
          "PATH 上に bd が必要です。別の場所にある場合は BD_BIN 環境変数で指定します（Windows の npm インストール版は自動検出）。",
      },
      {
        label: "Beads workspace",
        detail: "bd init を実行したディレクトリが必要です。",
      },
    ],
  },
  installSection: {
    eyebrow: "はじめに",
    title: "一度インストールすればどの workspace でも起動できます",
    subtitle:
      "サーバーは 127.0.0.1 のみで待ち受けるためこのコンピューターからしか開けず、バックグラウンドで動作します。",
    steps: [
      {
        step: "01",
        title: "グローバルパッケージをインストール",
        description: "npm または pnpm でインストールします。",
        commands: [
          { id: "install-npm", label: "npm", code: "npm install -g @seungyeop-lee/beads-desk" },
          { id: "install-pnpm", label: "pnpm", code: "pnpm add -g @seungyeop-lee/beads-desk" },
        ],
        note: "pnpm で初めてグローバルパッケージをインストールする場合は、先に pnpm setup を一度実行して新しいシェルを開いてください。",
      },
      {
        step: "02",
        title: "workspace でサーバーを起動",
        description:
          "Beads workspace のルートまたはサブディレクトリで実行すると、その workspace を登録してブラウザを開きます。",
        commands: [{ id: "start-cmd", label: "CLI", code: "bd-desk start --open" }],
      },
    ],
    lifecycleTitle: "サーバーの操作",
    lifecycleItems: [
      {
        label: "停止",
        command: "bd-desk stop",
        detail: "バックグラウンドで起動しているサーバーを停止します。",
      },
      {
        label: "アップデート",
        command: "bd-desk restart",
        detail: "インストールコマンドを再実行してからサーバーを再起動します。",
      },
      {
        label: "詳しいガイド",
        detail:
          "オプション、複数 workspace、ブラウザ通知、ローカルファイルリンク、トラブルシューティングは USAGE.ja.md をご覧ください。",
      },
    ],
  },
  footer: {
    tagline:
      "Beads (bd) イシュートラッカーのためのローカルファースト Web UI です。すべての読み書きは bd CLI 経由で実行されます。",
    contributingTitle: "コントリビューション",
    contributingText:
      "バグ報告と機能提案は GitHub の issue で受け付けており、pull request は受け付けていません。",
    contributingLinkText: "CONTRIBUTING.md を読む",
    linksTitle: "リソース",
    usageGuideLabel: "使い方ガイド (USAGE.ja.md)",
    usageGuideHref: "https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ja.md",
    changelogLabel: "変更履歴",
    issuesLabel: "GitHub Issues",
    licenseLabel: "MIT ライセンス",
    acknowledgementsPrefix: "",
    acknowledgementsLinkText: "mantoni/beads-ui",
    acknowledgementsSuffix: "に着想を得ています。",
  },
};
