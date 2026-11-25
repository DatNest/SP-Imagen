// Small persistent per-post work state shared by the director and inline gallery.
// No API credentials, generated images, or global settings are stored here.
export const DRAFT_FIELD = 'sp_imagen_post_draft_v1';
const STORAGE_PREFIX = 'sp_imagen_draft_v1:';
const ACTIVE_KEY = 'sp_imagen_active_post_v1';
const validKind=kind=>['snapshot','comic','story_page'].includes(kind)||/^custom_[a-z0-9_-]{3,75}$/i.test(String(kind||''));

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
// A draft belongs to one concrete post, not to the currently active chat tab.
// Legacy one-per-chat backups can still be read if their stored fingerprint matches.
function storageKey(chatId, index, message) {
    const chat = encodeURIComponent(String(chatId || ''));
    return STORAGE_PREFIX + chat + ':' + index + ':' + postFingerprint(message);
}
function legacyStorageKey(chatId){ return STORAGE_PREFIX + encodeURIComponent(String(chatId || '')); }
function localDraft(chatId, index, message) {
    try {
        const primary = localStorage.getItem(storageKey(chatId,index,message));
        const fallback = primary || localStorage.getItem(legacyStorageKey(chatId));
        return fallback ? JSON.parse(fallback) : null;
    } catch { return null; }
}
function keepLocal(chatId, index, message, draft) {
    try {
        const key = storageKey(chatId,index,message);
        if (draft) localStorage.setItem(key, JSON.stringify(draft));
        else localStorage.removeItem(key);
        // Remove the legacy backup only when it belongs to this exact post.
        const old=localStorage.getItem(legacyStorageKey(chatId));
        if (old) {
            let stored=null;try{stored=JSON.parse(old)}catch{}
            if (stored?.index===index && stored.fingerprint===postFingerprint(message))
                localStorage.removeItem(legacyStorageKey(chatId));
        }
    } catch (error) { console.warn('[SP Imagen] Не удалось сохранить резервный черновик в браузере', error); }
}
function validDraft(draft, message, index) {
    return Boolean(draft && draft.version === 1 && draft.index === index
        && draft.fingerprint === postFingerprint(message)
        && validKind(draft.kind));
}
export function readPostDraft(ctx, index) {
    const message = ctx?.chat?.[index];
    if (!message) return null;
    const stored = message.extra?.[DRAFT_FIELD];
    const browser = localDraft(ctx.chatId,index,message);
    const validStored = validDraft(stored, message, index) ? stored : null;
    const validBrowser = validDraft(browser, message, index) ? browser : null;
    const draft = validBrowser && (!validStored || Number(validBrowser.updatedAt) > Number(validStored.updatedAt))
        ? validBrowser : validStored;
    // Older releases could leave a "Continue" draft after an image was
    // successfully published. A newer saved version with the same final
    // prompt proves that this exact draft has already completed.
    if (draft?.final?.config?.prompt) {
        const versions=message.extra?.ness_media_slots_v2?.[draft.kind]?.versions;
        const completed=Array.isArray(versions)&&versions.some(item=>
            item?.config?.prompt===draft.final.config.prompt
            && Number(item.at)>=Number(draft.updatedAt));
        if(completed){
            if(message.extra)delete message.extra[DRAFT_FIELD];
            keepLocal(ctx.chatId,index,message,null);
            saveChatSoon(ctx);
            return null;
        }
    }
    if (draft && draft !== stored) {
        message.extra ||= {};
        message.extra[DRAFT_FIELD] = draft;
        saveChatSoon(ctx);
    }
    return draft || null;
}
// The standalone gallery subscribes to the same module as the runtime.
// Notify only the changed post; no legacy global, cross-frame lookup or full chat repaint.
const draftListeners = new Set();
export function subscribePostDraftChanges(listener) {
    draftListeners.add(listener);
    return () => draftListeners.delete(listener);
}
function notifyDraftChanged(ctx, index, message) {
    for (const listener of [...draftListeners]) {
        try { listener({chat:ctx.chat,chatId:ctx.chatId,index,message}); }
        catch (error) { console.warn('[SP Imagen] Не удалось обновить кнопки черновика',error); }
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
    if (!validKind(draft.kind)) throw new Error('Неизвестный тип черновика.');
    message.extra ||= {};
    message.extra[DRAFT_FIELD] = draft;
    keepLocal(ctx.chatId,index,message,draft);
    saveChatSoon(ctx);
    notifyDraftChanged(ctx,index,message);
    return draft;
}
export function discardPostDraft(ctx, index) {
    const message = ctx?.chat?.[index];
    if (!message) return;
    if (message.extra) delete message.extra[DRAFT_FIELD];
    keepLocal(ctx.chatId,index,message,null);
    saveChatSoon(ctx);
    notifyDraftChanged(ctx,index,message);
}
export function clearDraftsForOtherPost(_ctx,_index) {
    // No-op for compatibility: switching RP posts must never delete a saved draft.
}
