export default {
  // Nav
  docs_nav_overview: '概览',
  docs_nav_quickstart: '快速开始',
  docs_nav_nodes: 'AI代理节点',
  docs_nav_custom: '自定义节点',
  docs_nav_utility: '工具节点',
  docs_nav_connectors: '连接器',
  docs_nav_workflow: '运行工作流',
  docs_nav_shortcuts: '快捷键',
  docs_nav_settings: '设置',
  docsClose: '关闭文档',

  // Hero
  docs_heroSub: '可视化构建AI工作流。\n拖拽节点、连接它们，让AI完成工作。',

  // Overview
  docs_overview_1: 'AI Factory 是一个基于节点的可视化AI工作流构建工具。将节点拖拽到画布上，用边连接它们，通过Ollama使用本地LLM运行完整的流水线。无需编程。',
  docs_overview_card1_title: '可视化工作流',
  docs_overview_card1_desc: '在画布上连接节点来构建复杂的AI流水线。每个节点都是工作流中的一个步骤。',
  docs_overview_card2_title: '本地AI',
  docs_overview_card2_desc: '通过Ollama在您的电脑上运行。数据永远不会离开您的电脑，安全又快速。',
  docs_overview_card3_title: '可扩展',
  docs_overview_card3_desc: '连接外部API、通过Webhook发送结果、分支逻辑、循环任务等。',

  // Quick Start
  docs_qs_step1_title: '安装 Ollama',
  docs_qs_step1_desc: '从 ollama.com 下载并运行：OLLAMA_ORIGINS="*" ollama serve',
  docs_qs_step2_title: '添加节点',
  docs_qs_step2_desc: '从左侧面板将"节点"拖到画布上。配置名称、角色和模型。',
  docs_qs_step3_title: '连接节点',
  docs_qs_step3_desc: '从节点右侧端口拖到另一节点左侧端口，创建数据流。',
  docs_qs_step4_title: '运行',
  docs_qs_step4_desc: '点击底部面板的运行，输入内容，观察工作流逐节点执行。',

  // AI Agent Node
  docs_nodes_intro: 'AI代理节点是核心构建模块。每个节点与本地LLM进行对话，并将输出传递给连接的节点。',
  docs_nodes_name: '名称',
  docs_nodes_name_desc: '此节点的标签，显示在画布卡片上。',
  docs_nodes_role: '角色（系统提示词）',
  docs_nodes_role_desc: '定义AI代理行为方式的指令。例如："将输入总结为3个要点。"',
  docs_nodes_model: '模型',
  docs_nodes_model_desc: '要使用的Ollama模型。RAM使用量用颜色标示。',
  docs_nodes_return: '返回格式',
  docs_nodes_return_desc: 'Text、JSON、要点列表、韩语或任务列表。自动添加格式指令。',
  docs_nodes_params: 'LLM参数',
  docs_nodes_params_desc: '高级设置：Temperature、Top P/K、Max Tokens、Repeat Penalty、Seed。',

  // Custom Nodes
  docs_custom_intro: '配置好AI代理节点的角色和设置后，将其保存为自定义节点。它会出现在面板的自定义节点区域，随时可以拖拽复用。',
  docs_custom_tip: '点击节点设置面板底部的"保存节点"。所有设置（包括角色、模型和LLM参数）都会被保留。',

  // Utility Nodes
  docs_utility_intro: '工具节点在AI文本生成之外添加逻辑和功能。它们控制流程、处理媒体和管理文件操作。',
  docs_utility_col_node: '节点',
  docs_utility_col_desc: '说明',
  docs_util_tasklist: '将AI输出显示为清单。连接到使用"任务列表"返回格式的代理。',
  docs_util_tts: '将文本转换为语音文件。支持macOS TTS、ElevenLabs、OpenAI。',
  docs_util_imagegen: '根据文本提示生成图像。支持Stable Diffusion、ComfyUI、DALL-E 3。',
  docs_util_filesave: '将文本输出保存为文件（SRT字幕、脚本等）。',
  docs_util_video: '将图片+音频合成为带有字幕和背景音乐的视频。',
  docs_util_youtube: '使用元数据直接上传视频到YouTube。',
  docs_util_branch: '根据条件分支工作流：包含、正则、长度等。',
  docs_util_loop: '重复执行连接的节点N次。链式模式将每次输出作为下一次输入。',

  // Connectors
  docs_connectors_intro: '连接器节点将工作流与外部世界桥接。从任何API拉取数据，或将结果推送到外部服务。',
  docs_conn_api_title: 'API请求',
  docs_conn_api_desc: '从URL获取数据并注入工作流。可配置方法、请求头和请求体。',
  docs_conn_api_example: '示例：GET github.com/api → [*].title → AI总结Issues',
  docs_conn_webhook_title: 'Webhook发送',
  docs_conn_webhook_desc: '将工作流结果发送到Slack、Discord、Zapier等外部服务。',
  docs_conn_webhook_example: '示例：AI输出 → {"text":"{{input}}"} → POST到Slack',
  docs_connectors_jsonpath: '使用JSON Path字段从API响应中提取特定数据。例如：[*].title 提取数组中的所有标题。data.items[*].name 提取嵌套对象中的名称。',

  // Running Workflows
  docs_workflow_intro: '工作流按拓扑顺序执行——从根节点到叶节点。每个节点接收所有上游连接节点的输入。',
  docs_wf_run: '运行',
  docs_wf_run_desc: '打开底部面板，输入初始内容（或留空），然后点击运行。',
  docs_wf_stop: '停止',
  docs_wf_stop_desc: '点击停止可立即中止运行中的工作流。',
  docs_wf_time: '计时',
  docs_wf_time_desc: '每个节点和整体工作流都有运行时间统计，显示在输出标签中。',
  docs_wf_notif: '通知',
  docs_wf_notif_desc: '工作流完成或失败时会显示铃铛通知。',

  // Keyboard Shortcuts
  docs_kbd_copy: '复制选中的节点',
  docs_kbd_paste: '粘贴复制的节点',
  docs_kbd_search: '按名称搜索节点',
  docs_kbd_multisel: '切换多选节点',
  docs_kbd_rectsel: '矩形框选',
  docs_kbd_delete: '删除选中的节点',
  docs_kbd_esc: '关闭搜索/面板',

  // Settings
  docs_settings_intro: '大多数设置可以从顶部标题栏访问。',
  docs_set_ollama: 'Ollama连接',
  docs_set_ollama_desc: '点击状态指示器配置Ollama URL。默认：http://localhost:11434',
  docs_set_lang: '语言',
  docs_set_lang_desc: '在English、한국어、中文和日本語之间切换。',
  docs_set_minimap: '小地图',
  docs_set_minimap_desc: '切换右下角的小地图以获得全局视图。',
  docs_set_save: '云存储',
  docs_set_save_desc: '登录后可跨设备保存和加载工作流。',

  // Footer
  // Marketplace
  docs_nav_marketplace: '工作流市场',
  docs_marketplace_intro: '在工作流市场浏览其他用户分享的工作流，也可以分享自己的工作流。通过标题栏的市场按钮进入市场。',
  docs_mp_share_title: '分享',
  docs_mp_share_desc: '将你的工作流发布到市场，设置名称、描述、分类和标签。需要登录。',
  docs_mp_import_title: '导入',
  docs_mp_import_desc: '点击任意工作流，然后点击"导入"即可直接加载到你的画布上。',
  docs_mp_like_title: '点赞',
  docs_mp_like_desc: '为喜欢的工作流点赞。点赞数会影响热门排序。',
  docs_mp_tip: '导入的工作流会复制到你的画布上。原始工作流不受影响，请放心修改。',

  docs_footer: '构建一切，连接万物。',
}
