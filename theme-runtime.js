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


function parseCssRgb(value) {
    const source = String(value || '').trim();
    const hex = source.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
        const digits = hex[1].length === 3 ? [...hex[1]].map(c => c+c).join('') : hex[1];
        return [0,2,4].map(i => parseInt(digits.slice(i,i+2),16));
    }
    const rgb = source.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (rgb) return rgb.slice(1,4).map(Number);
    const srgb = source.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    if (srgb) return srgb.slice(1,4).map(v=>Math.round(Number(v)*255));
    return null;
}
function relativeLuminance(rgb) {
    const channel = n => {const v=Math.min(255,Math.max(0,n))/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
    return rgb ? .2126*channel(rgb[0])+.7152*channel(rgb[1])+.0722*channel(rgb[2]) : null;
}
function contrastRatio(a,b) {
    const first=relativeLuminance(a),second=relativeLuminance(b);
    if(first===null||second===null)return 0;
    return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);
}
// Respect readable theme colors; substitute a contrasting neutral only where needed.
// This changes rendered tokens without altering the user's saved palette.
export function readableNessColor(background,preferred='',secondary=false) {
    const bg=parseCssRgb(background),existing=parseCssRgb(preferred);
    if (!bg) return preferred || (secondary?'#d4d0d3':'#f8f6f2');
    if (existing && contrastRatio(bg,existing)>=4.5) return preferred;
    const dark=secondary?'#55515a':'#212026';
    const light=secondary?'#d4d0d3':'#f8f6f2';
    const preferredDark=contrastRatio(bg,parseCssRgb(dark))>=contrastRatio(bg,parseCssRgb(light));
    const choice=preferredDark?dark:light;
    if(contrastRatio(bg,parseCssRgb(choice))>=4.5)return choice;
    return contrastRatio(bg,[0,0,0])>=contrastRatio(bg,[255,255,255])?'#000000':'#ffffff';
}
function applyReadableNessColors(target) {
    const doc=target?.ownerDocument;
    if (!doc?.body || typeof globalThis.getComputedStyle!=='function') return;
    // The dialog shell can be themed before mounting. Resolve variables using
    // an attached probe so themes scoped to the body are represented correctly.
    const probe=doc.createElement('span');
    probe.style.cssText='position:fixed;left:-9999px;top:-9999px;pointer-events:none;visibility:hidden;';
    for(const key of [...SILLYTAVERN_COLOR_PROPERTIES,...Object.keys(NESS_THEME_DEFAULTS).map(k=>'--ness-'+k)]){
        const value=target.style.getPropertyValue(key);
        if(value)probe.style.setProperty(key,value);
    }
    doc.body.appendChild(probe);
    try {
        const resolve=expression=>{
            probe.style.backgroundColor=expression;
            return globalThis.getComputedStyle(probe).backgroundColor;
        };
        const inputText=()=>{
            probe.style.color='var(--ness-text)';
            return globalThis.getComputedStyle(probe).color;
        };
        const bg=resolve('var(--ness-bg)'),originalText=inputText();
        const text=readableNessColor(bg,originalText);
        if(text!==originalText&&parseCssRgb(bg)){
            target.style.setProperty('--ness-text',text);
            probe.style.setProperty('--ness-text',text);
        }
        probe.style.color='var(--ness-muted)';
        const originalMuted=globalThis.getComputedStyle(probe).color;
        const muted=readableNessColor(bg,originalMuted,true);
        if(muted!==originalMuted&&parseCssRgb(bg))target.style.setProperty('--ness-muted',muted);
        const surfaces={
            bg:'var(--ness-bg)',
            surface:'var(--ness-surface)',
            input:'var(--ness-input)',
            accent:'var(--ness-accent)',
            'library-card':'color-mix(in srgb,var(--ness-bg) 84%,#754632)',
            'library-pane':'color-mix(in srgb,var(--ness-bg) 88%,#643c31)',
            'library-chosen':'color-mix(in srgb,color-mix(in srgb,var(--ness-accent) 52%,#c88478) 20%,var(--ness-bg))',
            'library-cream':'color-mix(in srgb,var(--ness-text) 86%,#f2d7b3)',
        };
        for(const [key,expression]of Object.entries(surfaces)){
            const color=resolve(expression);
            if(!parseCssRgb(color))continue;
            const foreground=readableNessColor(color,originalText);
            target.style.setProperty('--ness-contrast-'+key,foreground);
            if(key==='input')target.style.setProperty('--ness-contrast-input-muted',readableNessColor(color,originalMuted,true));
        }
        if(parseCssRgb(bg))target.style.setProperty('color-scheme',relativeLuminance(parseCssRgb(bg))>.25?'light':'dark');
    } finally {
        probe.remove();
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
        applyReadableNessColors(target);
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
