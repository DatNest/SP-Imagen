/**
 * Deletion is intentionally limited to images generated and stored by SP Imagen.
 * Never delete arbitrary user files, external URLs, legacy data URLs or images
 * used elsewhere in the currently loaded chat.
 */
export function spImagenOwnedImagePath(source, pageOrigin) {
  if (typeof source !== 'string' || source.length > 2048) return null;
  const raw = source.trim();
  if (!raw || /[?#\\\u0000-\u001f]/.test(raw) || /%[0-9a-f]{2}/i.test(raw)) return null;
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.origin !== String(pageOrigin || '') || url.username || url.password) return null;
      path = url.pathname;
    } catch { return null; }
  } else if (/^[a-z][\w+.-]*:/i.test(raw) || raw.startsWith('//')) {
    return null;
  }
  path = path.replace(/^\/+/, '');
  return /^user\/images\/sp-imagen\/image_\d{10,17}\.(?:png|webp|jpe?g)$/i.test(path) ? path : null;
}

export function isReferencedInCurrentChat(chat, source, excluded = null) {
  if (!Array.isArray(chat) || !source) return false;
  for (let i = 0; i < chat.length; i++) {
    const message = chat[i];
    if (!message) continue;
    if (typeof message.mes === 'string' && message.mes.includes(source)) return true;
    for (const [kind, slot] of Object.entries(message.extra?.ness_media_slots_v2 || {})) {
      for (const image of Array.isArray(slot?.versions) ? slot.versions : []) {
        if (image?.src !== source) continue;
        if (excluded && excluded.index === i && excluded.kind === kind && excluded.item === image) continue;
        return true;
      }
    }
    if (Array.isArray(message.extra?.sp_imagen_embeds) &&
        message.extra.sp_imagen_embeds.some(item => item?.src === source &&
          !(excluded && excluded.index === i && excluded.legacyRemoved === true))) return true;
  }
  return false;
}

/**
 * Call after saving chat removal, not before: failed chat saves must never
 * leave retained chat references pointing at a removed file.
 * No external provider is contacted: this is SillyTavern's own same-origin API.
 */
export async function deleteSpImagenOwnedFile(source, { origin, fetchImpl, headers }) {
  const path = spImagenOwnedImagePath(source, origin);
  if (!path) return { deleted: false, reason: 'unmanaged' };
  const response = await fetchImpl('/api/images/delete', {
    method: 'POST',
    credentials: 'same-origin',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    headers,
    body: JSON.stringify({ path }),
  });
  if (response.status === 404) return { deleted: true, missing: true };
  if (!response.ok) throw new Error('Файл SP Imagen не удалён с сервера (HTTP '+response.status+').');
  return { deleted: true };
}
