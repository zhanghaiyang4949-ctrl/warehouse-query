const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const html=fs.readFileSync('index.html','utf8'),baseline=cp.execFileSync('git',['show','39e75d2:index.html'],{encoding:'utf8',maxBuffer:2e6}).replaceAll('\r\n','\n');
function setup(){
 const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{value:'',style:{},innerHTML:'',textContent:''});return elements.get(id);}
 el('sortDirection').value='asc';
 const context=vm.createContext({document:{getElementById:el,documentElement:{classList:{add(){}}},addEventListener(){}},window:{addEventListener(){}},sessionStorage:{getItem:()=>''},setInterval(){},console,TextEncoder,crypto:require('node:crypto').webcrypto});
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(match[1].trim())vm.runInContext(match[1],context);
 vm.runInContext('loadData=async()=>{};payload={items:[{id:1,express:"11110001",last4:"0001",customer:"QA",date:"2026-11-10",pallet:"A-2"},{id:2,express:"22220002",last4:"0002",customer:"QA",date:"2026-11-11",pallet:"A-10"},{id:3,express:"33330003",last4:"0003",customer:"QB",date:"2026-11-12",pallet:"B-1"}],features:{batchQuery:true}};',context);
 return {el,run:script=>vm.runInContext(script,context)};
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
test('原快速及批量匹配代码保持不变，旧公共数据读取已删除',()=>{
 const originalQuick=baseline.match(/currentItems=\(payload.items\|\|\[\]\)\.filter\(x=>\{[\s\S]*?\n \}\);/)[0];assert.ok(html.includes(originalQuick));
 const originalBatch=baseline.match(/const lines=String\(document.getElementById\("batch"\)[\s\S]*?\n buildFilters\(\);/)[0];assert.ok(html.includes(originalBatch));
 assert.ok(!html.includes('./query-data.json'));assert.ok(!html.includes('payload.passwordHash'));
 assert.ok(html.includes('window.WarehouseQuery.lock("日期已变化，请重新登录")'));
});
