const test=require('node:test'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib');
const {decode}=require('../assets/query-snapshot'),{ungzip}=require('../assets/vendor/pako_inflate-2.1.0.min');
test('一次压缩加载保留中文、单号原值、图片及查询配置',()=>{
 const value={revision:'one',items:[{express:'车入suki261112',photos:[{id:'image',note:'箱子'}]},{express:'000012345678'}],features:{batchQuery:true}};
 const result=decode({encoding:'gzip-base64',revision:'one',content:gzipSync(JSON.stringify(value)).toString('base64')},ungzip);assert.deepEqual(result,value);
});
test('压缩加载版本不匹配和损坏数据不能作为查询结果',()=>{
 assert.throws(()=>decode({encoding:'gzip-base64',revision:'two',content:gzipSync(JSON.stringify({revision:'one',items:[]})).toString('base64')},ungzip));
 assert.throws(()=>decode({encoding:'gzip-base64',revision:'one',content:'invalid'},ungzip));
});
