const entryScreen = document.querySelector("#entryScreen");
const workspaceScreen = document.querySelector("#workspaceScreen");
const initialForm = document.querySelector("#initialForm");
const initialInput = document.querySelector("#initialInput");
const projectTitle = document.querySelector("#projectTitle");
const nodeLayer = document.querySelector("#nodeLayer");
const edgeLayer = document.querySelector("#edgeLayer");
const messageList = document.querySelector("#messageList");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const impactButton = document.querySelector("#impactButton");
const impactOverlay = document.querySelector("#impactOverlay");
const fullscreenButton = document.querySelector("#fullscreenButton");
const canvasPanel = document.querySelector("#canvasPanel");
const exportButton = document.querySelector("#exportButton");
const exportDialog = document.querySelector("#exportDialog");

const state = {
  nodes: [],
  edges: [],
  draggingNodeId: null,
  dragOffset: { x: 0, y: 0 },
  nodeIdCounter: 0,
};

// 키워드 기반 플로우 템플릿 라이브러리
const flowTemplates = {
  "SaaS|온보딩|워크스페이스": {
    title: "B2B SaaS 온보딩 플로우",
    nodes: [
      { type: "start", title: "회원가입 시작", copy: "새 계정 생성 요청", meta: "entry.start" },
      { type: "action", title: "이메일 인증", copy: "인증 링크 발송 및 확인", meta: "auth.email_verify" },
      { type: "action", title: "워크스페이스 생성", copy: "조직명 및 도메인 설정", meta: "workspace.create" },
      { type: "action", title: "팀원 초대", copy: "역할 기반 초대 링크 생성", meta: "team.invite" },
      { type: "decision", title: "결제 필수?", copy: "플랜 선택 필요 여부 확인", meta: "billing.required" },
      { type: "risk", title: "결제 정보 등록", copy: "카드 등록 및 세금계산서 설정", meta: "billing.setup" },
      { type: "infra", title: "SSO/감사로그 확인", copy: "엔터프라이즈 기능 체크리스트", meta: "infra.checklist" },
      { type: "end", title: "대시보드 접속", copy: "첫 프로젝트 생성 준비 완료", meta: "flow.complete" },
    ],
  },
  "병원|예약|진료": {
    title: "병원 예약 시스템 플로우",
    nodes: [
      { type: "start", title: "앱 진입", copy: "사용자가 병원 예약 앱 실행", meta: "entry.start" },
      { type: "action", title: "회원가입/로그인", copy: "휴대폰 본인인증 필수", meta: "auth.mobile_verify" },
      { type: "decision", title: "의료진 선택", copy: "과목/의사 검색 및 선택", meta: "selection.doctor" },
      { type: "action", title: "예약 일정 선택", copy: "가능한 시간대 표시 및 선택", meta: "booking.datetime" },
      { type: "action", title: "사전 문진", copy: "증상 및 의료 이력 입력", meta: "form.questionnaire" },
      { type: "action", title: "진료 비용 안내", copy: "예상 비용 및 결제 수단 안내", meta: "payment.estimate" },
      { type: "end", title: "예약 완료", copy: "확인 메시지 및 알림 설정", meta: "flow.complete" },
    ],
  },
  "결제|실패|재시도": {
    title: "결제 실패 예외 처리 플로우",
    nodes: [
      { type: "start", title: "결제 시작", copy: "사용자가 결제 버튼 클릭", meta: "payment.start" },
      { type: "action", title: "결제 처리", copy: "PG사에 결제 요청", meta: "payment.process" },
      { type: "decision", title: "결제 성공?", copy: "결제 승인 여부 확인", meta: "payment.status" },
      { type: "risk", title: "결제 실패 처리", copy: "오류 코드 분류 및 메시지 표시", meta: "error.handle" },
      { type: "action", title: "재시도 안내", copy: "1회/24시간 자동 재시도 및 수동 재시도", meta: "payment.retry" },
      { type: "action", title: "고객센터 연결", copy: "실패 원인 분석 및 상담사 배정", meta: "support.connect" },
      { type: "end", title: "결제 완료", copy: "거래 증명서 발행", meta: "flow.complete" },
    ],
  },
};

// 기본 플로우 (템플릿 매칭 실패 시)
const defaultFlow = {
  title: "기본 서비스 플로우",
  nodes: [
    { type: "start", title: "프로세스 시작", copy: "사용자 진입점", meta: "entry.start" },
    { type: "action", title: "핵심 로직", copy: "주요 기능 실행", meta: "core.logic" },
    { type: "decision", title: "조건 확인", copy: "분기점", meta: "condition.check" },
    { type: "action", title: "완료 처리", copy: "결과 반영", meta: "completion" },
    { type: "end", title: "프로세스 종료", copy: "사용자에게 결과 전달", meta: "flow.complete" },
  ],
};

const aiMessages = [
  {
    type: "ai",
    title: "AI Co-pilot",
    html: "<p>초기 플로우를 생성했습니다. 결제 단계에서 실패 처리와 권한 정책이 아직 명확하지 않습니다.</p><div class='choice-row'><button>자동 재시도</button><button>사용자 재입력</button><button>관리자 알림</button></div>",
  },
  {
    type: "ai",
    title: "Infra-Checker",
    html: "<p>조직형 SaaS에서는 아래 항목을 먼저 확인하는 것이 좋습니다.</p><ul class='checklist'><li><input type='checkbox'> SSO/SAML 지원 범위</li><li><input type='checkbox'> 감사 로그 보관 기간</li><li><input type='checkbox'> 외부 메일 발송 도메인 승인</li></ul>",
  },
];

function matchTemplate(prompt) {
  for (const [keywords, template] of Object.entries(flowTemplates)) {
    const keywordList = keywords.split("|");
    if (keywordList.some(kw => prompt.includes(kw))) {
      return template;
    }
  }
  return defaultFlow;
}

function startProject(prompt) {
  entryScreen.classList.add("hidden");
  workspaceScreen.classList.remove("hidden");

  const template = matchTemplate(prompt);
  projectTitle.textContent = template.title;
  messageList.innerHTML = "";

  addMessage("user", "요청", `<p>${escapeHtml(prompt)}</p>`);
  addMessage("ai", "AI 분석 중", `<p>🔄 플로우 생성 중...</p>`);

  state.nodes = [];
  state.edges = [];
  generateFlowFromTemplate(template, prompt);
}

function generateFlowFromTemplate(template, prompt) {
  const nodes = template.nodes;
  const nodeCount = nodes.length;
  const baseX = 80;
  const baseY = 110;
  const spacingX = Math.max(200, 1000 / Math.max(1, nodeCount - 1));

  nodeLayer.innerHTML = "";
  edgeLayer.innerHTML = "";

  nodes.forEach((nodeData, index) => {
    setTimeout(() => {
      const nodeId = `node_${state.nodeIdCounter++}`;
      const newNode = {
        id: nodeId,
        ...nodeData,
        x: baseX + index * spacingX,
        y: baseY + (Math.random() - 0.5) * 60,
      };
      state.nodes.push(newNode);
      render();

      if (index === nodeCount - 1) {
        createEdges();
        render();
        generateAIInsights(prompt, template);
      }
    }, index * 150);
  });
}

function createEdges() {
  state.edges = [];
  for (let i = 0; i < state.nodes.length - 1; i++) {
    state.edges.push({
      id: `edge_${i}`,
      from: state.nodes[i].id,
      to: state.nodes[i + 1].id,
      status: state.nodes[i].type === "risk" ? "warning" : "active",
    });
  }
}

function generateAIInsights(prompt, template) {
  setTimeout(() => {
    const riskNodeCount = template.nodes.filter(n => n.type === "risk").length;
    const decisionNodeCount = template.nodes.filter(n => n.type === "decision").length;

    const insights = [];

    if (riskNodeCount > 0) {
      insights.push(
        `<p>⚠️ <strong>위험 요소 ${riskNodeCount}개 감지</strong></p>
        <p>주황색 노드에서 예외 처리, 결제 실패, 보안 검증 등이 필요합니다.</p>
        <div class='choice-row'>
          <button onclick="updateNodeType('risk', 'action')">위험도 낮추기</button>
          <button onclick="showImpactAnalysis()">영향도 분석</button>
        </div>`
      );
    }

    if (decisionNodeCount > 0) {
      insights.push(
        `<p>🔀 <strong>분기점 ${decisionNodeCount}개</strong></p>
        <p>yes/no 또는 조건부 분기를 처리해야 합니다. 각 분기의 후속 단계를 명확히 하세요.</p>`
      );
    }

    insights.push(
      `<p>✅ <strong>플로우 생성 완료</strong></p>
      <p>하단 채팅창에서 노드 추가/수정, 분기 추가 등을 요청할 수 있습니다.</p>`
    );

    insights.forEach((html, idx) => {
      setTimeout(() => addMessage("ai", "Co-pilot", html), idx * 300);
    });
  }, 300);
}

function render() {
  renderNodes();
  renderEdges();
}

function renderNodes() {
  nodeLayer.innerHTML = "";
  state.nodes.forEach((node) => {
    const element = document.createElement("article");
    element.className = `node ${node.type}`;
    element.dataset.id = node.id;
    element.style.setProperty("--x", `${node.x}px`);
    element.style.setProperty("--y", `${node.y}px`);
    element.style.transform = `translate(${node.x}px, ${node.y}px)`;
    element.innerHTML = `
      <div class="node-title">
        <span>${escapeHtml(node.title)}</span>
        <span class="node-badge">${node.type}</span>
      </div>
      <div class="node-copy">${escapeHtml(node.copy)}</div>
      <div class="node-meta">${escapeHtml(node.meta)}</div>
    `;

    element.addEventListener("pointerdown", (event) => startDrag(event, node.id));
    element.addEventListener("dblclick", () => deleteNode(node.id));
    nodeLayer.appendChild(element);
  });
}

function renderEdges() {
  edgeLayer.innerHTML = `
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#b8c0cc"></path>
      </marker>
    </defs>
  `;

  state.edges.forEach((edge) => {
    const source = state.nodes.find((node) => node.id === edge.from);
    const target = state.nodes.find((node) => node.id === edge.to);
    if (!source || !target) return;

    const startX = source.x + 180;
    const startY = source.y + 42;
    const endX = target.x;
    const endY = target.y + 42;
    const midX = (startX + endX) / 2;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`);
    path.setAttribute("class", `edge ${edge.status}`);
    path.setAttribute("marker-end", "url(#arrow)");
    edgeLayer.appendChild(path);
  });
}

function startDrag(event, nodeId) {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) return;
  const rect = nodeLayer.getBoundingClientRect();
  state.draggingNodeId = nodeId;
  state.dragOffset = { x: event.clientX - rect.left - node.x, y: event.clientY - rect.top - node.y };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.classList.add("dragging");
}

window.addEventListener("pointermove", (event) => {
  if (!state.draggingNodeId) return;
  const node = state.nodes.find((item) => item.id === state.draggingNodeId);
  if (!node) return;
  const rect = nodeLayer.getBoundingClientRect();
  node.x = Math.max(24, Math.min(990, event.clientX - rect.left - state.dragOffset.x));
  node.y = Math.max(70, Math.min(470, event.clientY - rect.top - state.dragOffset.y));
  render();
});

window.addEventListener("pointerup", () => {
  state.draggingNodeId = null;
});

function deleteNode(nodeId) {
  const element = document.querySelector(`.node[data-id="${nodeId}"]`);
  if (element) element.classList.add("deleting");
  setTimeout(() => {
    state.nodes = state.nodes.filter((node) => node.id !== nodeId);
    state.edges = state.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
    render();
    addMessage("ai", "변경 감지", "<p>노드가 삭제되었습니다. 연결된 경로도 함께 정리했고, 남은 플로우의 종료 상태를 다시 확인하는 것이 좋습니다.</p>");
  }, 220);
}

function addMessage(type, title, html) {
  const message = document.createElement("article");
  message.className = `message ${type}`;
  message.innerHTML = `<div class="message-title">${escapeHtml(title)}</div>${html}`;
  messageList.appendChild(message);
  messageList.scrollTop = messageList.scrollHeight;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    initialInput.value = button.dataset.prompt;
    initialInput.focus();
  });
});

initialForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = initialInput.value.trim();
  if (!prompt) return;
  startProject(prompt);
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = chatInput.value.trim();
  if (!prompt) return;

  addMessage("user", "수정 요청", `<p>${escapeHtml(prompt)}</p>`);
  chatInput.value = "";

  if (prompt.startsWith("/add")) {
    handleAddNode(prompt.replace("/add", "").trim());
  } else if (prompt.startsWith("/remove")) {
    handleRemoveNode(prompt.replace("/remove", "").trim());
  } else if (prompt.startsWith("/analyze")) {
    showImpactAnalysis();
  } else {
    handleGeneralRequest(prompt);
  }
});

function handleAddNode(description) {
  setTimeout(() => {
    const nodeId = `node_${state.nodeIdCounter++}`;
    const newNode = {
      id: nodeId,
      type: description.includes("확인") ? "decision" : "action",
      title: description.substring(0, 20),
      copy: description,
      meta: `added.${Date.now()}`,
      x: 400 + Math.random() * 200,
      y: 200 + Math.random() * 100,
    };
    state.nodes.push(newNode);
    render();
    addMessage("ai", "노드 추가", `<p>✓ "${description}" 노드가 추가되었습니다.</p>`);
  }, 300);
}

function handleRemoveNode(keyword) {
  setTimeout(() => {
    const nodeToRemove = state.nodes.find(n => n.title.includes(keyword));
    if (nodeToRemove) {
      state.nodes = state.nodes.filter(n => n.id !== nodeToRemove.id);
      state.edges = state.edges.filter(e => e.from !== nodeToRemove.id && e.to !== nodeToRemove.id);
      render();
      addMessage("ai", "노드 제거", `<p>✓ "${keyword}" 관련 노드가 제거되었습니다.</p>`);
    } else {
      addMessage("ai", "오류", `<p>해당하는 노드를 찾을 수 없습니다.</p>`);
    }
  }, 300);
}

function handleGeneralRequest(prompt) {
  setTimeout(() => {
    addMessage(
      "ai",
      "제안",
      `<p>📝 요청을 이해했습니다: "${prompt}"</p>
      <p>명령어를 사용하세요:</p>
      <ul style="margin: 10px 0">
      <li><code>/add [설명]</code> - 새 노드 추가</li>
      <li><code>/remove [키워드]</code> - 노드 제거</li>
      <li><code>/analyze</code> - 영향도 분석</li>
      </ul>`,
    );
  }, 300);
}

function showImpactAnalysis() {
  impactOverlay.classList.remove("hidden");
  addMessage("ai", "Impact Analysis", `
    <p>📊 변경 영향도 분석:</p>
    <ul style="margin: 10px 0">
    <li><strong>높음</strong> ${state.nodes.filter(n => n.type === "risk").length}개 위험 노드</li>
    <li><strong>중간</strong> ${state.nodes.filter(n => n.type === "decision").length}개 분기점</li>
    <li><strong>정상</strong> ${state.nodes.filter(n => n.type === "action").length}개 작업</li>
    </ul>
  `);
}

function updateNodeType(fromType, toType) {
  const nodes = state.nodes.filter(n => n.type === fromType);
  nodes.forEach(n => n.type = toType);
  render();
  addMessage("ai", "노드 업데이트", `<p>✓ ${nodes.length}개 노드의 타입이 변경되었습니다.</p>`);
}

impactButton.addEventListener("click", () => {
  impactOverlay.classList.toggle("hidden");
});

fullscreenButton.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    canvasPanel.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
});

exportButton.addEventListener("click", () => {
  if (typeof exportDialog.showModal === "function") {
    exportDialog.showModal();
  }
});

exportDialog.addEventListener("submit", (event) => {
  const format = event.submitter.value;
  if (format === "json") {
    downloadJSON();
  } else if (format === "png") {
    downloadPNG();
  } else if (format === "pdf") {
    downloadPDF();
  }
});

function downloadJSON() {
  const data = {
    title: projectTitle.textContent,
    timestamp: new Date().toISOString(),
    nodes: state.nodes,
    edges: state.edges,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flow_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  addMessage("ai", "Export", `<p>✓ JSON 파일이 다운로드되었습니다.</p>`);
}

function downloadPNG() {
  addMessage("ai", "Export", `<p>⚙️ PNG 내보내기는 준비 중입니다. JSON으로 다운로드 후 Figma에서 편집하세요.</p>`);
}

function downloadPDF() {
  addMessage("ai", "Export", `<p>⚙️ PDF 내보내기는 준비 중입니다. 현재 JSON 내보내기를 권장합니다.</p>`);
}
