const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../assets/query-tail.js');
function storage(value) { return { value, getItem() { return this.value; }, setItem(k, v) { this.value = v; } }; }
test('default tail4 matches suffix only and accepts full tracking input', () => {
 const api = create();
 assert.deepEqual(api.settings(), { enabled: true, length: 4 });
 assert.equal(api.matches({ express: '12345678', customer: '5678' }, '5678'), true);
 assert.equal(api.matches({ express: '12345678' }, '99995678'), true);
 assert.equal(api.matches({ express: '56789999', customer: '5678', pallet: '5678' }, '5678'), false);
 assert.equal(api.matches({ express: '12345678' }, '678'), false);
 assert.equal(api.matches({ express: '12345678' }, ''), false);
});
test('length and enabled settings persist; disabled restores original general matching', () => {
 const store = storage(null), api = create({ storage: store });
 api.configure({ length: 6 }); assert.equal(api.key('ABC123456'), '123456');
 assert.equal(api.matches({ express: 'ZZ123456' }, '123456'), true);
 assert.equal(api.matches({ express: 'ZZ123456' }, '3456'), false);
 api.configure({ enabled: false });
 assert.equal(api.matches({ express: 'AB123CD' }, '123'), true);
 assert.equal(api.matches({ customer: '客户甲' }, '客户'), true);
 assert.equal(api.matches({ pallet: 'A-12' }, 'A-'), true);
 assert.equal(api.key('  客户甲 '), '客户甲');
 assert.deepEqual(create({ storage: store }).settings(), { enabled: false, length: 6 });
});
test('malformed or unavailable storage safely uses defaults; invalid lengths ignored', () => {
 for (const value of ['bad', 'null', '{"enabled":"false","length":0}', '{"length":999}']) {
  assert.deepEqual(create({ storage: storage(value) }).settings(), { enabled: true, length: 4 });
 }
 const api = create({ storage: { getItem() { throw Error(); }, setItem() { throw Error(); } } });
 api.configure({ length: 5, enabled: false });
 api.configure({ length: 2.5 }); assert.deepEqual(api.settings(), { enabled: false, length: 5 });
});
test('last4 fallback never fabricates longer tracking suffixes', () => {
 const api = create(); assert.equal(api.matches({ last4: '0123' }, '0123'), true);
 api.configure({ length: 6 }); assert.equal(api.matches({ last4: '0123' }, '0123'), false);
 assert.equal(api.matches({ express: '999999', last4: '0123' }, '0123'), false);
});

test('tail mode normalizes displayed separators, whitespace and letter case; general search remains unchanged',()=>{const api=require('../assets/query-tail').create({});api.configure({length:8});assert.equal(api.matches({express:'12345678'},'1234-5678'),true);api.configure({length:4});assert.equal(api.matches({express:'ABCD'},'abcd'),true);api.configure({enabled:false});assert.equal(api.matches({express:'ABCD'},'abcd'),false);});
