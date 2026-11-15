(function(root){
 'use strict';
 root.card=function(x){
  const photos=(x.photos||[]).map(p=>'<button type="button" data-query-view="'+esc(p.id)+'" aria-label="'+esc(p.note||'查看照片')+'"><img data-query-photo="'+esc(p.id)+'" alt="照片" loading="lazy"></button>').join('');
  return '<div class="result query-result"><div class="query-result-info"><div><b>快递：</b>'+esc(x.express||'-')+'</div><div><b>客户：</b>'+esc(x.customer||'-')+'</div><div><b>日期：</b>'+esc(x.date||'-')+'</div>'+(photos?'<div class="query-result-photos">'+photos+'</div>':'')+'</div><div class="query-result-pallet">'+esc(x.pallet||'-')+'</div></div>';
 };
 const originalRender=root.renderCurrent;
 root.renderCurrent=function(){originalRender();root.WarehouseQuery?.observePhotos();};
})(window);
