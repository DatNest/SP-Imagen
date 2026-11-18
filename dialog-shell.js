// Single top-level SP Imagen dialog implementation. No dependency on other extensions.
import { mountViewportOverlay } from './viewport-overlay.js';
import { NESS_UI_CSS } from './shared-ui-css.js';

export function createDialogHeader(D, panel, title, subtitle, badgeText, ui, openTheme) {
    const header = ui.el('header', undefined, panel, 'ness-header');
    const copy = ui.el('div', undefined, header, 'ness-header-copy');
    ui.el('h3', title, copy);
    if (subtitle) ui.el('p', subtitle, copy);
    const actions = ui.el('div', undefined, header, 'ness-row');
    const badge = ui.el('span', badgeText || '', actions, 'ness-badge');
    const minimize = ui.button('−', actions, undefined, 'icon quiet ness-minimize');
    minimize.setAttribute('aria-label', 'Свернуть окно');
    minimize.setAttribute('aria-expanded', 'true');
    minimize.title = 'Свернуть окно';
    const theme = ui.button('⚙', actions, () => openTheme(D, panel, theme), 'icon quiet');
    theme.setAttribute('aria-label', 'Цвета интерфейса');
    ui.tip(theme, 'Цвета всех окон: фон, поля, текст, линии и акцент.');
    const dismiss = ui.button('×', actions, undefined, 'icon quiet ness-close-dialog');
    dismiss.setAttribute('aria-label', 'Закрыть окно');
    dismiss.title = 'Закрыть окно';
    // Collapse and dismiss are independent. The close button stays accessible in both states.
    minimize.onclick = () => {
        if (panel.querySelector('[data-ness-child-dialog]')) return;
        const overlay = panel.parentElement;
        if (!overlay) return;
        const collapsed = overlay.dataset.minimized === 'true';
        if (collapsed) delete overlay.dataset.minimized;
        else overlay.dataset.minimized = 'true';
        panel.setAttribute('aria-modal', collapsed ? 'true' : 'false');
        minimize.textContent = collapsed ? '−' : '□';
        minimize.title = collapsed ? 'Свернуть окно' : 'Развернуть окно';
        minimize.setAttribute('aria-label', minimize.title);
        minimize.setAttribute('aria-expanded', String(collapsed));
        minimize.focus();
    };
    return { header, badge, dismiss };
}

export function createOwnedDialogShell(kind, { loadTheme, applyTheme }) {
    const overlay = document.createElement('div');
    overlay.id = 'sp-imagen-review-overlay';
    const theme = loadTheme();
    applyTheme(overlay, theme);
    const panel = document.createElement('div');
    panel.id = 'sp-imagen-review-panel';
    panel.className = 'ness-ui';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', ({ library: 'Библиотека персонажей', settings: 'Настройки генерации' })[kind] || 'Подготовка иллюстрации');
    panel.setAttribute('data-dialog', kind);
    applyTheme(panel, theme);
    let style = document.getElementById('sp-imagen-ui-style-v2');
    if (!style) {
        style = document.createElement('style');
        style.id = 'sp-imagen-ui-style-v2';
        (document.head || document.documentElement).appendChild(style);
    }
    if (style.textContent !== NESS_UI_CSS) style.textContent = NESS_UI_CSS;
    overlay.appendChild(panel);
    return { overlay, panel };
}

export function mountOwnedDialog(overlay, { onChatChanged, onCleanup } = {}) {
    const stopViewport = mountViewportOverlay(overlay);
    const st = globalThis.SillyTavern?.getContext?.();
    const event = st?.event_types?.CHAT_CHANGED;
    const emitter = st?.eventSource;
    if (onChatChanged && event) emitter?.on?.(event, onChatChanged);
    let stopped = false;
    return () => {
        if (stopped) return;
        stopped = true;
        if (onChatChanged && event) emitter?.removeListener?.(event, onChatChanged);
        stopViewport();
        onCleanup?.();
    };
}
