(function(root){
 'use strict';
 function decode(packed,inflate=root.pako?.ungzip){
  if(packed.encoding!=='gzip-base64'||typeof packed.content!=='string'||packed.content.length>4*1024*1024||typeof inflate!=='function')throw Error('查询加载组件或数据格式无效，请刷新页面');
  const bytes=Uint8Array.from(atob(packed.content),char=>char.charCodeAt(0)),data=JSON.parse(inflate(bytes,{to:'string'}));
  if(!Array.isArray(data.items)||!data.revision||data.revision!==packed.revision)throw Error('查询数据版本无效，请重新登录');
  return data;
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={decode};else root.WarehouseQuerySnapshot={decode};
})(typeof window!=='undefined'?window:globalThis);
