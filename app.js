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
};

const graphTemplate = {
  nodes: [
    { id: "start", type: "start", title: "가입 시작", copy: "사용자가 서비스 진입 후 계정 생성을 시작합니다.", x: 80, y: 110, meta: "entry.start" },
    { id: "signup", type: "action", title: "이메일 회원가입", copy: "이메일, 비밀번호, 약관 동의를 수집합니다.", x: 300, y: 110, meta: "user.signup" },
    { id: "verify", type: "decision", title: "이메일 인증 완료?", copy: "미인증 사용자는 재발송 또는 보류 상태로 이동합니다.", x: 520, y: 110, meta: "condition.email_verified" },
    { id: "workspace", type: "action", title: "워크스페이스 생성", copy: "조직명, 도메인, 기본 권한을 설정합니다.", x: 740, y: 86, meta: "workspace.create" },
    { id: "invite", type: "action", title: "팀원 초대", copy: "역할별 초대 링크와 만료 정책을 생성합니다.", x: 740, y: 235, meta: "team.invite" },
    { id: "billing", type: "risk", title: "결제 정보 등록", copy: "카드 실패, 세금계산서, 관리자 승인 예외가 필요합니다.", x: 960, y: 160, meta: "billing.setup" },
    { id: "infra", type: "infra", title: "인프라 체크", copy: "SSO, 감사 로그, 외부 메일 발송 정책을 확인합니다.", x: 520, y: 335, meta: "infra.checklist" },
    { id: "end", type: "end", title: "온보딩 완료", copy: "사용자는 대시보드에서 첫 프로젝트를 생성할 수 있습니다.", x: 960, y: 350, meta: "flow.complete" },
  ],
  edges: [
    { id: "e1", from: "start", to: "signup", status: "active" },
    { id: "e2", from: "signup", to: "verify", status: "active" },
    { id: "e3", from: "verify", to: "workspace", label: "yes", status: "active" },
    { id: "e4", from: "workspace", to: "invite", status: "normal" },
    { id: "e5", from: "invite", to: "billing", status: "warning" },
    { id: "e6", from: "verify", to: "infra", label: "needs policy", status: "warning" },
    { id: "e7", from: "billing", to: "end", status: "normal" },
    { id: "e8", from: "infra", to: "end", status: "normal" },
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

function getPromptTitle(prompt) {
  if (prompt.includes("병원")) return "병원 예약 서비스 플로우";
  if (prompt.includes("결제")) return "결제 실패 예외 처리 플로우";
  if (prompt.includes("SaaS") || prompt.includes("워크스페이스")) return "B2B SaaS 온보딩 플로우";
  return "새 서비스 플로우";
}

function startProject(prompt) {
  entryScreen.classList.add("hidden");
  workspaceScreen.classList.remove("hidden");
  projectTitle.textContent = getPromptTitle(prompt);
  messageList.innerHTML = "";
  addMessage("user", "요청", `<p>${escapeHtml(prompt)}</p>`);
  state.nodes = [];
  state.edges = [];
  renderGraphProgressively();
}

function renderGraphProgressively() {
  nodeLayer.innerHTML = "";
  edgeLayer.innerHTML = "";

  graphTemplate.nodes.forEach((node, index) => {
    setTimeout(() => {
      state.nodes.push({ ...node });
      render();
      if (index === graphTemplate.nodes.length - 1) {
        state.edges = graphTemplate.edges.map((edge) => ({ ...edge }));
        render();
        aiMessages.forEach((message, messageIndex) => {
          setTimeout(() => addMessage(message.type, message.title, message.html), 280 * (messageIndex + 1));
        });
      }
    }, index * 170);
  });
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

  setTimeout(() => {
    addMessage(
      "ai",
      "Impact Analysis",
      "<p>요청한 변경은 결제 정보 등록과 감사 로그에 영향을 줍니다. 미리보기 노드를 추가하고 위험 경로를 주황색으로 표시했습니다.</p><div class='choice-row'><button>미리보기</button><button>적용</button><button>무시</button></div>",
    );
    impactOverlay.classList.remove("hidden");
  }, 450);
});

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
