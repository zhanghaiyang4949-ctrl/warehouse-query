(function(root){
 'use strict';let groups=root.WarehouseTailCollisions.build([]);
 root.card=function(x){
  const photos=(x.photos||[]).map(p=>'<button type="button" data-query-view="'+esc(p.id)+'" aria-label="'+esc(p.note||'查看照片')+'"><img data-query-photo="'+esc(p.id)+'" alt="照片" loading="lazy"></button>').join('');
  const info=root.WarehouseTailCollisions.info(groups,x),badge=info?'<span class="tail-collision-badge">同托盘尾号 '+esc(info.tail)+' 重复 · '+info.count+' 件，请核对完整单号</span>':'';
  return '<div class="result query-result '+(info?'tail-collision tail-collision-'+info.color:'')+'"><div class="query-result-info"><div><b>快递：</b>'+esc(root.WarehouseTrackingDisplay.format(x.express)||'-')+'</div>'+badge+'<div><b>客户：</b>'+esc(x.customer||'-')+'</div><div><b>日期：</b>'+esc(x.date||'-')+'</div>'+(photos?'<div class="query-result-photos">'+photos+'</div><small class="query-photo-count">共 '+x.photos.length+' 张 · 左右滑动缩略图，点击放大</small>':'')+'</div><div class="query-result-pallet">'+esc(x.pallet||'-')+'</div></div>';
 };
 const originalRender=root.renderCurrent;
 root.renderCurrent=function(){groups=root.WarehouseTailCollisions.build(payload?.items||[]);originalRender();root.WarehouseQuery?.observePhotos();};
})(window);
