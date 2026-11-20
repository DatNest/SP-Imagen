// Streaming is a per-SP Imagen text request option, not a SillyTavern global toggle.
// Run: node --experimental-default-type=module --test tests/streaming-scope.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTextApiSettings, normalizeTextApiSettings, generateTextCompletion } from '../text-api.js';

test('Streaming defaults to off and persists as a boolean in SP Imagen settings', () => {
  assert.equal(defaultTextApiSettings().streaming, false);
  assert.equal(normalizeTextApiSettings({streaming: true}).streaming, true);
  assert.equal(normalizeTextApiSettings({streaming: false}).streaming, false);
});

test('Direct API only changes the stream flag of the individual SP Imagen request', {concurrency:false}, async () => {
  const originalFetch = globalThis.fetch;
  const observed = [];
  try {
    globalThis.fetch = async (_url, options) => {
      const payload = JSON.parse(options.body);
      observed.push({stream:payload.stream, accept:options.headers.Accept});
      if(!payload.stream) return {ok:true,json:async()=>({choices:[{message:{content:'OK'}}]})};
      const nl=String.fromCharCode(10);
      const parts = [new TextEncoder().encode('data: {"choices":[{"delta":{"content":"OK"}}]}' + nl + nl + 'data: [DONE]' + nl + nl)];
      return {ok:true,body:{getReader:()=>({
        read:async()=>parts.length ? {done:false,value:parts.shift()} : {done:true},
        cancel:async()=>{}, releaseLock(){},
      })}};
    };
    const base={mode:'direct', endpoint:'https://example.invalid/v1', model:'mock', apiKey:'test'};
    for(const streaming of [false,true]){
      const answer=await generateTextCompletion({...base,streaming},[{role:'user',content:'OK'}]);
      assert.equal(answer,'OK');
    }
    assert.deepEqual(observed,[
      {stream:false,accept:'application/json'},
      {stream:true,accept:'text/event-stream'},
    ]);
  } finally {
    globalThis.fetch=originalFetch;
  }
});

test('SillyTavern profile streaming is passed per request without changing chat settings', async () => {
  const observed=[];
  const context={
    extensionSettings:{connectionManager:{profiles:[{id:'profile-test'}]},power_user:{streaming_enabled:true}},
    ConnectionManagerRequestService:{
      getProfile:()=>({id:'profile-test'}),
      validateProfile:()=>({selected:'openai'}),
      async sendRequest(profileId,messages,maxTokens,requestSettings){
        observed.push({profileId,stream:requestSettings.stream,includePreset:requestSettings.includePreset});
        return requestSettings.stream ? async function*(){yield {text:'O'};yield {text:'OK'};} : 'OK';
      },
    },
  };
  const before=JSON.stringify(context.extensionSettings);
  for(const streaming of [false,true]){
    const answer=await generateTextCompletion({mode:'st',profileId:'profile-test',streaming},
      [{role:'user',content:'OK'}],undefined,context);
    assert.equal(answer,'OK');
  }
  assert.deepEqual(observed,[
    {profileId:'profile-test',stream:false,includePreset:false},
    {profileId:'profile-test',stream:true,includePreset:false},
  ]);
  assert.equal(JSON.stringify(context.extensionSettings),before);
});
