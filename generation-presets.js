import {normalizeNovelAISettings,sanitizeStylePreset,resolveSnapshotCfg} from './novelai.js';
import {normalizeNaisteraSettings} from './naistera.js';

const directKeys=['model','mode','resolution','steps','cfgScale','cfgRescale','sampler','noiseSchedule','seed','skipCfgAboveSigma','negativePrompt'];
const proxyKeys=['model','steps','cfgScale','cfgRescale','sampler','negativePrompt'];
const providerOf=value=>value==='naistera'?'naistera':'novelai';
const publicFields=(provider,settings)=>Object.fromEntries((provider==='naistera'?proxyKeys:directKeys).map(k=>[k,settings[k]]));
export const activeGenerationStyle=state=>state.novelai.styles.find(s=>s.id===state.novelai.activeStyleId)||null;
export function presetFromSettings(state,provider=state.imageProvider,overrides={}){
 provider=providerOf(provider);
 const source={...state[provider],...overrides};
 // Do not run full style normalization for every preset.
 delete source.styles;delete source.activeStyleId;
 const normalized=provider==='naistera'?normalizeNaisteraSettings(source):normalizeNovelAISettings(source);
 return {provider,settings:publicFields(provider,normalized)};
}
export function normalizeStylePresets(state){
 state.quickStyleSwitch=state.quickStyleSwitch!==false;
 state.novelai.styles=state.novelai.styles.map(style=>{
  const saved=sanitizeStylePreset(style.preset);
  return {...style,preset:saved?presetFromSettings(state,saved.provider,saved.settings):presetFromSettings(state)};
 });
 return state;
}
export function resolveGenerationPreset(state,config,{reuseSnapshot=false,useActiveStyle=false}={}){
 const snapshot=reuseSnapshot&&!useActiveStyle?config?.spImagenDirect:null;
 const style=activeGenerationStyle(state);
 const selected=style?.preset;
 const provider=snapshot?providerOf(snapshot.provider):providerOf(selected?.provider||state.imageProvider);
 const current=state[provider];
 const override=snapshot?{...(snapshot.settings||{}),...(provider==='novelai'?{mode:snapshot.settings?.mode||'anime'}:{})}:selected?.settings||{};
 const merged={...current,...resolveSnapshotCfg(current,override),apiKey:current.apiKey};
 if(provider==='novelai'){
  merged.endpoint=current.endpoint;merged.enabled=true;
  // Safety is global, never changed by a style or by historical image metadata.
  merged.neverSpendAnlas=current.neverSpendAnlas;
  delete merged.styles;delete merged.activeStyleId;
 }
 const settings=provider==='naistera'?normalizeNaisteraSettings(merged):normalizeNovelAISettings(merged);
 return {provider,settings,snapshot};
}
export function publicGenerationSettings(provider,settings){
 return {...publicFields(provider,settings),...(provider==='novelai'?{neverSpendAnlas:settings.neverSpendAnlas}:{})};
}
