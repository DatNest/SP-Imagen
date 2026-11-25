import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all packaged bundle versions match the manifest',()=>{
    const version=JSON.parse(read('manifest.json')).version;
    for (const [path,pattern] of [
        ['index.js',/\bSP_IMAGEN_BUNDLE_VERSION\s*=\s*['"]([^'"]+)['"]/],
        ['library-runtime.js',/\bbundleVersion\s*:\s*['"]([^'"]+)['"]/],
        ['media-slots.js',/\bbundleVersion\s*:\s*['"]([^'"]+)['"]/],
    ]) {
        const found=read(path).match(pattern);
        assert.ok(found,path+' must declare its bundle version');
        assert.equal(found[1],version,path+' must match manifest.json');
    }
});
