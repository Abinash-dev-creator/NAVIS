const $ = (id) => document.getElementById(id);
let activeConversationId = null;
let busy = false;

function showError(message) {
  const el = $("error-banner");
  el.textContent = message;
  el.classList.remove("hidden");
}
function hideError() {
  $("error-banner").classList.add("hidden");
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}
function escapeText(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function renderMessage(role, content, createdAt = "") {
  const messages = $("messages");
  const article = document.createElement("article");
  article.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "N" : "Y";
  const body = document.createElement("div");
  body.className = "message-body";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  body.appendChild(bubble);
  if (createdAt) {
    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    body.appendChild(meta);
  }
  article.append(avatar, body);
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}
function setChatView(hasMessages) {
  $("welcome").classList.toggle("hidden", hasMessages);
  $("messages").classList.toggle("visible", hasMessages);
}
async function refreshConversations() {
  const conversations = await api("/api/v1/conversations");
  const list = $("conversation-list");
  list.replaceChildren();
  conversations.forEach((conversation) => {
    const button = document.createElement("button");
    button.className = "conversation-item" + (conversation.id === activeConversationId ? " active" : "");
    button.innerHTML = `<span>◷</span><span class="conversation-title"></span>`;
    button.querySelector(".conversation-title").textContent = conversation.title;
    button.title = conversation.title;
    button.addEventListener("click", () => openConversation(conversation.id));
    list.appendChild(button);
  });
}
async function newConversation() {
  const conversation = await api("/api/v1/conversations", {
    method: "POST", body: JSON.stringify({ title: "New conversation" })
  });
  activeConversationId = conversation.id;
  $("messages").replaceChildren();
  setChatView(false);
  hideError();
  await refreshConversations();
  $("message-input").focus();
}
async function openConversation(id) {
  try {
    const conversation = await api(`/api/v1/conversations/${id}`);
    activeConversationId = id;
    $("messages").replaceChildren();
    conversation.messages.forEach((message) => renderMessage(message.role, message.content, message.created_at));
    setChatView(conversation.messages.length > 0);
    hideError();
    await refreshConversations();
  } catch (error) { showError(error.message); }
}
async function sendMessage(text) {
  if (busy || !text.trim()) return;
  if (!activeConversationId) await newConversation();
  busy = true;
  hideError();
  $("send-button").disabled = true;
  $("message-input").value = "";
  $("message-input").style.height = "auto";
  setChatView(true);
  renderMessage("user", text);
  const typing = document.createElement("div");
  typing.className = "typing";
  typing.textContent = "Navis is thinking…";
  $("messages").appendChild(typing);
  $("messages").scrollTop = $("messages").scrollHeight;
  try {
    const result = await api("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify({ conversation_id: activeConversationId, message: text })
    });
    typing.remove();
    renderMessage("assistant", result.reply, result.created_at);
    $("provider-pill").textContent = `${result.provider} · ${result.model}`;
    await refreshConversations();
  } catch (error) {
    typing.remove();
    showError(error.message);
    // Reload the conversation so the UI matches messages actually saved by the server.
    try { await openConversation(activeConversationId); } catch (_) {}
  } finally {
    busy = false;
    $("send-button").disabled = false;
    $("message-input").focus();
  }
}
$("chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage($("message-input").value);
});
$("message-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("chat-form").requestSubmit();
  }
});
$("message-input").addEventListener("input", (event) => {
  event.target.style.height = "auto";
  event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
});
$("new-chat").addEventListener("click", () => newConversation().catch((error) => showError(error.message)));
$("clear-chat").addEventListener("click", async () => {
  if (!activeConversationId) return;
  if (!confirm("Delete this conversation and its messages? This cannot be undone.")) return;
  try {
    await api(`/api/v1/conversations/${activeConversationId}`, { method: "DELETE" });
    activeConversationId = null;
    await newConversation();
  } catch (error) { showError(error.message); }
});
document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});
async function init() {
  try {
    const health = await api("/api/v1/health");
    $("provider-pill").textContent = `${health.provider} · ${health.model}`;
    $("status-detail").textContent = `${health.provider} mode`;
    const conversations = await api("/api/v1/conversations");
    if (conversations.length) await openConversation(conversations[0].id);
    else await newConversation();
  } catch (error) {
    $("status-detail").textContent = "Backend unavailable";
    showError(`Could not connect to Navis: ${error.message}. Make sure the backend is running.`);
  }
}
init();
