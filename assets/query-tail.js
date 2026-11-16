(function (root, factory) {
 'use strict';
 if (typeof module === 'object' && module.exports) module.exports = { create: factory };
 else {
  let storage; try { storage = root.localStorage; } catch {}
  const api = root.WarehouseQueryTail = factory({ storage });
  const mount = () => {
   const toggle = root.document.getElementById('queryTailEnabled');
   const length = root.document.getElementById('queryTailLength');
   const input = root.document.getElementById('quick');
   if (!toggle || !length) return;
   function paint() {
    const state = api.settings(); toggle.checked = state.enabled; length.value = String(state.length); length.disabled = !state.enabled;
    if (input) { input.placeholder = state.enabled ? '输入单号或后' + state.length + '位' : '输入单号、客户或托盘'; input.inputMode = state.enabled ? 'numeric' : 'text'; }
   }
   function change() {
    api.configure({ enabled: toggle.checked, length: Number(length.value) }); paint();
    root.document.dispatchEvent(new root.CustomEvent('warehouse-query-tail-change'));
   }
   toggle.addEventListener('change', change); length.addEventListener('change', change); paint();
  };
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
 }
})(typeof window !== 'undefined' ? window : globalThis, function create(options) {
 'use strict';
 options = options || {};
 const storageKey = 'warehouseQueryTailV1';
 let state = { enabled: true, length: 4 };
 const validLength = n => Number.isInteger(n) && n >= 1 && n <= 20;
 function configure(next, persist = true) {
  if (next && typeof next.enabled === 'boolean') state.enabled = next.enabled;
  if (next && validLength(next.length)) state.length = next.length;
  if (persist) try { options.storage?.setItem(storageKey, JSON.stringify(state)); } catch {}
  return { ...state };
 }
 try { configure(JSON.parse(options.storage?.getItem(storageKey) || 'null'), false); } catch {}
 const text = value => String(value ?? '').trim();
 const normalize = value => text(value).replace(/[\s\-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '').toUpperCase();
 function key(query) { const q = text(query); return state.enabled ? normalize(q).slice(-state.length) : q; }
 function matches(item, query) {
  const q = text(query); if (!q) return false;
  const express = String(item.express || '');
  if (!state.enabled) return express.includes(q) || String(item.last4 || express.slice(-4)) === q || String(item.customer || '').includes(q) || String(item.pallet || '').includes(q);
  const suffix = normalize(express || (state.length <= 4 ? String(item.last4 || '') : ''));
  return suffix.length >= state.length && suffix.slice(-state.length) === key(q);
 }
 return { matches, key, settings: () => ({ ...state }), configure };
});
