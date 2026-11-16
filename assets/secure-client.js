(function(root){
 'use strict';
 const config=root.WarehouseQueryConfig||{},$=id=>document.getElementById(id);
 const deviceKey='warehouseQueryDeviceV1',sessionKey='warehouseQuerySessionV1';
 let identity,session=null,pollTimer,checkTimer,expiryTimer,waitingPassword='',loginBusy=false,epoch=0;
 let dataLoading=null,lastCheckedAt=0,searchedQuickQuery='';
 const imageURLs=new Map(),imageLoads=new Map();
 try{identity=JSON.parse(localStorage.getItem(deviceKey)||'null');}catch{}
 if(!identity?.id||!identity?.secret){identity={id:crypto.randomUUID(),secret:Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join(''),name:''};localStorage.setItem(deviceKey,JSON.stringify(identity));}
 $('personName').value=identity.name||'';
 function endpoint(){const url=new URL(config.endpoint);if(url.protocol!=='https:'&&!(config.test&&url.hostname==='127.0.0.1'))throw Error('查询接口必须使用HTTPS');return url.href;}
 function credentials(){return {deviceId:identity.id,deviceSecret:identity.secret};}
 function clearImages(){root.WarehousePhotoGallery?.close();for(const url of imageURLs.values())URL.revokeObjectURL(url);imageURLs.clear();imageLoads.clear();}
 function lock(message){
  epoch++;session=null;waitingPassword='';dataLoading=null;lastCheckedAt=0;searchedQuickQuery='';sessionStorage.removeItem(sessionKey);sessionStorage.removeItem('queryLoginDay');
  clearTimeout(pollTimer);clearTimeout(expiryTimer);clearInterval(checkTimer);clearImages();payload=null;currentItems=[];currentBatch=[];currentMode='none';
  $('results').innerHTML='<div class="muted">请输入单号查询</div>';$('app').style.display='none';$('loginBox').style.display='block';$('pwd').value='';$('loginMsg').textContent=message||'';
 }
 async function call(action,args={}){
  const own=epoch,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  try{
   const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({action,args}),signal:controller.signal,cache:'no-store'});
   const result=await response.json();
   if(own!==epoch)throw Error('页面登录状态已改变');
   if(!response.ok||!result.ok){const error=Object.assign(Error(result.message||'查询请求失败'),{code:result.code});if(error.code==='ACCESS_DENIED'&&session)lock(error.message);throw error;}
   return result.data;
  }catch(error){
   if(own===epoch&&session&&(!error.code||error.code==='ORIGIN_DENIED'))lock('暂时无法验证登录权限，请恢复连接后重新登录');
   if(error.name==='AbortError')throw Error('网络连接超时，请重试');throw error;
  }finally{clearTimeout(timer);}
 }
 function rebuildMatches(){
  if(currentMode==='quick'){
   const q=searchedQuickQuery;
   currentItems=payload.items.filter(x=>root.WarehouseQueryTail.matches(x,q));
  }else if(currentMode==='batch'){
   currentBatch=currentBatch.map(e=>({...e,key:root.WarehouseQueryTail.key(e.line),matches:payload.items.filter(x=>root.WarehouseQueryTail.matches(x,e.line))}));
  }
 }
 function paintMeta(){if(session&&payload)$('meta').textContent='人员：'+session.name+' · 数据更新：'+(payload.updatedAt?new Date(payload.updatedAt).toLocaleString():'未记录')+' · 在库 '+payload.items.length+' 件';}
 function applySnapshot(packed){payload=root.WarehouseQuerySnapshot.decode(packed);rebuildMatches();paintMeta();}
 async function loadPaged(){
  if(!session)throw Error('请先登录并等待审核');
  for(let attempt=0;attempt<2;attempt++){
   const own=epoch;let offset=0,revision='',items=[],first;
   try{
    do{
     const page=await call('data',{offset,revision});if(own!==epoch)throw Error('登录已改变');
     if(!first)first=page;
     if(revision&&revision!==page.revision)throw Object.assign(Error('查询版本已改变'),{code:'REVISION_CHANGED'});
     revision=page.revision;items.push(...page.items);const next=page.nextOffset;
     if(next!==null&&(!Number.isSafeInteger(next)||next<=offset))throw Error('查询分页异常');offset=next;
    }while(offset!==null);
    payload={items,updatedAt:first.updatedAt,features:first.features,revision};rebuildMatches();
    paintMeta();return;
   }catch(error){if(error.code!=='REVISION_CHANGED'||attempt===1)throw error;}
  }
 }
 function loadData(){
  if(!session)return Promise.reject(Error('请先登录并等待审核'));
  if(dataLoading)return dataLoading;
  const own=epoch;
  const pending=(async()=>{
   const result=await call('compactData',{revision:payload?.revision||''});if(own!==epoch||!session)throw Error('登录已改变');
   if(result.unchanged){if(!payload||result.revision!==payload.revision)throw Error('查询版本不一致，请重新登录');}
   else if(result.paged)await loadPaged();else applySnapshot(result);
   if(own===epoch)lastCheckedAt=Date.now();
  })().catch(error=>{if(own===epoch&&session&&!error.code)lock(error.message);throw error;});
  dataLoading=pending;
  return pending.finally(()=>{if(dataLoading===pending)dataLoading=null;});
 }
 function backgroundRefresh(){
  if(document.hidden||!session||!payload||dataLoading||Date.now()-lastCheckedAt<5000)return;
  const own=epoch;
  paintMeta();$('meta').textContent+=' · 正在核对更新';
  loadData().then(()=>{if(own!==epoch||!payload)return;buildFilters();if(currentMode!=='none')renderCurrent();}).catch(error=>{
   if(own!==epoch||!session)return;
   if(!['SOURCE_TIMEOUT','SOURCE_UNAVAILABLE'].includes(error.code)){lock('暂时无法验证登录权限，请恢复连接后重新登录');return;}
   lastCheckedAt=Date.now();paintMeta();$('meta').textContent+=' · 后台刷新暂未完成';
  });
 }
 async function openApp(result){
  session={token:result.token,name:result.name,expiresAt:result.expiresAt};sessionStorage.setItem(sessionKey,JSON.stringify(session));
  if(result.snapshot&&!result.snapshot.paged){try{applySnapshot(result.snapshot);lastCheckedAt=Date.now();}catch(error){lock(error.message);throw error;}}else await loadData();
  waitingPassword='';$('pwd').value='';sessionStorage.setItem('queryLoginDay',todayKey());
  $('loginBox').style.display='none';$('app').style.display='block';buildFilters();
  clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>lock('登录已过期，请重新输入密码'),Math.max(0,session.expiresAt-Date.now()));
  clearInterval(checkTimer);checkTimer=setInterval(checkAuthorization,60000);
 }
 async function checkAuthorization(){
  if(document.hidden||!session)return;
  const own=epoch;
  try{const state=await call('status',credentials());if(own===epoch&&state.status!=='approved')lock('人员授权已撤销或尚未审核');}catch(error){if(own===epoch)lock(error.code==='ACCESS_DENIED'?error.message:'暂时无法验证登录权限，请恢复连接后重新登录');}
 }
 async function poll(){
  try{
   const result=await call('status',credentials());
   if(result.status==='approved'){
    if(waitingPassword){const result=await call('login',{...credentials(),name:identity.name,password:waitingPassword});if(result.status==='approved'){await openApp(result);$('loginMsg').textContent='';return;}}
    $('loginMsg').textContent='审核已通过，请输入密码登录';return;
   }
   if(result.status==='rejected'||result.status==='revoked'){waitingPassword='';$('pwd').value='';$('loginMsg').textContent=result.status==='rejected'?'申请未通过，请联系管理员':'设备授权已撤销，请联系管理员';return;}
   $('loginMsg').textContent='申请已提交，等待管理员审核。';
  }catch(error){$('loginMsg').textContent=error.message+'；正在等待连接恢复';}
  pollTimer=setTimeout(poll,5000);
 }
 async function login(){
  if(loginBusy)return;loginBusy=true;clearTimeout(pollTimer);
  const button=$('loginButton');button.disabled=true;
  $('loginMsg').textContent='正在验证登录，请稍候…';
  try{
   const name=$('personName').value.trim(),password=$('pwd').value;
   const result=await call('login',{...credentials(),name,password,label:navigator.platform+' / '+navigator.userAgent.slice(0,65)});
   identity.name=name;localStorage.setItem(deviceKey,JSON.stringify(identity));
   if(result.status==='approved'){await openApp(result);return;}
   if(result.status!=='pending'){waitingPassword='';$('pwd').value='';$('loginMsg').textContent=result.status==='revoked'?'授权已撤销，请联系管理员':'申请未通过，请联系管理员';return;}
   waitingPassword=password;$('pwd').value='';$('loginMsg').textContent='申请已提交，等待管理员审核。';pollTimer=setTimeout(poll,5000);
  }catch(error){$('loginMsg').textContent=error.message||'登录失败';}
  finally{loginBusy=false;button.disabled=false;}
 }
 async function imageURL(id,variant){
  const own=epoch,key=id+':'+variant;
  if(imageURLs.has(key))return imageURLs.get(key);if(imageLoads.has(key))return imageLoads.get(key);
  const promise=(async()=>{
   const result=await call('photo',{id,variant});if(own!==epoch||!session)throw Error('登录已失效');
   const bytes=Uint8Array.from(atob(result.content),x=>x.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));imageURLs.set(key,url);
   if(imageURLs.size>80){const first=imageURLs.keys().next().value;URL.revokeObjectURL(imageURLs.get(first));imageURLs.delete(first);}return url;
  })();imageLoads.set(key,promise);try{return await promise;}finally{if(imageLoads.get(key)===promise)imageLoads.delete(key);}
 }
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);const image=entry.target,own=epoch;imageURL(image.dataset.queryPhoto,'thumbnail').then(url=>{if(own===epoch&&session&&image.isConnected)image.src=url;}).catch(error=>{if(own===epoch&&session&&image.isConnected){image.alt='图片暂不可用';image.title=error.message;}});}});
 function observePhotos(){document.querySelectorAll('img[data-query-photo]:not([data-observed])').forEach(image=>{image.dataset.observed='';observer.observe(image);});}
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-query-view]');if(!button)return;
  const id=button.dataset.queryView,group=button.closest('.query-result-photos');if(!group||!session)return;
  const available=new Map((payload?.items||[]).flatMap(x=>x.photos||[]).map(photo=>[photo.id,photo]));
  const photos=Array.from(group.querySelectorAll('[data-query-view]'),entry=>available.get(entry.dataset.queryView)).filter(Boolean),index=photos.findIndex(photo=>photo.id===id);if(index<0)return;
  root.WarehousePhotoGallery.open({records:photos,index,extraClass:'query-photo-viewer',loadImage:photo=>imageURL(photo.id,'full')});
 });
 root.WarehouseQuery={loadData,login,observePhotos,call,lock,rememberQuickQuery:query=>{searchedQuickQuery=query;}};
 root.loadData=loadData;root.login=login;
 root.refreshLatestDataV75=async function(showMessage){
  if(payload&&session){backgroundRefresh();return true;}
  try{await loadData();buildFilters();return true;}catch(error){if(showMessage)$('loginMsg').textContent=error.message;return false;}
 };
 root.requireDailyLogin=async()=>{
  try{
   if(!config.endpoint){lock('查询服务尚未配置，请联系管理员');return;}
   endpoint();const saved=JSON.parse(sessionStorage.getItem(sessionKey)||'null');
   if(saved?.token&&saved.expiresAt>Date.now()&&sessionStorage.getItem('queryLoginDay')===todayKey())await openApp(saved);
   else lock('首次使用此设备需提交审核；已通过的人员输入密码即可登录。');
  }catch(error){lock(error.message);}finally{document.documentElement.classList.remove('v76AuthPending');}
 };
 $('logoutButton').onclick=()=>lock('已退出登录');
 $('pwd').addEventListener('keydown',event=>{if(event.key==='Enter')login();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkAuthorization();});
 root.WarehouseQuery.checkAuthorization=checkAuthorization;
 window.addEventListener('pagehide',clearImages);
 root.requireDailyLogin();
})(window);
