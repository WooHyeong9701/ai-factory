export default {
  // Nav
  docs_nav_overview: '概要',
  docs_nav_quickstart: 'クイックスタート',
  docs_nav_nodes: 'AIエージェントノード',
  docs_nav_custom: 'カスタムノード',
  docs_nav_utility: 'ユーティリティノード',
  docs_nav_connectors: 'コネクタ',
  docs_nav_workflow: 'ワークフロー実行',
  docs_nav_shortcuts: 'キーボードショートカット',
  docs_nav_settings: '設定',
  docsClose: 'ドキュメントを閉じる',

  // Hero
  docs_heroSub: 'AIワークフローをビジュアルに構築。\nノードをドラッグして接続するだけで、AIが処理します。',

  // Overview
  docs_overview_1: 'AI Factoryはノードベースのビジュアルツールで、AIワークフローを構築できます。キャンバスにノードをドラッグし、エッジで接続して、Ollamaを通じたローカルLLMでパイプライン全体を実行します。コーディング不要です。',
  docs_overview_card1_title: 'ビジュアルワークフロー',
  docs_overview_card1_desc: 'キャンバス上でノードを接続して複雑なAIパイプラインを構築。各ノードがワークフローの1ステップです。',
  docs_overview_card2_title: 'ローカルAI',
  docs_overview_card2_desc: 'Ollamaでお使いのマシン上で実行。データは外部に送信されません。安全で高速です。',
  docs_overview_card3_title: '拡張可能',
  docs_overview_card3_desc: '外部API接続、Webhook送信、条件分岐、ループタスクなど多彩な機能を提供。',

  // Quick Start
  docs_qs_step1_title: 'Ollamaをインストール',
  docs_qs_step1_desc: 'ollama.comからダウンロードして実行：OLLAMA_ORIGINS="*" ollama serve',
  docs_qs_step2_title: 'ノードを追加',
  docs_qs_step2_desc: '左のパレットから「ノード」をキャンバスにドラッグ。名前、役割、モデルを設定します。',
  docs_qs_step3_title: 'ノードを接続',
  docs_qs_step3_desc: 'ノードの右ハンドルから別のノードの左ハンドルにドラッグしてデータフローを作成します。',
  docs_qs_step4_title: '実行',
  docs_qs_step4_desc: '下部パネルで実行をクリックし、入力を入力すると、ワークフローがノードごとに実行されます。',

  // AI Agent Node
  docs_nodes_intro: 'AIエージェントノードはコアビルディングブロックです。各ノードがローカルLLMと対話を行い、出力を接続された次のノードに渡します。',
  docs_nodes_name: '名前',
  docs_nodes_name_desc: 'このノードのラベル。キャンバスカードに表示されます。',
  docs_nodes_role: '役割（システムプロンプト）',
  docs_nodes_role_desc: 'AIエージェントの動作を定義する指示。例：「入力を3つの箇条書きで要約してください。」',
  docs_nodes_model: 'モデル',
  docs_nodes_model_desc: '使用するOllamaモデル。RAM使用量が色で表示されます。',
  docs_nodes_return: '返却形式',
  docs_nodes_return_desc: 'Text、JSON、箇条書き、韓国語、タスクリスト。フォーマット指示が自動追加されます。',
  docs_nodes_params: 'LLMパラメータ',
  docs_nodes_params_desc: '詳細設定：Temperature、Top P/K、Max Tokens、Repeat Penalty、Seed。',

  // Custom Nodes
  docs_custom_intro: 'AIエージェントノードを任意の役割と設定で構成したら、カスタムノードとして保存できます。パレットのカスタムノードセクションに表示され、いつでもドラッグして再利用できます。',
  docs_custom_tip: 'ノード設定パネル下部の「ノード保存」をクリックしてください。役割、モデル、LLMパラメータなどすべての設定が保持されます。',

  // Utility Nodes
  docs_utility_intro: 'ユーティリティノードはAIテキスト生成以外のロジックと機能を追加します。フロー制御、メディア処理、ファイル操作を担当します。',
  docs_utility_col_node: 'ノード',
  docs_utility_col_desc: '説明',
  docs_util_tasklist: 'AI出力をチェックリストとして表示。「タスクリスト」返却形式のエージェントと接続します。',
  docs_util_tts: 'テキストを音声ファイルに変換。macOS TTS、ElevenLabs、OpenAIに対応。',
  docs_util_imagegen: 'テキストプロンプトから画像を生成。Stable Diffusion、ComfyUI、DALL-E 3に対応。',
  docs_util_filesave: 'テキスト出力をファイルに保存（SRT字幕、スクリプトなど）。',
  docs_util_video: '画像+音声を組み合わせて字幕とBGM付きの動画を生成。',
  docs_util_youtube: 'メタデータ付きでYouTubeに動画を直接アップロード。',
  docs_util_branch: '条件に基づいてワークフローを分岐：含む、正規表現、長さなど。',
  docs_util_loop: '接続されたノードをN回繰り返し実行。チェーンモードは各出力を次の入力にします。',

  // Connectors
  docs_connectors_intro: 'コネクタノードはワークフローと外部世界を橋渡しします。任意のAPIからデータを取得したり、結果を外部サービスに送信できます。',
  docs_conn_api_title: 'APIリクエスト',
  docs_conn_api_desc: 'URLからデータを取得してワークフローに注入。メソッド、ヘッダー、ボディを設定可能。',
  docs_conn_api_example: '例：GET github.com/api → [*].title → AIがIssueを要約',
  docs_conn_webhook_title: 'Webhook送信',
  docs_conn_webhook_desc: 'ワークフローの結果をSlack、Discord、Zapierなどの外部サービスに送信。',
  docs_conn_webhook_example: '例：AI出力 → {"text":"{{input}}"} → POST to Slack',
  docs_connectors_jsonpath: 'JSON Pathフィールドを使ってAPIレスポンスから特定のデータを抽出できます。例：[*].titleで配列内の全タイトルを抽出。data.items[*].nameでネストされたオブジェクトから名前を抽出。',

  // Running Workflows
  docs_workflow_intro: 'ワークフローはトポロジカル順序で実行されます — ルートノードからリーフノードへ。各ノードは接続された上流ノードからの入力を受け取ります。',
  docs_wf_run: '実行',
  docs_wf_run_desc: '下部パネルを開き、初期入力を入力（または空のまま）して実行をクリック。',
  docs_wf_stop: '停止',
  docs_wf_stop_desc: '停止をクリックすると実行中のワークフローを即座に中断します。',
  docs_wf_time: 'タイミング',
  docs_wf_time_desc: 'ノードごとの実行時間と全体の所要時間が計測されます。出力タブで確認できます。',
  docs_wf_notif: '通知',
  docs_wf_notif_desc: 'ワークフローが完了または失敗するとベル通知が表示されます。',

  // Keyboard Shortcuts
  docs_kbd_copy: '選択したノードをコピー',
  docs_kbd_paste: 'コピーしたノードを貼り付け',
  docs_kbd_search: 'ノード名で検索',
  docs_kbd_multisel: 'ノードの複数選択を切替',
  docs_kbd_rectsel: '矩形ドラッグ選択',
  docs_kbd_delete: '選択したノードを削除',
  docs_kbd_esc: '検索 / パネルを閉じる',

  // Settings
  docs_settings_intro: 'ほとんどの設定はヘッダーバーからアクセスできます。',
  docs_set_ollama: 'Ollama接続',
  docs_set_ollama_desc: 'ステータスインジケーターをクリックしてOllama URLを設定。デフォルト：http://localhost:11434',
  docs_set_lang: '言語',
  docs_set_lang_desc: 'English、한국어、中文、日本語を切り替えます。',
  docs_set_minimap: 'ミニマップ',
  docs_set_minimap_desc: '右下のミニマップを切り替えて全体ビューを確認。',
  docs_set_save: 'クラウド保存',
  docs_set_save_desc: 'ログインしてデバイス間でワークフローを保存・読み込み。',

  // Footer
  // Marketplace
  docs_nav_marketplace: 'ワークフローマーケット',
  docs_marketplace_intro: 'ワークフローマーケットで他のユーザーが共有したワークフローを閲覧し、自分のワークフローを共有できます。ヘッダーの 🏪 ボタンからアクセスしてください。',
  docs_mp_share_title: '共有する',
  docs_mp_share_desc: 'ワークフローをマーケットに公開します。名前、説明、カテゴリ、タグを設定できます。ログインが必要です。',
  docs_mp_import_title: 'インポート',
  docs_mp_import_desc: '気に入ったワークフローをクリックして「インポート」を押すと、キャンバスに直接読み込まれます。',
  docs_mp_like_title: 'いいね',
  docs_mp_like_desc: '気に入ったワークフローにいいねを押してください。人気順ランキングに反映されます。',
  docs_mp_tip: 'インポートしたワークフローはキャンバスにコピーされます。元のワークフローには影響がないので、自由に編集してください。',

  docs_footer: '何でも作り、すべてをつなげよう。',
}
