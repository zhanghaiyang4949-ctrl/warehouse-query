const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const html=fs.readFileSync('index.html','utf8'),baseline=cp.execFileSync('git',['show','39e75d2:index.html'],{encoding:'utf8',maxBuffer:2e6}).replaceAll('\r\n','\n');
function setup(tailEnabled=false){
 const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{value:'',style:{},innerHTML:'',textContent:''});return elements.get(id);}
 el('sortDirection').value='asc';
 const events=new Map(),tail=require('../assets/query-tail').create();tail.configure({enabled:tailEnabled});
 const context=vm.createContext({WarehouseTrackingDisplay:require('../assets/tracking-display'),document:{getElementById:el,documentElement:{classList:{add(){}}},addEventListener(type,handler){events.set(type,handler);}},window:{WarehouseQueryTail:tail,addEventListener(){}},sessionStorage:{getItem:()=>''},setInterval(){},console,TextEncoder,crypto:require('node:crypto').webcrypto});
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(match[1].trim())vm.runInContext(match[1],context);
 vm.runInContext('loadData=async()=>{};payload={items:[{id:1,express:"11110001",last4:"0001",customer:"QA",date:"2026-11-10",pallet:"A-2"},{id:2,express:"22220002",last4:"0002",customer:"QA",date:"2026-11-11",pallet:"A-10"},{id:3,express:"33330003",last4:"0003",customer:"QB",date:"2026-11-12",pallet:"B-1"}],features:{batchQuery:true}};',context);
 return {el,tail,change(){events.get('warehouse-query-tail-change')();},run:script=>vm.runInContext(script,context)};
}
test('快速查询支持客户托盘筛选和自然排序，清空恢复结果',async()=>{
 const d=setup();d.el('quick').value='QA';await d.run('quickSearch()');assert.equal(d.run('currentItems.length'),2);assert.ok(d.el('palletFilter').innerHTML.includes('A-10'));
 d.el('palletFilter').value='A-2';d.run('renderCurrent()');assert.ok(!d.el('results').innerHTML.includes('22220002'));
 d.run('clearBatchFiltersV79()');d.el('sortField').value='pallet';d.el('sortDirection').value='desc';d.run('renderCurrent()');assert.ok(d.el('results').innerHTML.indexOf('22220002')<d.el('results').innerHTML.indexOf('11110001'));
});
test('批量默认保留原输入顺序和未找到项，排序同值稳定',async()=>{
 const d=setup();d.el('batch').value='0002\n9999\n0001';await d.run('batchSearch()');assert.equal(d.run('currentBatch.length'),3);
 assert.ok(d.el('results').innerHTML.includes('9999'));assert.ok(d.el('results').innerHTML.indexOf('22220002')<d.el('results').innerHTML.indexOf('11110001'));
 d.el('sortField').value='customer';d.run('renderCurrent()');assert.ok(d.el('results').innerHTML.indexOf('22220002')<d.el('results').innerHTML.indexOf('11110001'));
});
test('批量开关继续限制批量查询，但不阻止快速查询筛选',async()=>{
 const d=setup();d.run('payload.features.batchQuery=false');d.el('batch').value='0001';await d.run('batchSearch()');assert.equal(d.run('currentMode'),'none');d.el('quick').value='QA';await d.run('quickSearch()');assert.equal(d.el('batchFilterSortCardV78').style.display,'block');
});
test('匹配统一经过尾号规则，保留原结果排序与未找到显示及私有数据入口',()=>{
 assert.ok(html.includes('window.WarehouseQueryTail.matches(x,q)'));
 assert.ok(html.includes('window.WarehouseQueryTail.matches(x,line)'));
 const conserved=['currentBatch.forEach(function(e){','const arr=e.matches.filter(passFilters);','if(!e.matches.length){','if(a.inputIndex!==b.inputIndex)return a.inputIndex-b.inputIndex;','return a.matchIndex-b.matchIndex;','.filter(function(e){return !e.matches.length;})'];
 conserved.forEach(fragment=>{assert.ok(baseline.includes(fragment));assert.ok(html.includes(fragment));});
 assert.ok(!html.includes('./query-data.json'));assert.ok(!html.includes('payload.passwordHash'));
 assert.ok(html.includes('window.WarehouseQuery.lock("日期已变化，请重新登录")'));
});
test('尾号位数切换重算已提交查询，未提交编辑不影响结果',async()=>{
 const d=setup(true);d.el('quick').value='99990001';await d.run('quickSearch()');assert.equal(d.run('currentItems.length'),1);
 d.el('quick').value='0002';d.tail.configure({length:5});d.change();assert.equal(d.run('currentItems.length'),0);
 d.tail.configure({length:4});d.change();assert.equal(d.run('currentItems[0].id'),1);
 d.tail.configure({enabled:false});d.change();assert.equal(d.run('currentItems.length'),0);
});
test('批量尾号与普通模式均保留重复输入、原顺序及未找到，授权关闭后仍禁止',async()=>{
 const d=setup(true);d.el('batch').value='99990002\n9999\n0001\n0002';await d.run('batchSearch()');assert.equal(d.run('currentBatch.length'),4);
 assert.equal(d.run('currentBatch[0].matches[0].id'),2);assert.equal(d.run('currentBatch[1].matches.length'),0);
 d.tail.configure({enabled:false});d.change();assert.equal(d.run('currentBatch[0].matches.length'),0);assert.equal(d.run('currentBatch[3].matches[0].id'),2);
 d.run('payload.features.batchQuery=false');d.change();assert.equal(d.run('currentMode'),'none');assert.equal(d.run('currentBatch.length'),0);
});
