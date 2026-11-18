// Theme integration for SP Imagen dialogs.
// Follow the active SillyTavern theme by default; use fixed colors only when
// the user explicitly chooses a custom SP Imagen palette.
import { NESS_THEME_DEFAULTS } from './shared-data.js';

const THEME_MODE_KEY = 'sp_imagen_ui_theme_mode';
const CUSTOM_THEME_KEY = 'sp_ness_ui_theme_v1';

const ACTIVE_THEME_TOKENS = Object.freeze({
    bg: 'var(--SmartThemeBlurTintColor, #1c1d23)',
    surface: 'color-mix(in srgb, var(--SmartThemeBlurTintColor, #24252d) 89%, var(--SmartThemeBodyColor, #edeaf1) 11%)',
    input: 'color-mix(in srgb, var(--SmartThemeBlurTintColor, #17181e) 92%, #000 8%)',
    border: 'var(--SmartThemeBorderColor, #3b3b46)',
    text: 'var(--SmartThemeBodyColor, #edeaf1)',
    muted: 'var(--SmartThemeEmColor, #a8a4b4)',
    accent: 'var(--SmartThemeQuoteColor, #c4b3db)',
    danger: 'var(--SmartThemeWarnColor, #df9d9f)',
});

export function normalizeNessTheme(value) {
    const theme = { ...NESS_THEME_DEFAULTS };
    for (const key of Object.keys(theme)) {
        if (/^#[0-9a-f]{6}$/i.test(value?.[key] || '')) theme[key] = value[key];
    }
    return theme;
}

export function loadNessTheme() {
    try {
        const global = globalThis.SillyTavern?.getContext?.()?.extensionSettings?.variables?.global;
        // Legacy custom colors should not override the active chat's theme
        // unless the user opts into SP Imagen's own palette in this release.
        if (global?.[THEME_MODE_KEY] !== 'custom') return null;
        const value = global[CUSTOM_THEME_KEY];
        return normalizeNessTheme(typeof value === 'string' ? JSON.parse(value) : value);
    } catch {
        return null;
    }
}

const SILLYTAVERN_COLOR_PROPERTIES = [
    '--SmartThemeBlurTintColor',
    '--SmartThemeBodyColor',
    '--SmartThemeBorderColor',
    '--SmartThemeQuoteColor',
    '--SmartThemeEmColor',
    '--SmartThemeWarnColor',
];

function matchBodyScopedTheme(target) {
    // Viewport overlays intentionally live under <html> (not transformed <body>).
    // Some user themes put their CSS variables on body only. Carry those values
    // into the overlay so its colors still match the active chat's CSS theme.
    const doc = target?.ownerDocument;
    if (!doc?.body || !doc?.documentElement || typeof globalThis.getComputedStyle !== 'function') return;
    const bodyStyle = globalThis.getComputedStyle(doc.body);
    const rootStyle = globalThis.getComputedStyle(doc.documentElement);
    for (const property of SILLYTAVERN_COLOR_PROPERTIES) {
        const bodyValue = bodyStyle.getPropertyValue(property).trim();
        const rootValue = rootStyle.getPropertyValue(property).trim();
        if (bodyValue && bodyValue !== rootValue) target.style.setProperty(property, bodyValue);
        else target.style.removeProperty(property);
    }
}

export function applyNessTheme(panel, theme) {
    const palette = theme ? normalizeNessTheme(theme) : ACTIVE_THEME_TOKENS;
    const targets = [panel];
    if (panel?.id === 'sp-imagen-review-panel' && panel.parentElement?.id === 'sp-imagen-review-overlay') {
        targets.push(panel.parentElement);
    }
    for (const target of targets) {
        if (!target?.style) continue;
        if (!theme) matchBodyScopedTheme(target);
        for (const [key, value] of Object.entries(palette)) {
            const name = `--ness-${key}`;
            if (target.style.getPropertyValue(name) !== value) target.style.setProperty(name, value);
        }
    }
}

function hexFromRgb(value, fallback) {
    if (!value || typeof value !== 'string') return fallback;
    const valueHex = value.trim().match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
    if (valueHex) {
        const v = valueHex[1];
        return ('#' + (v.length === 3 ? [...v].map(x => x + x).join('') : v)).toLowerCase();
    }
    const m = value.match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i);
    if (!m) return fallback;
    return '#' + m.slice(1, 4).map(n => Math.min(255, Math.max(0, Math.round(Number(n)))).toString(16).padStart(2, '0')).join('');
}

export function activeNessThemeForEditor(D = globalThis.document) {
    const result = { ...NESS_THEME_DEFAULTS };
    const source = D?.body || D?.documentElement;
    if (!source || typeof globalThis.getComputedStyle !== 'function') return result;
    const computed = globalThis.getComputedStyle(source);
    const mapping = {
        bg: '--SmartThemeBlurTintColor',
        surface: '--SmartThemeBlurTintColor',
        input: '--SmartThemeBlurTintColor',
        border: '--SmartThemeBorderColor',
        text: '--SmartThemeBodyColor',
        muted: '--SmartThemeEmColor',
        accent: '--SmartThemeQuoteColor',
        danger: '--SmartThemeWarnColor',
    };
    for (const [key, property] of Object.entries(mapping)) {
        result[key] = hexFromRgb(computed.getPropertyValue(property), result[key]);
    }
    return result;
}

export function themeSettingsLocation() {
    const st = globalThis.SillyTavern?.getContext?.();
    if (!st?.extensionSettings || typeof st.saveSettingsDebounced !== 'function') {
        throw Error('Сохранение настроек интерфейса недоступно.');
    }
    st.extensionSettings.variables ||= {};
    st.extensionSettings.variables.global ||= {};
    return { st, global: st.extensionSettings.variables.global };
}

export const NESS_THEME_MODE_KEY = THEME_MODE_KEY;
export const NESS_CUSTOM_THEME_KEY = CUSTOM_THEME_KEY;
