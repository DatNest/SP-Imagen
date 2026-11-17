// Small persistent per-post work state shared by the director and inline gallery.
// No API credentials, generated images, or global settings are stored here.
export const DRAFT_FIELD = 'sp_imagen_post_draft_v1';
const STORAGE_PREFIX = 'sp_imagen_draft_v1:';
const ACTIVE_KEY = 'sp_imagen_active_post_v1';

export function postFingerprint(message) {
    // Identify the message, not its editable RP text: editing the post must not erase the draft.
    const value = String(message?.send_date || '') + '\0' + String(message?.name || '');
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}
function storageKey(chatId) { return STORAGE_PREFIX + encodeURIComponent(String(chatId || '')); }
function readActive() {
    try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); } catch { return null; }
}
function setActive(ctx, index) {
    try { localStorage.setItem(ACTIVE_KEY, JSON.stringify({ chatId: String(ctx.chatId || ''), index })); } catch {}
}
function isOtherPost(ctx, index) {
    const active = readActive();
    return active && (active.chatId !== String(ctx.chatId || '') || active.index !== index);
}
function localDraft(chatId) {
    try {
        const value = localStorage.getItem(storageKey(chatId));
        return value ? JSON.parse(value) : null;
    } catch { return null; }
}
function keepLocal(chatId, draft) {
    try {
        if (draft) localStorage.setItem(storageKey(chatId), JSON.stringify(draft));
        else localStorage.removeItem(storageKey(chatId));
    } catch (error) { console.warn('[SP Imagen] Не удалось сохранить резервный черновик в браузере', error); }
}
function validDraft(draft, message, index) {
    return Boolean(draft && draft.version === 1 && draft.index === index
        && draft.fingerprint === postFingerprint(message)
        && ['snapshot', 'comic', 'story_page'].includes(draft.kind));
}
export function readPostDraft(ctx, index) {
    const message = ctx?.chat?.[index];
    if (!message) return null;
    if (isOtherPost(ctx, index)) {
        if (message.extra?.[DRAFT_FIELD]) {
            delete message.extra[DRAFT_FIELD];
            saveChatSoon(ctx);
        }
        const stale = localDraft(ctx.chatId);
        if (stale?.index === index) keepLocal(ctx.chatId, null);
        return null;
    }
    const stored = message.extra?.[DRAFT_FIELD];
    const browser = localDraft(ctx.chatId);
    const validStored = validDraft(stored, message, index) ? stored : null;
    const validBrowser = validDraft(browser, message, index) ? browser : null;
    const draft = validBrowser && (!validStored || Number(validBrowser.updatedAt) > Number(validStored.updatedAt))
        ? validBrowser : validStored;
    if (draft && draft !== stored) {
        message.extra ||= {};
        message.extra[DRAFT_FIELD] = draft;
        saveChatSoon(ctx); // Restore the browser backup into the chat when connectivity returns.
    }
    return draft || null;
}
function refreshGallery() {
    for (const host of [globalThis, globalThis.parent, globalThis.top]) {
        try { host?.__nessImageSlotsV4?.refresh?.(); } catch { /* cross-frame or not installed */ }
    }
}
const saving = new WeakMap();
function saveChatSoon(ctx) {
    const chat = ctx?.chat;
    if (!chat || typeof ctx.saveChat !== 'function') return;
    const previous = saving.get(chat) || Promise.resolve();
    const next = previous.catch(() => {}).then(() => {
        // The current chat may have changed during an asynchronous operation.
        if (globalThis.SillyTavern?.getContext?.().chat !== chat) return;
        return ctx.saveChat();
    }).catch(error => console.warn('[SP Imagen] Сохранение чата отложено; черновик остался в браузере', error));
    saving.set(chat, next);
}
export function savePostDraft(ctx, index, changes, { replace = false } = {}) {
    const message = ctx?.chat?.[index];
    if (!message) throw new Error('Не найден RP-пост для сохранения черновика.');
    const before = replace ? null : readPostDraft(ctx, index);
    const draft = {
        ...(before || {}), ...changes, version: 1, index,
        fingerprint: postFingerprint(message), updatedAt: Date.now(),
    };
    if (!['snapshot', 'comic', 'story_page'].includes(draft.kind)) throw new Error('Неизвестный тип черновика.');
    message.extra ||= {};
    message.extra[DRAFT_FIELD] = draft;
    setActive(ctx, index);
    keepLocal(ctx.chatId, draft);
    saveChatSoon(ctx);
    refreshGallery();
    return draft;
}
export function discardPostDraft(ctx, index) {
    const message = ctx?.chat?.[index];
    if (!message) return;
    if (message.extra) delete message.extra[DRAFT_FIELD];
    const browser = localDraft(ctx.chatId);
    if (browser?.index === index) keepLocal(ctx.chatId, null);
    saveChatSoon(ctx);
    refreshGallery();
}
export function clearDraftsForOtherPost(ctx, index) {
    const chat = ctx?.chat;
    if (!Array.isArray(chat)) return;
    setActive(ctx, index);
    let changed = false;
    for (let i = 0; i < chat.length; i++) {
        if (i !== index && chat[i]?.extra?.[DRAFT_FIELD]) {
            delete chat[i].extra[DRAFT_FIELD];
            changed = true;
        }
    }
    const browser = localDraft(ctx.chatId);
    if (browser && browser.index !== index) { keepLocal(ctx.chatId, null); changed = true; }
    if (changed) { saveChatSoon(ctx); refreshGallery(); }
}
