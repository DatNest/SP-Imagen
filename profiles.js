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
  const directorPrompt = String(input.directorPrompt || '');
  // Never silently truncate an instruction: a partial director can break the
  // output contract and cause costly failed generations.
  if (directorPrompt.length > 100000) return null;
  return {
    id, name: name.slice(0, 100),
    kind: Object.hasOwn(PROFILE_KINDS, input.kind) ? input.kind : 'all',
    prompt: String(input.prompt || '').slice(0, 20000),
    // Only a format-specific user copy may replace one director. Legacy personal
    // style prompts remain independent and continue to work across all formats.
    directorPrompt: input.kind && input.kind !== 'all' ? directorPrompt : '',
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
  const rule = String(profile?.prompt || '').trim();
  if (!rule) return '';
  // User-authored instructions shape the director output. They are NOT literal
  // NAI5 tags and must never be prepended to its final image prompt.
  return '\n\nOPTIONAL USER IMAGE COMPOSITION INSTRUCTIONS FOR THE DIRECTOR\n' +
    'Apply the following user preferences while writing the image description, only when consistent with established RP facts, source appearance, current wardrobe and the selected format. ' +
    'Translate requested framing, composition and mood into concrete visible image content; DO NOT quote, copy or prepend these instructions themselves to the final NAI5 prompt. ' +
    'The resulting image prompt must still begin with the required subject-count and format tags, followed by the established base scene and separate | character sections. ' +
    'Preserve the exact HTML/JSON output contract and terminal Text: position.\nUSER PREFERENCES:\n' + rule;
}
