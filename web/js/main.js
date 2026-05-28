import { STORAGE_KEYS, DEFAULT_WEATHER } from './config.js';
import * as Utils from './utils.js';
import { state, el, VIEW_CONTEXT } from './store.js';

const NATIVE_BRIDGE = window.IvoryNativeBridge ? window.IvoryNativeBridge.create() : null;
const WEATHER_RENDERER = window.IvoryWeatherRenderer ? window.IvoryWeatherRenderer.create({ elements: el, viewContext: VIEW_CONTEXT }) : null;

async function init() {
  applyWindowRoleUI();
  initClock();
  bindEvents();
}

function applyWindowRoleUI() {
  document.body.dataset.ivoryRole = VIEW_CONTEXT.role;
  document.body.classList.toggle("is-editor-role", VIEW_CONTEXT.isEditor);
  document.body.classList.toggle("is-wallpaper-role", !VIEW_CONTEXT.isEditor);
}

function bindEvents() {
  // 弹窗控制
  el.openBackgroundModal?.addEventListener("click", () => el.backgroundModal.classList.remove("is-hidden"));
  el.closeBackgroundModal?.addEventListener("click", () => el.backgroundModal.classList.add("is-hidden"));
  
  // Todo 添加
  el.todoForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!el.todoInput.value.trim()) return;
    state.todos.push({ id: Utils.makeId(), text: el.todoInput.value.trim(), done: false });
    el.todoInput.value = "";
    renderTodos();
  });
  
  // Memo 编辑
  el.memoInput?.addEventListener("input", () => {
    state.memo = el.memoInput.value;
    el.memoPreview.innerHTML = Utils.markdownToHtml(state.memo);
  });

  el.memoEditBtn?.addEventListener("click", () => switchMemoMode("edit"));
  el.memoPreviewBtn?.addEventListener("click", () => switchMemoMode("preview"));
}

function switchMemoMode(mode) {
  const isEdit = mode === "edit";
  el.memoInput.classList.toggle("is-hidden", !isEdit);
  el.memoPreview.classList.toggle("is-hidden", isEdit);
  el.memoEditBtn.classList.toggle("is-active", isEdit);
  el.memoPreviewBtn.classList.toggle("is-active", !isEdit);
}

function renderTodos() {
  if(!el.todoList) return;
  el.todoList.innerHTML = "";
  state.todos.forEach(todo => {
    const li = document.createElement("li");
    li.className = `todo-item ${todo.done ? 'is-done' : ''}`;
    li.innerHTML = `
      <label class="todo-main">
        <span><input type="checkbox" ${todo.done ? 'checked' : ''}> ${Utils.escapeHtml(todo.text)}</span>
      </label>
    `;
    li.querySelector("input").addEventListener("change", (e) => {
      todo.done = e.target.checked;
      renderTodos();
    });
    el.todoList.append(li);
  });
}

function initClock() {
  setInterval(() => {
    const now = new Date();
    el.timeValue.textContent = now.toLocaleTimeString("zh-CN", { hour12: false });
    el.dateValue.textContent = now.toLocaleDateString("zh-CN", { weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" });
  }, 1000);
}

init().catch(console.error);