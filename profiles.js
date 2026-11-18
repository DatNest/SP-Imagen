// One source of truth for optional personal NovelAI composition profiles.
// Profiles are user-authored. Built-in director prompts are NOT profiles.
export const PROFILE_KINDS = Object.freeze({ all: 'Все форматы', snapshot: 'Snapshot', comic: 'Comic', story_page: 'Story Page' });
export const PROFILE_SWITCHES = Object.freeze({
  includeScene: ['События из чата', 'Передавать режиссёру события текущей сцены. Без этого он не сможет опираться на сюжет.'],
  includeCharacters: ['Внешность из библиотеки', 'Передавать описания выбранных персонажей. Лучше оставлять включённым.'],
  includeWardrobe: ['Текущая одежда', 'Передавать найденную в постах одежду.'],
  includeComposition: ['Пожелания к композиции', 'Учитывать ракурс кадра, расположение героев и панели.'],
  useDialogueSettings: ['Лимиты реплик из настроек', 'Для комикса и Story Page брать пределы реплик и слов из настроек генерации.'],
  useArtStyle: ['Выбранный стиль NovelAI', 'Добавлять активный стиль, если он задан в «Настройки → Стили».'],
  useNegativePrompt: ['Негативный промпт', 'Передавать нежелательные детали из настроек NovelAI (для модели Medium действует её собственное ограничение).'],
});
const DEFAULT_OPTIONS = Object.freeze(Object.fromEntries(Object.keys(PROFILE_SWITCHES).map(key => [key, true])));
export function normalizeProfile(input) {
  if (!input || typeof input !== 'object') return null;
  const id = String(input.id || '').trim();
  const name = String(input.name || '').trim();
  if (!/^[a-z0-9_-]{3,80}$/i.test(id) || !name) return null;
  return {
    id, name: name.slice(0, 100),
    kind: Object.hasOwn(PROFILE_KINDS, input.kind) ? input.kind : 'all',
    prompt: String(input.prompt || '').slice(0, 20000),
    options: Object.fromEntries(Object.keys(DEFAULT_OPTIONS).map(key => [key, input.options?.[key] !== false])),
  };
}
export function normalizeProfileStore(state) {
  const seen = new Set();
  const profiles = (Array.isArray(state?.customProfiles) ? state.customProfiles : []).map(normalizeProfile).filter(profile => {
    if (!profile || seen.has(profile.id)) return false;
    seen.add(profile.id); return true;
  });
  const activeProfiles = Object.fromEntries(['snapshot','comic','story_page'].map(kind => {
    const id = String(state?.activeProfiles?.[kind] || '');
    return [kind, profiles.some(p => p.id === id && (p.kind === 'all' || p.kind === kind)) ? id : ''];
  }));
  return { profiles, activeProfiles };
}
export function activeProfile(state, kind) {
  const {profiles,activeProfiles} = normalizeProfileStore(state);
  return profiles.find(p => p.id === activeProfiles[kind] && (p.kind === 'all' || p.kind === kind)) || null;
}
export function filterProfileSources(source,profile) {
  if (!profile) return source;
  const options = profile.options;
  return Object.fromEntries(Object.entries(source).map(([key,value]) => {
    const option = { 'RP POSTS':'includeScene', 'FIXED CHARACTER APPEARANCE':'includeCharacters', 'CURRENT WARDROBE':'includeWardrobe', 'COMPOSITION WISHES':'includeComposition' }[key];
    return [key, option && !options[option] ? '' : value];
  }));
}
export function directorProfileGuidance(profile) {
  if (!profile?.prompt?.trim()) return '';
  return '\n\nPERSONAL IMAGE COMPOSITION PREFERENCE (optional; output format, grounded RP facts, identities and safety constraints take priority):\n' + profile.prompt.trim() + '\nUse these preferences only where compatible with the established scene. Preserve the required <naicom> output contract, character sections and the final Text: block.';
}
export function applyProfileToPrompt(prompt,profile) {
  const instruction = String(profile?.prompt || '').trim();
  if (!instruction) return String(prompt || '');
  const text = String(prompt || '');
  // Inject ONLY into the base caption: never after Text:, never inside per-character sections.
  const firstCharacter = text.search(/\s\|\s*(?:girl|boy|cat|other)\s*,/i);
  const prefix = firstCharacter < 0 ? text : text.slice(0,firstCharacter);
  const suffix = firstCharacter < 0 ? '' : text.slice(firstCharacter);
  if (prefix.includes(instruction)) return text;
  return [instruction.replace(/[,;\s]+$/g,''),prefix.replace(/^\s*[,;]+\s*/,'')].filter(Boolean).join(', ') + suffix;
}
