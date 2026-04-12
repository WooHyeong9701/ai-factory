export default {
  // Nav
  docs_nav_overview: '개요',
  docs_nav_quickstart: '빠른 시작',
  docs_nav_nodes: 'AI 에이전트 노드',
  docs_nav_custom: '커스텀 노드',
  docs_nav_utility: '유틸리티 노드',
  docs_nav_connectors: '커넥터',
  docs_nav_workflow: '워크플로우 실행',
  docs_nav_shortcuts: '키보드 단축키',
  docs_nav_settings: '설정',
  docsClose: '문서 닫기',

  // Hero
  docs_heroSub: 'AI 워크플로우를 시각적으로 구축하세요.\n노드를 드래그하고 연결하면 AI가 알아서 처리합니다.',

  // Overview
  docs_overview_1: 'AI Factory는 AI 워크플로우를 시각적으로 구축하는 노드 기반 도구입니다. 캔버스에 노드를 드래그하고, 엣지로 연결한 뒤, Ollama를 통해 로컬 LLM으로 전체 파이프라인을 실행하세요. 코딩이 필요 없습니다.',
  docs_overview_card1_title: '시각적 워크플로우',
  docs_overview_card1_desc: '캔버스에서 노드를 연결하여 복잡한 AI 파이프라인을 구축하세요. 각 노드가 워크플로우의 한 단계입니다.',
  docs_overview_card2_title: '로컬 AI',
  docs_overview_card2_desc: 'Ollama를 통해 내 컴퓨터에서 실행됩니다. 데이터가 외부로 나가지 않아 안전하고 빠릅니다.',
  docs_overview_card3_title: '확장 가능',
  docs_overview_card3_desc: '외부 API 연동, 웹훅 전송, 조건 분기, 반복 실행 등 다양한 기능을 제공합니다.',

  // Quick Start
  docs_qs_step1_title: 'Ollama 설치',
  docs_qs_step1_desc: 'ollama.com에서 다운로드하고 실행: OLLAMA_ORIGINS="*" ollama serve',
  docs_qs_step2_title: '노드 추가',
  docs_qs_step2_desc: '왼쪽 팔레트에서 "노드"를 캔버스로 드래그하세요. 이름, 역할, 모델을 설정합니다.',
  docs_qs_step3_title: '노드 연결',
  docs_qs_step3_desc: '노드의 오른쪽 핸들에서 다른 노드의 왼쪽 핸들로 드래그하여 데이터 흐름을 만듭니다.',
  docs_qs_step4_title: '실행',
  docs_qs_step4_desc: '하단 패널에서 실행을 클릭하고, 입력을 작성하면 워크플로우가 노드별로 순차 실행됩니다.',

  // AI Agent Node
  docs_nodes_intro: 'AI 에이전트 노드는 핵심 구성 요소입니다. 각 노드가 로컬 LLM과 대화를 수행하고, 결과를 연결된 다음 노드로 전달합니다.',
  docs_nodes_name: '이름',
  docs_nodes_name_desc: '이 노드의 라벨입니다. 캔버스 카드에 표시됩니다.',
  docs_nodes_role: '역할 (시스템 프롬프트)',
  docs_nodes_role_desc: 'AI 에이전트의 동작 방식을 정의하는 지시문입니다. 예: "입력을 3개의 불릿 포인트로 요약하세요."',
  docs_nodes_model: '모델',
  docs_nodes_model_desc: '사용할 Ollama 모델을 선택합니다. RAM 사용량이 색상으로 표시됩니다.',
  docs_nodes_return: '반환 형식',
  docs_nodes_return_desc: 'Text, JSON, Bullet list, 한국어, Task list 중 선택. 형식 지시가 자동으로 추가됩니다.',
  docs_nodes_params: 'LLM 파라미터',
  docs_nodes_params_desc: '고급 설정: Temperature, Top P/K, Max Tokens, Repeat Penalty, Seed.',

  // Custom Nodes
  docs_custom_intro: 'AI 에이전트 노드를 원하는 역할과 설정으로 구성한 뒤, 커스텀 노드로 저장하세요. 팔레트의 커스텀 노드 영역에 나타나며, 언제든 드래그하여 재사용할 수 있습니다.',
  docs_custom_tip: '노드 설정 패널 하단의 "노드 저장"을 클릭하세요. 역할, 모델, LLM 파라미터 등 모든 설정이 보존됩니다.',

  // Utility Nodes
  docs_utility_intro: '유틸리티 노드는 AI 텍스트 생성 외의 로직과 기능을 추가합니다. 흐름 제어, 미디어 처리, 파일 작업을 담당합니다.',
  docs_utility_col_node: '노드',
  docs_utility_col_desc: '설명',
  docs_util_tasklist: 'AI 출력을 체크리스트로 표시합니다. "Task list" 반환 형식의 에이전트와 연결하세요.',
  docs_util_tts: '텍스트를 음성 파일로 변환합니다. macOS TTS, ElevenLabs, OpenAI를 지원합니다.',
  docs_util_imagegen: '텍스트 프롬프트로 이미지를 생성합니다. Stable Diffusion, ComfyUI, DALL-E 3을 지원합니다.',
  docs_util_filesave: '텍스트 출력을 파일로 저장합니다 (SRT 자막, 스크립트 등).',
  docs_util_video: '이미지 + 오디오를 조합하여 자막과 BGM이 포함된 영상을 생성합니다.',
  docs_util_youtube: '메타데이터와 함께 YouTube에 영상을 직접 업로드합니다.',
  docs_util_branch: '조건에 따라 워크플로우를 분기합니다: 포함, 정규식, 길이 등.',
  docs_util_loop: '연결된 노드를 N회 반복 실행합니다. Chain 모드는 각 출력을 다음 입력으로 전달합니다.',

  // Connectors
  docs_connectors_intro: '커넥터 노드는 워크플로우를 외부 세계와 연결합니다. API에서 데이터를 가져오거나, 결과를 외부 서비스로 전송하세요.',
  docs_conn_api_title: 'API 요청',
  docs_conn_api_desc: 'URL에서 데이터를 가져와 워크플로우에 주입합니다. 메서드, 헤더, 바디를 설정할 수 있습니다.',
  docs_conn_api_example: '예시: GET github.com/api → [*].title → AI가 이슈 요약',
  docs_conn_webhook_title: '웹훅 전송',
  docs_conn_webhook_desc: '워크플로우 결과를 Slack, Discord, Zapier 등 외부 서비스로 전송합니다.',
  docs_conn_webhook_example: '예시: AI 출력 → {"text":"{{input}}"} → POST to Slack',
  docs_connectors_jsonpath: 'JSON Path 필드로 API 응답에서 특정 데이터를 추출하세요. 예: [*].title은 배열에서 모든 제목을 추출합니다. data.items[*].name은 중첩 객체에서 이름을 추출합니다.',

  // Running Workflows
  docs_workflow_intro: '워크플로우는 위상 정렬 순서로 실행됩니다 — 루트 노드에서 리프 노드까지. 각 노드는 연결된 모든 상위 노드의 입력을 받습니다.',
  docs_wf_run: '실행',
  docs_wf_run_desc: '하단 패널을 열고, 초기 입력을 작성한 뒤 (또는 비워두고), 실행을 클릭합니다.',
  docs_wf_stop: '중지',
  docs_wf_stop_desc: '중지를 클릭하면 실행 중인 워크플로우를 즉시 중단합니다.',
  docs_wf_time: '타이밍',
  docs_wf_time_desc: '각 노드별 실행 시간과 전체 소요 시간이 측정됩니다. 출력 탭에서 확인하세요.',
  docs_wf_notif: '알림',
  docs_wf_notif_desc: '워크플로우가 완료되거나 실패하면 벨 알림이 표시됩니다.',

  // Keyboard Shortcuts
  docs_kbd_copy: '선택한 노드 복사',
  docs_kbd_paste: '복사한 노드 붙여넣기',
  docs_kbd_search: '노드 이름으로 검색',
  docs_kbd_multisel: '노드 다중 선택 토글',
  docs_kbd_rectsel: '사각형 드래그 선택',
  docs_kbd_delete: '선택한 노드 삭제',
  docs_kbd_esc: '검색 / 패널 닫기',

  // Settings
  docs_settings_intro: '대부분의 설정은 상단 헤더 바에서 접근할 수 있습니다.',
  docs_set_ollama: 'Ollama 연결',
  docs_set_ollama_desc: '상태 표시기를 클릭하여 Ollama URL을 설정합니다. 기본값: http://localhost:11434',
  docs_set_lang: '언어',
  docs_set_lang_desc: '한국어, English, 中文, 日本語 간 전환합니다.',
  docs_set_minimap: '미니맵',
  docs_set_minimap_desc: '우측 하단의 미니맵을 토글하여 전체 뷰를 확인합니다.',
  docs_set_save: '클라우드 저장',
  docs_set_save_desc: '로그인하여 여러 기기에서 워크플로우를 저장하고 불러올 수 있습니다.',

  // Marketplace
  docs_nav_marketplace: '워크플로우 마켓',
  docs_marketplace_intro: '워크플로우 마켓에서 다른 사용자들이 만든 워크플로우를 탐색하고, 내 워크플로우를 공유할 수 있습니다. 헤더의 마켓 버튼으로 마켓에 접속하세요.',
  docs_mp_share_title: '공유하기',
  docs_mp_share_desc: '내 워크플로우를 마켓에 공유하세요. 이름, 설명, 카테고리, 태그를 설정할 수 있습니다. 로그인이 필요합니다.',
  docs_mp_import_title: '가져오기',
  docs_mp_import_desc: '마음에 드는 워크플로우를 클릭하고 "가져오기"를 누르면 내 캔버스에 즉시 적용됩니다.',
  docs_mp_like_title: '좋아요',
  docs_mp_like_desc: '마음에 드는 워크플로우에 좋아요를 눌러주세요. 인기순 정렬에 반영됩니다.',
  docs_mp_tip: '마켓에서 가져온 워크플로우는 내 캔버스에 복사됩니다. 원본에는 영향이 없으니 자유롭게 수정하세요.',

  // Footer
  docs_footer: '무엇이든 만들고, 모든 것을 연결하세요.',
}
