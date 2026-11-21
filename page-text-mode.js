/** Ephemeral per-generation Comic / Story Page lettering mode. No persistence or workers. */
export const isToggleableTextProfile = id => id === 'comic' || id === 'story_page';
export function pageTextEnabled(id, requested) {
  return !isToggleableTextProfile(id) || requested !== false;
}
/** Fail before any paid image request if a textless director violated its contract.
 * This checks only structural lettering markers; it never extracts dialogue.
 */
export function verifyTextlessImagePrompt(prompt, id, enabled) {
  if (pageTextEnabled(id, enabled)) return;
  const text=String(prompt||'');
  if (/(?:^|\n[ \t]*\n)Text\s*:/iu.test(text)
    || /\bSpeech\s+bubble\s*\d+\s*:/iu.test(text)
    || /(?:^|[,;]\s*)(?:text|speech bubbles?|caption boxes?|narration boxes?)\s*(?:[,;]|$)/iu.test(text)) {
    throw new Error('Режим «Без текста»: режиссёр вернул надписи или бабблы. NovelAI не запускался. Исправь промпт режиссёра либо попробуй снова.');
  }
}
