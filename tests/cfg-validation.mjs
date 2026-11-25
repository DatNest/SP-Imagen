import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCfgNumber, cfgValidationErrors, normalizeNovelAISettings, resolveSnapshotCfg, generateNovelAI } from '../novelai.js';

test('CFG accepts numbers and localized decimal strings, including zero', () => {
    for (const [input, expected] of [[7,7],['7',7],['7,5',7.5],['7.5',7.5],['0,25',0.25],[0,0],[' 10 ',10]]) {
        assert.equal(parseCfgNumber(input), expected);
    }
    for (const value of [null,undefined,'',' ','7,5,2','7foo',true,{},Infinity,NaN]) {
        assert.ok(Number.isNaN(parseCfgNumber(value)));
    }
    assert.deepEqual(cfgValidationErrors(normalizeNovelAISettings({cfgScale:'7,5',cfgRescale:'0,25'})), []);
    assert.deepEqual(cfgValidationErrors(normalizeNovelAISettings({cfgScale:10,cfgRescale:1})), []);
    assert.equal(cfgValidationErrors(normalizeNovelAISettings({cfgScale:11,cfgRescale:-1})).length,2);
    assert.equal(cfgValidationErrors(normalizeNovelAISettings({cfgScale:null,cfgRescale:''})).length,2);
});

test('invalid historical CFG falls back to valid current settings; valid historical values and other fields survive', () => {
    const saved = normalizeNovelAISettings({cfgScale:7,cfgRescale:0});
    const damaged = {cfgScale:15,cfgRescale:null,steps:28,sampler:'k_dpmpp_2m'};
    assert.deepEqual(resolveSnapshotCfg(saved,damaged),{...damaged,cfgScale:7,cfgRescale:0});
    assert.equal(damaged.cfgScale,15);
    assert.deepEqual(resolveSnapshotCfg(saved,{cfgScale:5,cfgRescale:'0,2'}),{cfgScale:5,cfgRescale:'0,2'});
    assert.deepEqual(resolveSnapshotCfg(saved,{}),{});
    assert.equal(resolveSnapshotCfg({cfgScale:11},{cfgScale:15}).cfgScale,15);
});

test('generation sends finite numeric CFG fields and rejects invalid ones before network', async () => {
    const original = globalThis.fetch;
    let calls=0;
    globalThis.fetch = async (_url, options) => {
        calls++;
        const payload=JSON.parse(options.body);
        assert.equal(payload.parameters.scale,7.5);
        assert.equal(payload.parameters.cfg_rescale,0);
        return new Response(JSON.stringify({images:['AAAA']}),{headers:{'content-type':'application/json'}});
    };
    try {
        const settings = {apiKey:'test-only',neverSpendAnlas:false,cfgScale:'7,5',cfgRescale:0};
        await generateNovelAI({settings,prompt:'test'});
        await assert.rejects(generateNovelAI({settings:{...settings,cfgScale:11},prompt:'test'}),/CFG scale/);
        assert.equal(calls,1);
    } finally { globalThis.fetch=original; }
});
