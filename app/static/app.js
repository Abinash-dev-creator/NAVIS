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
// Render plain text, Markdown links, and bare HTTP(S) URLs safely as clickable links.
// DOM nodes are used instead of injecting model output as HTML.
function appendTextWithLineBreaks(parent, text) {
  const lines = String(text).split("\n");
  lines.forEach((line, index) => {
    if (index > 0) parent.appendChild(document.createElement("br"));
    parent.appendChild(document.createTextNode(line));
  });
}
function safeHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch (_) {
    return null;
  }
}
function createSafeLink(container, label, rawUrl) {
  const href = safeHttpUrl(rawUrl);
  if (!href) {
    appendTextWithLineBreaks(container, label);
    return;
  }
  const anchor = document.createElement("a");
  anchor.className = "navis-link";
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.textContent = label;
  container.appendChild(anchor);
}

function renderInlineRichText(container, text) {
  // Supports Markdown links and bare HTTP(S) URLs without inserting untrusted HTML.
  const linkPattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>\"']+)/gi;
  let cursor = 0;
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    appendTextWithLineBreaks(container, text.slice(cursor, match.index));
    const isMarkdown = Boolean(match[2]);
    let rawUrl = isMarkdown ? match[2] : match[3];
    let trailing = "";

    if (!isMarkdown) {
      // Strip sentence punctuation and separators accidentally attached to a URL.
      while (/[.,!?;:]$/.test(rawUrl)) {
        trailing = rawUrl.slice(-1) + trailing;
        rawUrl = rawUrl.slice(0, -1);
      }
      // A source-list delimiter may be attached to the URL in older saved messages.
      if (rawUrl.endsWith("-") && /\s+[A-Z]/.test(text.slice(match.index + match[0].length))) {
        trailing = "-" + trailing;
        rawUrl = rawUrl.slice(0, -1);
      }
      while (rawUrl.endsWith(")") && (rawUrl.match(/\(/g) || []).length < (rawUrl.match(/\)/g) || []).length) {
        trailing = ")" + trailing;
        rawUrl = rawUrl.slice(0, -1);
      }
    }

    const href = safeHttpUrl(rawUrl);
    if (href) {
      createSafeLink(container, isMarkdown ? match[1] : rawUrl, href);
    } else {
      appendTextWithLineBreaks(container, match[0]);
    }
    if (trailing) container.appendChild(document.createTextNode(trailing));
    cursor = match.index + match[0].length;
  }
  appendTextWithLineBreaks(container, text.slice(cursor));
}

function renderRichText(container, content) {
  const text = String(content ?? "");
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    if (index > 0) container.appendChild(document.createElement("br"));

    // Render source citations as clickable titles and clickable URLs.
    // This format is produced by main.py's format_search_sources().
    const sourceMatch = line.match(/^\s*[-•]\s*(.*?)\s+—\s+(https?:\/\/\S+)\s*$/i);
    if (sourceMatch) {
      container.appendChild(document.createTextNode("• "));
      createSafeLink(container, sourceMatch[1], sourceMatch[2]);
      container.appendChild(document.createTextNode(" — "));
      createSafeLink(container, sourceMatch[2], sourceMatch[2]);
      return;
    }

    renderInlineRichText(container, line);
  });
}
function installLinkStyles() {
  if (document.getElementById("navis-link-styles")) return;
  const style = document.createElement("style");
  style.id = "navis-link-styles";
  style.textContent = `.bubble a.navis-link { color: var(--cyan, #75e5f7); text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; cursor: pointer; } .bubble a.navis-link:hover { color: #ffffff; } .bubble a.navis-link:focus-visible { outline: 2px solid var(--cyan, #75e5f7); outline-offset: 2px; border-radius: 2px; }`;
  document.head.appendChild(style);
}
installLinkStyles();

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
  renderRichText(bubble, content);
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
