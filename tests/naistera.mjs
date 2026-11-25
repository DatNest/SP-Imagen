import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNaisteraSettings, validateNaisteraSettings, imageProvider, publicNaisteraSettings, buildNaisteraPayload, generateNaistera, checkNaisteraConnection } from '../naistera.js';

const rule=(min,max)=>({min,max});
const full={id:'novelai-v5',negative_prompt:true,parameters:{steps:rule(1,23),scale:rule(0,10),cfg_rescale:rule(0,1),sampler:{choices:['k_euler_ancestral','k_dpmpp_2m']}}};
const medium={id:'novelai-v5-medium',negative_prompt:false,parameters:{steps:rule(14,14),scale:rule(0,10),sampler:{choices:['k_euler_ancestral']}}};
const s=normalizeNaisteraSettings({apiKey:'TEST_PROXY',cfgScale:'7,5',cfgRescale:'0,2',negativePrompt:'bad hands'});
const prompt='1girl, wide panel | girl, Alice, looking at Bob\n\nText: "Hello"';
const png='data:image/png;base64,AAAA';

test('provider selection preserves historical requests and excludes credentials',()=>{
    const state={imageProvider:'naistera'};
    assert.equal(imageProvider({}),'novelai');
    assert.equal(imageProvider(state),'naistera');
    assert.equal(imageProvider(state,{},true),'novelai');
    assert.equal(imageProvider(state,{spImagenDirect:{provider:'novelai'}},true),'novelai');
    assert.equal(imageProvider({}, {spImagenDirect:{provider:'naistera'}},true),'naistera');
    assert.equal(imageProvider({}, {spImagenDirect:{provider:'naistera'}}),'naistera');
    assert.ok(!Object.hasOwn(publicNaisteraSettings(s),'apiKey'));
    assert.throws(()=>validateNaisteraSettings({...s,apiKey:'pst-example'}),/токен NAISTERA/);
});

test('payload keeps prompt, lettering, style and decimal CFG unchanged',()=>{
    assert.deepEqual(buildNaisteraPayload(s,full,prompt,'watercolor','2:3'),{
        prompt:'watercolor, '+prompt,aspect_ratio:'2:3',model:'novelai-v5',
        steps:23,scale:7.5,sampler:'k_euler_ancestral',cfg_rescale:0.2,negative_prompt:'bad hands'
    });
    const m=buildNaisteraPayload({...s,model:medium.id,steps:50,sampler:'k_dpmpp_2m'},medium,prompt,'','16:9');
    assert.equal(m.steps,14);assert.equal(m.sampler,'k_euler_ancestral');
    assert.ok(!Object.hasOwn(m,'negative_prompt')&&!Object.hasOwn(m,'cfg_rescale'));
    assert.throws(()=>buildNaisteraPayload({...s,steps:24},full,prompt,'','2:3'),/Steps/);
});

test('catalog and generation use only fixed HTTPS endpoints; POST never retries',async()=>{
    const old=globalThis.fetch;const calls=[];let mode='ok';
    globalThis.fetch=async(url,options)=>{
        calls.push({url,options});
        assert.equal(options.headers.Authorization,'Bearer TEST_PROXY');
        assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
        if(url.endsWith('/api/models'))return Response.json({authenticated:true,models:[full,medium]});
        assert.equal(url,'https://naistera.org/api/generate');
        if(mode==='fail')return new Response('secret echoed', {status:500});
        if(mode==='unsafe')return Response.json({data_url:'https://untrusted.example/img'});
        return Response.json({data_url:png});
    };
    try {
        assert.deepEqual(await checkNaisteraConnection(s),[full.id,medium.id]);
        const result=await generateNaistera({settings:s,prompt,style:'watercolor'});
        assert.equal(result.src,png);assert.equal(result.seed,null);
        assert.ok(!Object.hasOwn(result.settings,'apiKey'));
        const body=JSON.parse(calls.at(-1).options.body);
        assert.equal(body.prompt,'watercolor, '+prompt);
        mode='fail';await assert.rejects(generateNaistera({settings:s,prompt}),/HTTP 500/);
        mode='unsafe';await assert.rejects(generateNaistera({settings:s,prompt}),/изображение/);
        assert.equal(calls.filter(x=>x.options.method==='POST').length,3);
        const count=calls.length;
        await assert.rejects(generateNaistera({settings:{...s,apiKey:'pst-example'},prompt}),/токен NAISTERA/);
        assert.equal(calls.length,count);
    }finally{globalThis.fetch=old;}
});

test('async result polls only the original job, never resubmits generation',async()=>{
    const old=globalThis.fetch;const calls=[];
    globalThis.fetch=async(url,options)=>{
        calls.push({url,method:options.method});
        if(url.endsWith('/api/models'))return Response.json({authenticated:true,models:[full]});
        if(url.endsWith('/api/generate'))return Response.json({job_id:'job-123',status:'queued'});
        assert.equal(url,'https://naistera.org/api/generate/jobs/job-123');
        return Response.json({status:'completed',data_url:png});
    };
    try {
        assert.equal((await generateNaistera({settings:s,prompt})).src,png);
        assert.deepEqual(calls.map(c=>c.method),['GET','POST','GET']);
    }finally{globalThis.fetch=old;}
});
