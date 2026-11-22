import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpImagenLibraryRuntime} from '../library-runtime.js';

const run=createSpImagenLibraryRuntime();
const icon='data:image/webp;base64,UklGRg==';

test('Optional cropped icons survive library normalization without changing legacy character data',()=>{
 const original={version:1,personas:{ji:{name:'Джи',aliases:['Ji'],base:'freckles, golden earrings;',libraryIconData:icon}},characters:{}};
 const validated=run.utilities.validateMasterLibrary(original);
 assert.equal(validated.personas.ji.libraryIconData,icon);
 assert.equal(validated.personas.ji.base,original.personas.ji.base);
 assert.deepEqual(validated.personas.ji.aliases,['Ji']);
});

test('Untrusted external image addresses cannot be stored as prompt/library icon data',()=>{
 const data={version:1,personas:{},characters:{aang:{name:'Аанг',base:'blue arrow tattoos',libraryIconData:'https://example.org/image.png'}}};
 assert.throws(()=>run.utilities.validateMasterLibrary(data),/Некорректная иконка/);
});

test('Character icon data is not inserted into the prompt snapshot or generic text fields',()=>{
 const source=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
 assert.match(source,/entry:\{appearanceRanges,appearanceSelections,appearanceCatalog,libraryIconData,\.\.\.entry\}/);
 assert.match(source,/key!=='libraryIconData'/);
 assert.match(source,/openCharacterIconEditor/);
});
