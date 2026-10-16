(() => {
  const API = '/api/v1/social';
  const $ = (id) => document.getElementById(id);
  let currentFilter = 'pending_approval';
  let draftsCache = [];
  const platformNames = { instagram: 'Instagram', whatsapp: 'WhatsApp', linkedin: 'LinkedIn' };
  const statusLabels = { pending_approval: 'Needs review', approved: 'Approved locally', rejected: 'Rejected' };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function setNotice(message, isError = false) {
    $('notice').textContent = message;
    $('notice').classList.toggle('error', isError);
  }
  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    let data;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
    return data;
  }
  function statusText(platform, data) {
    const row = (data.platforms || []).find((item) => item.platform === platform);
    if (!row) return { chip: 'Unknown', detail: 'No readiness information was returned.', ready: false };
    const ready = row.official_api_status === 'connected';
    return { chip: ready ? 'Connected' : 'Setup required', detail: row.next_step || row.official_api_status, ready };
  }
  async function loadStatus() {
    try {
      const data = await request(`${API}/status`);
      for (const platform of Object.keys(platformNames)) {
        const info = statusText(platform, data);
        $(`${platform}-status`).textContent = info.chip;
        $(`${platform}-status`).className = `status-chip ${info.ready ? 'ready' : 'blocked'}`;
        $(`${platform}-detail`).textContent = info.detail;
      }
    } catch (error) {
      for (const platform of Object.keys(platformNames)) {
        $(`${platform}-status`).textContent = 'Unavailable';
        $(`${platform}-status`).className = 'status-chip blocked';
        $(`${platform}-detail`).textContent = 'Could not load readiness. Check that Navis is running and the v0.4.0 backend is installed.';
      }
      setNotice(`Could not load platform status: ${error.message}`, true);
    }
  }
  function visibleDrafts() {
    return currentFilter === 'all' ? draftsCache : draftsCache.filter((draft) => draft.status === currentFilter);
  }
  function draftCard(draft) {
    const pending = draft.status === 'pending_approval';
    const platform = platformNames[draft.platform] || draft.platform;
    const source = esc(draft.source_message || 'No original message supplied.');
    const reply = esc(draft.draft_text || '');
    const recipient = esc(draft.recipient_name || 'Unlabelled contact');
    const date = esc(draft.created_at || 'Date unavailable');
    return `<article class="draft-card" data-id="${esc(draft.id)}">
      <div class="draft-top"><div><div class="draft-platform">${esc(platform)}</div><div class="draft-recipient">${recipient}</div><div class="draft-date">Created ${date}</div></div><span class="status-label ${esc(draft.status)}">${esc(statusLabels[draft.status] || draft.status)}</span></div>
      <div class="message-pair"><div class="message-panel"><label>Original message</label><p>${source}</p></div><div class="message-panel"><label>${pending ? 'Proposed reply · editable' : 'Saved reply'}</label>${pending ? `<textarea class="reply-editor" aria-label="Edit proposed reply">${reply}</textarea>` : `<p>${reply}</p>`}</div></div>
      ${pending ? `<div class="draft-actions"><button class="secondary-button" data-action="save">Save edits</button><button class="secondary-button" data-action="reject">Reject</button><button class="primary-button" data-action="approve">Approve draft</button></div>` : ''}
    </article>`;
  }
  function renderDrafts() {
    const list = $('draft-list');
    const items = visibleDrafts();
    $('pending-count').textContent = draftsCache.filter((draft) => draft.status === 'pending_approval').length;
    list.innerHTML = items.map(draftCard).join('');
    $('empty-state').classList.toggle('hidden', items.length > 0);
    if (!items.length) setNotice(currentFilter === 'pending_approval' ? 'No drafts need review yet.' : 'No drafts match this filter.');
    else setNotice(`${items.length} draft${items.length === 1 ? '' : 's'} shown. Approval records a local decision only; nothing is sent.`);
  }
  async function loadDrafts() {
    setNotice('Loading draft queue…');
    try {
      draftsCache = await request(`${API}/drafts`);
      renderDrafts();
    } catch (error) {
      $('draft-list').innerHTML = '';
      $('empty-state').classList.remove('hidden');
      setNotice(`Could not load drafts: ${error.message}. Confirm that the v0.4.0 backend is running.`, true);
    }
  }
  function openDialog() { $('draft-dialog').showModal(); }
  function closeDialog() { $('draft-dialog').close(); }
  async function createDraft(event) {
    event.preventDefault();
    const submit = $('draft-form').querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await request(`${API}/drafts`, { method: 'POST', body: JSON.stringify({
        platform: $('draft-platform').value,
        recipient_name: $('draft-recipient').value.trim(),
        source_message: $('draft-source').value.trim(),
        draft_text: $('draft-reply').value.trim()
      }) });
      closeDialog();
      currentFilter = 'pending_approval';
      document.querySelectorAll('.filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === currentFilter));
      await loadDrafts();
      setNotice('Test draft saved. It has not been sent to anyone.');
    } catch (error) { setNotice(`Could not create draft: ${error.message}`, true); }
    finally { submit.disabled = false; }
  }
  async function handleDraftAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('.draft-card');
    const id = card?.dataset.id;
    if (!id) return;
    const action = button.dataset.action;
    button.disabled = true;
    try {
      if (action === 'save') {
        const draft_text = card.querySelector('.reply-editor').value.trim();
        await request(`${API}/drafts/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ draft_text }) });
        setNotice('Edits saved to the local draft.');
      } else if (action === 'approve') {
        if (!confirm('Approve this draft locally? This will NOT send a message.')) return;
        const result = await request(`${API}/drafts/${encodeURIComponent(id)}/approve`, { method: 'POST', body: '{}' });
        setNotice(result.delivery_note || 'Draft approved locally. No message was sent.');
      } else if (action === 'reject') {
        if (!confirm('Reject this draft? It will remain in the local review history.')) return;
        await request(`${API}/drafts/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ reason: 'Rejected in Navis Social Inbox' }) });
        setNotice('Draft rejected. No message was sent.');
      }
      await loadDrafts();
    } catch (error) { setNotice(`Action failed: ${error.message}`, true); }
    finally { button.disabled = false; }
  }

  document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item === button));
    renderDrafts();
  }));
  $('refresh-button').addEventListener('click', async () => { await Promise.all([loadStatus(), loadDrafts()]); });
  $('new-draft-button').addEventListener('click', openDialog);
  $('empty-create-button').addEventListener('click', openDialog);
  $('close-dialog').addEventListener('click', closeDialog);
  $('cancel-dialog').addEventListener('click', closeDialog);
  $('draft-form').addEventListener('submit', createDraft);
  $('draft-list').addEventListener('click', handleDraftAction);
  Promise.all([loadStatus(), loadDrafts()]);
})();
