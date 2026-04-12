export default {
  // Nav
  docs_nav_overview: 'Overview',
  docs_nav_quickstart: 'Quick Start',
  docs_nav_nodes: 'AI Agent Node',
  docs_nav_custom: 'Custom Nodes',
  docs_nav_utility: 'Utility Nodes',
  docs_nav_connectors: 'Connectors',
  docs_nav_workflow: 'Running Workflows',
  docs_nav_shortcuts: 'Keyboard Shortcuts',
  docs_nav_settings: 'Settings',
  docsClose: 'Close Docs',

  // Hero
  docs_heroSub: 'Build AI workflows visually.\nDrag nodes, connect them, and let AI do the work.',

  // Overview
  docs_overview_1: 'AI Factory is a node-based visual tool for building AI workflows. Drag nodes onto the canvas, connect them with edges, and run entire pipelines powered by local LLMs through Ollama. No coding required.',
  docs_overview_card1_title: 'Visual Workflow',
  docs_overview_card1_desc: 'Build complex AI pipelines by connecting nodes on a canvas. Each node is a step in your workflow.',
  docs_overview_card2_title: 'Local AI',
  docs_overview_card2_desc: 'Runs on your machine via Ollama. Your data never leaves your computer. Private and fast.',
  docs_overview_card3_title: 'Extensible',
  docs_overview_card3_desc: 'Connect to external APIs, send results via webhooks, branch logic, loop tasks, and more.',

  // Quick Start
  docs_qs_step1_title: 'Install Ollama',
  docs_qs_step1_desc: 'Download from ollama.com and run: OLLAMA_ORIGINS="*" ollama serve',
  docs_qs_step2_title: 'Add a node',
  docs_qs_step2_desc: 'Drag "Node" from the left palette onto the canvas. Configure its name, role, and model.',
  docs_qs_step3_title: 'Connect nodes',
  docs_qs_step3_desc: 'Drag from a node\'s right handle to another node\'s left handle to create a data flow.',
  docs_qs_step4_title: 'Run',
  docs_qs_step4_desc: 'Click Run at the bottom panel, type your input, and watch the workflow execute node by node.',

  // AI Agent Node
  docs_nodes_intro: 'The AI Agent node is the core building block. Each node runs a conversation with a local LLM and passes its output to connected nodes.',
  docs_nodes_name: 'Name',
  docs_nodes_name_desc: 'A label for this node. Appears on the canvas card.',
  docs_nodes_role: 'Role (System Prompt)',
  docs_nodes_role_desc: 'Instructions that define how this AI agent behaves. Example: "Summarize the input in 3 bullet points."',
  docs_nodes_model: 'Model',
  docs_nodes_model_desc: 'The Ollama model to use. RAM usage shown with color indicators.',
  docs_nodes_return: 'Return Format',
  docs_nodes_return_desc: 'Text, JSON, Bullet list, Korean, or Task list. Adds formatting instructions automatically.',
  docs_nodes_params: 'LLM Parameters',
  docs_nodes_params_desc: 'Advanced: Temperature, Top P/K, Max Tokens, Repeat Penalty, Seed.',

  // Custom Nodes
  docs_custom_intro: 'Once you\'ve configured an AI agent node with a specific role and settings, save it as a custom node. It appears in the Custom Nodes section of the palette, ready to drag and reuse anytime.',
  docs_custom_tip: 'Click "Save Node" at the bottom of the node settings panel. All settings including role, model, and LLM parameters are preserved.',

  // Utility Nodes
  docs_utility_intro: 'Utility nodes add logic and capabilities beyond AI text generation. They control flow, process media, and handle file operations.',
  docs_utility_col_node: 'Node',
  docs_utility_col_desc: 'Description',
  docs_util_tasklist: 'Displays AI output as a checklist. Connect to an agent with "Task list" return format.',
  docs_util_tts: 'Convert text to speech audio file. Supports macOS TTS, ElevenLabs, OpenAI.',
  docs_util_imagegen: 'Generate images from text prompts. Supports Stable Diffusion, ComfyUI, DALL-E 3.',
  docs_util_filesave: 'Save text output to a file (SRT subtitles, scripts, etc.).',
  docs_util_video: 'Combine images + audio into a video file with optional subtitles and BGM.',
  docs_util_youtube: 'Upload a video directly to YouTube with metadata.',
  docs_util_branch: 'Route the workflow based on conditions: contains, regex, length, etc.',
  docs_util_loop: 'Repeat a connected node N times. Chain mode feeds each output as next input.',

  // Connectors
  docs_connectors_intro: 'Connector nodes bridge your workflows with the outside world. Pull data in from any API, or push results out to external services.',
  docs_conn_api_title: 'API Request',
  docs_conn_api_desc: 'Fetches data from any URL and feeds it into the workflow. Configure method, headers, and body.',
  docs_conn_api_example: 'Example: GET github.com/api → [*].title → AI summarizes issues',
  docs_conn_webhook_title: 'Webhook Send',
  docs_conn_webhook_desc: 'Sends workflow results to external services like Slack, Discord, or Zapier.',
  docs_conn_webhook_example: 'Example: AI output → {"text":"{{input}}"} → POST to Slack',
  docs_connectors_jsonpath: 'Use the JSON Path field to extract specific data from API responses. Example: [*].title extracts all titles from an array. data.items[*].name extracts names from nested objects.',

  // Running Workflows
  docs_workflow_intro: 'Workflows execute in topological order — from root nodes to leaf nodes. Each node receives input from all connected upstream nodes.',
  docs_wf_run: 'Run',
  docs_wf_run_desc: 'Open the bottom panel, type initial input (or leave empty), and click Run.',
  docs_wf_stop: 'Stop',
  docs_wf_stop_desc: 'Click Stop to abort a running workflow immediately.',
  docs_wf_time: 'Timing',
  docs_wf_time_desc: 'Elapsed time is tracked per node and for the total workflow. Shown in the output tabs.',
  docs_wf_notif: 'Notifications',
  docs_wf_notif_desc: 'A bell notification appears when the workflow completes or fails.',

  // Keyboard Shortcuts
  docs_kbd_copy: 'Copy selected nodes',
  docs_kbd_paste: 'Paste copied nodes',
  docs_kbd_search: 'Search nodes by name',
  docs_kbd_multisel: 'Add/toggle node selection',
  docs_kbd_rectsel: 'Rectangle drag-select',
  docs_kbd_delete: 'Delete selected nodes',
  docs_kbd_esc: 'Close search / panels',

  // Settings
  docs_settings_intro: 'Most settings are accessible from the header bar.',
  docs_set_ollama: 'Ollama Connection',
  docs_set_ollama_desc: 'Click the status indicator to configure your Ollama URL. Default: http://localhost:11434',
  docs_set_lang: 'Language',
  docs_set_lang_desc: 'Switch between English, Korean, Chinese, and Japanese.',
  docs_set_minimap: 'Minimap',
  docs_set_minimap_desc: 'Toggle the minimap at the bottom-right corner for a bird\'s-eye view.',
  docs_set_save: 'Cloud Save',
  docs_set_save_desc: 'Sign in to save and load workflows across devices.',

  // Footer
  // Marketplace
  docs_nav_marketplace: 'Workflow Market',
  docs_marketplace_intro: 'Browse workflows shared by other users and share your own in the Workflow Market. Access it via the 🏪 button in the header.',
  docs_mp_share_title: 'Share',
  docs_mp_share_desc: 'Publish your workflow to the market with a name, description, category, and tags. Sign-in required.',
  docs_mp_import_title: 'Import',
  docs_mp_import_desc: 'Click any workflow and hit "Import" to load it directly onto your canvas.',
  docs_mp_like_title: 'Like',
  docs_mp_like_desc: 'Like workflows you enjoy. Likes affect the popularity ranking.',
  docs_mp_tip: 'Imported workflows are copied to your canvas. The original is not affected, so feel free to modify.',

  docs_footer: 'Build anything. Connect everything.',
}
