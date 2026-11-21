/**
 * SP Imagen outbound request safeguards.
 * Credential-bearing requests are intentionally limited to authenticated
 * provider endpoints and must never follow HTTP redirects.
 */
export const OFFICIAL_NOVELAI_ORIGIN = 'https://image.novelai.net';

function parsedEndpoint(raw, name) {
    let url;
    try { url = new URL(String(raw || '').trim()); }
    catch { throw new Error(name + ': укажи полный корректный адрес сервера.'); }
    if (!['https:', 'http:'].includes(url.protocol)
        || url.username || url.password || url.search || url.hash
        || /[\u0000-\u001f\u007f\\]/.test(String(raw || ''))) {
        throw new Error(name + ': адрес не должен содержать логин, пароль, параметры, фрагменты или обратные слеши.');
    }
    return url;
}

/** The NovelAI bearer must never leave the single, official HTTPS origin. */
export function officialNovelAIEndpoint(raw) {
    const url = parsedEndpoint(raw, 'NovelAI');
    if (url.protocol !== 'https:' || url.origin !== OFFICIAL_NOVELAI_ORIGIN
        || !['/', '/ai/generate-image'].includes(url.pathname)) {
        throw new Error('Безопасность: токен NovelAI разрешено отправлять только на https://image.novelai.net. Удали сторонний endpoint.');
    }
    return OFFICIAL_NOVELAI_ORIGIN;
}

/**
 * Direct OpenAI-compatible endpoints are optional user-owned provider addresses.
 * HTTP is allowed only for browser-local servers; all remote API calls require HTTPS.
 */
export function directTextOrigin(raw) {
    const url = parsedEndpoint(raw, 'Текстовый API');
    const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname.toLowerCase());
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
        throw new Error('Безопасность: внешний API должен использовать HTTPS. HTTP разрешён только для localhost/127.0.0.1/[::1].');
    if (/\/(?:\.\.|%2e%2e)(?:\/|$)/i.test(url.pathname))
        throw new Error('Текстовый API: некорректный путь.');
    return url.origin;
}

/** Origin explicitly confirmed by the user in the connection dialog. */
export function requireTrustedDirectEndpoint(endpoint, approvedOrigin) {
    const origin = directTextOrigin(endpoint);
    if (origin !== String(approvedOrigin || '')) {
        throw new Error('Безопасность: адрес API не подтверждён. Открой настройки текстовой модели и разреши именно этот сервер, прежде чем отправлять ключ или текст.');
    }
    return origin;
}

export function credentialRequestOptions(options = {}) {
    return {
        ...options,
        redirect: 'error',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
    };
}

/** Never silently load externally hosted chat/gallery images as tracking pixels. */
export function isLocalGalleryImage(source, pageOrigin) {
    if (typeof source !== 'string' || !source || source.length > 55 * 1024 * 1024) return false;
    if (/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(source)) return true;
    if (/^data:|^blob:|^javascript:|^\/\/|\\/.test(source)) return false;
    try {
        const base = new URL(String(pageOrigin || globalThis.location?.origin || ''));
        const url = new URL(source, base);
        return (base.protocol === 'https:' || base.protocol === 'http:')
            && url.origin === base.origin
            && (url.protocol === 'https:' || url.protocol === 'http:')
            && !url.username && !url.password;
    } catch { return false; }
}
