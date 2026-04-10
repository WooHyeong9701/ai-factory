export default {
  // Header
  tagline: '노드 기반 AI 워크플로우',
  nodes: '노드',
  connections: '연결',
  ollamaConnected: 'Ollama 연결됨',
  ollamaOffline: 'Ollama 오프라인',
  signIn: '로그인',

  // Workflow toolbar
  newWorkflow: '새 워크플로우',
  create: '＋ 새로만들기',
  load: '📂 불러오기',
  save: '💾 저장',
  saving: '저장 중...',
  saved: '✓ 저장됨',
  saveFailed: '✕ 실패',
  saveRequiresLogin: '워크플로우를 저장하려면 로그인이 필요합니다.',
  workerNotConfigured: 'Cloudflare Worker URL이 설정되지 않았습니다.',

  // Canvas empty
  emptyTitle: '왼쪽 팔레트에서 노드를 드래그하세요',
  emptySub: '노드를 캔버스에 끌어다 놓고 연결하여 워크플로우를 구성합니다',

  // Memory alerts
  memoryAbort: '메모리 부족 — 워크플로우 자동 중단',
  memoryHint: '더 작은 모델 사용을 권장합니다. 현재 가용 RAM:',
  swapWarning: '스왑 사용 중 — 성능 저하 가능. 가용 RAM:',

  // Sidebar
  sidebarAI: 'AI 노드',
  sidebarUtility: '유틸리티',
  sidebarModelManager: '모델 관리',
  scriptWriter: '스크립트 작성',
  imagePrompt: '이미지 프롬프트',
  subtitle: '자막 생성',
  metaData: '제목/설명/태그',
  custom: '커스텀',
  taskList: '작업 목록',
  tts: 'TTS (음성)',
  imageGen: '이미지 생성',
  fileSave: '파일 저장',
  videoCompose: '영상 조합',
  youtubeUpload: 'YouTube 업로드',
  branch: '분기 처리',
  loop: '반복문',

  // Run panel
  runTitle: '워크플로우 실행',
  inputPlaceholder: '초기 입력 (주제, 프롬프트 등)',
  run: '▶ 실행',
  stop: '■ 중지',
  running: '실행 중...',

  // Config panel
  configTitle: '노드 설정',
  taskListNodeTitle: '☑ 작업 목록 노드',
  closeSettings: '설정 닫기',
  name: '이름',
  taskListNamePlaceholder: '작업 목록 이름',
  taskStatus: '작업 현황',
  reset: '초기화',
  noTasksYet: '아직 작업이 없습니다',
  completedLabel: '완료',
  connectionGuide: '연결 방법:',
  tlHint1: 'AI 에이전트 노드를 이 노드에 연결하세요',
  tlHint2: '해당 노드의 반환 형식을 ☑ 작업리스트로 설정하세요',
  tlHint3: '실행하면 AI 출력이 체크리스트로 자동 변환됩니다',
  deleteNode: '노드 삭제',
  roleEditorTitle: '역할 편집',
  roleEditorShortcut: '⌘+Enter 저장 · Esc 닫기',
  roleEditorPlaceholder: `이 에이전트의 역할과 행동 방식을 자세히 작성하세요.

예시:
당신은 시니어 소프트웨어 아키텍트입니다.
전달받은 기획서를 분석하여 개발 태스크 목록을 작성합니다.

출력 형식:
## 1단계: [단계명]
- [ ] 세부작업 (예상 소요시간)
...

우선순위 높은 순서대로 정렬하고, 각 작업의 의존관계를 명시하세요.`,
  charCount: '{n}자',
  ramNeeded: '약 {n}GB 필요',
  ramAvailable: '현재 {n}GB 가용',
  ramWarningMsg: 'RAM 부족 — 실행 시 스왑이 발생하거나 컴퓨터가 멈출 수 있습니다.',
  ramTightMsg: '가용 RAM이 빠듯합니다. 다른 앱을 종료하면 안전합니다.',
  safeModelsLabel: '✅ 현재 RAM에서 안전한 모델',
  agentNamePlaceholder: 'Agent 이름',
  roleLabel: '역할 (시스템 프롬프트)',
  expandEdit: '⤢ 크게 편집',
  rolePlaceholder: '이 에이전트의 역할과 행동 방식을 설명하세요...',
  role: '역할',
  model: '모델',
  ramInsufficient: 'RAM 부족',
  selectModel: '모델 선택...',
  modelPlaceholder: '예: llama3.2, gemma3:4b',
  returnFormat: '반환 형식',
  lastOutput: '마지막 출력',
  generating2: '생성 중',
  rtText: 'Text — 자유 텍스트',
  rtJson: 'JSON — 구조화 데이터',
  rtBullet: 'Bullet — 불릿 포인트',
  rtKorean: '한국어 — 한국어 강제',
  rtTasklist: '☑ 작업리스트 — 체크리스트 변환',
  returnType: '반환 유형',
  delete: '삭제',

  // Workflow manager
  savedWorkflows: '저장된 워크플로우',
  cloudNotConnected: '클라우드 저장소가 연결되지 않았습니다',
  loading: '불러오는 중...',
  noSavedWorkflows: '저장된 워크플로우가 없습니다',
  noSavedSub: '현재 워크플로우를 저장하면 여기에 표시됩니다',
  deleteFailed: '삭제 실패',
  loadFailed: '워크플로우를 불러오지 못했습니다',
  retry: '다시 시도',

  // Save dialog
  saveWorkflow: '워크플로우 저장',
  workflowName: '워크플로우 이름',
  saveNamePlaceholder: '예: YouTube Shorts 자동화',
  cancel: '취소',

  // Ollama setup
  setupTitle: 'Ollama 연결 설정',
  setupSub: 'AI 모델 실행을 위해 Ollama를 연결하세요',
  localComputer: '이 컴퓨터',
  externalTunnel: '외부 서버/Tunnel',
  connect: '연결',
  testConnection: '연결 테스트',
  connectionSuccess: '연결 성공',
  connectionFailed: '연결 실패',
  back: '뒤로',
  next: '다음',
  complete: '완료',

  // System monitor
  systemLoading: '시스템 로딩...',
  ramRemaining: '남음',
  ramDanger: 'RAM 위험',

  // Sidebar
  nodePalette: '노드 팔레트',
  dragToCanvas: '드래그하여 캔버스에 배치',
  aiAgent: 'AI 에이전트',
  utilityNodes: '유틸리티 노드',
  modelManagerBtn: '모델 관리 / 추가',
  handleDragTip: '노드 핸들에서 드래그하여 연결하세요',

  // Run panel
  requestInput: '요청사항 입력',
  enterToRun: 'Enter 실행',
  inputPlaceholder: '처리할 내용을 입력하세요...',
  execute: '실행',
  abort: '중단',
  runningStatus: '실행 중...',
  completed: '완료',
  finalOutputTab: '최종 출력',
  nodeOutputTab: '노드별 출력',
  finalOutputPlaceholder: '실행 결과가 여기에 표시됩니다',
  nodeOutputPlaceholder: '실행 후 각 노드의 출력을 여기서 확인하세요',
  runningWorkflow: '워크플로우 실행 중...',
  taskListEmpty: '작업 목록이 비어 있습니다',
  generating: '생성 중...',
  selectNode: '노드를 선택하세요',
  viewFullList: '전체 목록 보기',
  viewLarger: '크게 보기',
  error: '오류',

  // ModelManager — UI
  mmTitle: '모델 관리',
  mmInstalledTitle: '설치된 모델 ({n})',
  mmLoading: '로딩 중...',
  mmEmpty: '설치된 모델이 없습니다.',
  mmSizeStored: '{size} 저장',
  mmDeleteQuestion: '삭제?',
  mmDelete: '삭제',
  mmCancel: '취소',
  mmAddTitle: '모델 추가',
  mmSearchPlaceholder: '이름·태그 검색 (예: 한국어, 추론, qwen)',
  mmCustomPlaceholder: '직접 입력 (예: llama3.1:70b)',
  mmDownload: '다운로드',
  mmPullDownload: '↓ 다운로드',
  mmInstalled: '설치됨',
  mmInstalledDone: '✓ 완료',
  mmConnecting: '연결 중...',
  mmDownloadFailed: '다운로드 실패: {msg}',
  mmRamNeeded: '약 {size} 필요',
  // ModelManager — catalog groups
  mmGroupUltraLight: '초경량 (RAM 1~2GB)',
  mmGroupLight: '경량 (RAM 2~4GB)',
  mmGroupMedium: '중형 (RAM 4~10GB)',
  mmGroupOther: '기타',
  // ModelManager — tags
  mmTagFast: '빠름',
  mmTagUltraLight: '초경량',
  mmTagKorean: '한국어',
  mmTagReasoning: '추론',
  mmTagRecommended: '추천',
  mmTagCode: '코드',
  mmTagEmbedding: '임베딩',
  // ModelManager — model descriptions
  mmDescTinyllama: '가장 가벼운 모델. 빠른 테스트용',
  mmDescQwen05b: '0.5B 초소형. 간단한 분류·변환',
  mmDescQwen15b: '1.5B, 한국어 지원 양호',
  mmDescLlama1b: 'Meta Llama 3.2 1B. 균형잡힌 소형',
  mmDescDeepseek15b: '추론 특화 소형. CoT 지원',
  mmDescGemma1b: 'Google Gemma 3 1B. 대화에 강함',
  mmDescGemma4b: 'Google Gemma 3 4B. 품질·속도 균형 최고',
  mmDescQwen3b: 'Qwen 2.5 3B. 한국어·코드 강함',
  mmDescLlama3b: 'Meta Llama 3.2 3B. 범용',
  mmDescPhi3Mini: 'Microsoft Phi-3 Mini. 논리·수학 우수',
  mmDescDeepseek7b: 'DeepSeek R1 7B. 고품질 추론',
  mmDescMistral7b: 'Mistral 7B. 빠르고 균형 잡힌 범용 모델',
  mmDescLlama8b: 'Meta Llama 3.1 8B. 강력한 범용',
  mmDescGemma9b: 'Google Gemma 2 9B. 고품질 텍스트',
  mmDescQwen7b: 'Qwen 2.5 7B. 한국어·코드 매우 강함',
  mmDescDeepseek8b: 'DeepSeek R1 8B. 강력한 추론',
  mmDescGemma12b: 'Google Gemma 3 12B. 고품질',
  mmDescCodegemma: '코드 전용 모델. 리뷰·생성 특화',
  mmDescCodellama: 'Meta Code Llama 7B. 코드 특화',
  mmDescNomicEmbed: '텍스트 임베딩 전용 (RAG용)',

  // OutputViewer
  ovCopy: '⎘ 복사',
  ovEscClose: 'Esc 닫기',
  ovGenerating: '생성 중입니다...',
  ovNoOutput: '출력이 없습니다.',

  // TaskListViewer
  tlvDefaultName: '작업 목록',
  tlvDoneCount: '{done}/{total} 완료',
  tlvCloseTitle: '닫기 (Esc)',
  tlvEmpty: '아직 작업 항목이 없습니다.',
  tlvFooterHint: '항목 클릭으로 완료 토글 · Esc로 닫기',
  tlvItemCount: '{n}개 항목',

  // Common
  justNow: '방금 전',
  minutesAgo: '{n}분 전',
  hoursAgo: '{n}시간 전',
  daysAgo: '{n}일 전',
}
