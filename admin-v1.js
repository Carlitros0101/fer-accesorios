(() => {
  const OVERRIDE_KEY='fer_store_admin_override_v1';
  const ANALYTICS_KEY='fer_local_analytics_v1';
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let catalog=[];let variants={};let config={version:1,deliveryOptions:['Por coordinar','Retiro','Despacho'],featured:[],products:{},variantImages:{}};
  let current='';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function optionObj(o){return typeof o==='string'?{label:o,value:o}:o||{}}
  function saveLocal(){localStorage.setItem(OVERRIDE_KEY,JSON.stringify(config));$('#saveState').textContent='Cambios aplicados en este dispositivo.';setTimeout(()=>$('#saveState').textContent='',2200)}
  function resetLocal(){localStorage.removeItem(OVERRIDE_KEY);location.reload()}
  function product(code){return catalog.find(x=>x.codigo===code)}
  function productCfg(code){config.products[code]??={};return config.products[code]}
  function ensureMap(code,group){config.variantImages[code]??={};config.variantImages[code][group]??={};return config.variantImages[code][group]}
  function currentImages(){return product(current)?.imagenes||[]}

  function analytics(){const events=(()=>{try{return JSON.parse(localStorage.getItem(ANALYTICS_KEY)||'[]')}catch{return []}})();const count=t=>events.filter(e=>e.type===t).length;$('#analytics').innerHTML=[['Fichas abiertas',count('product_open')],['Agregados al carrito',count('add_cart')],['Checkout abierto',count('checkout_open')],['Pedidos a WhatsApp',count('whatsapp_order')]].map(([l,v])=>`<div class="metric"><b>${v}</b><span>${l}</span></div>`).join('')}

  function renderProduct(){
    const p=product(current);if(!p)return;const pc=productCfg(current),imgs=currentImages(),spec=variants[current];
    $('#productTitle').textContent=p.nombre;$('#productMeta').textContent=`${p.codigo} · ${p.precio?`$${Number(p.precio).toLocaleString('es-CL')}`:'Precio por consultar'}`;$('#stockInput').value=Number.isFinite(Number(pc.stock))?pc.stock:'';
    $('#featuredCheck').checked=(config.featured||[]).includes(current);$('#personalizableCheck').checked=(pc.badges||[]).includes('Personalizable');
    $('#imageGrid').innerHTML=imgs.map((src,i)=>`<div class="image-card"><b>${i+1}</b><img src="${esc(src)}" alt="Foto ${i+1}"></div>`).join('')||'<p class="muted">Sin galería cargada.</p>';
    const editor=$('#variantEditor');
    if(!spec?.groups?.length){editor.innerHTML='<p class="muted">Este producto no tiene variantes configuradas.</p>';return}
    editor.innerHTML=spec.groups.map(g=>{
      if(g.type==='text')return `<div class="variant-group-editor"><h3>${esc(g.name)}</h3><p class="muted">Esta variante es texto libre; no requiere asociar una foto fija.</p></div>`;
      let opts=[];if(g.type==='images')opts=imgs.map((src,i)=>({label:`Opción ${i+1}`,value:`Opción ${i+1}`}));else opts=(g.options||[]).map(optionObj);
      const map=ensureMap(current,g.name);
      return `<div class="variant-group-editor"><h3>${esc(g.name)}</h3>${opts.map(o=>{const value=o.value??o.label;const active=map[value]||o.image||(Number.isInteger(o.imageIndex)?imgs[o.imageIndex]:'');return `<div class="variant-row"><div class="variant-name">${esc(o.label??value)}</div><div class="mapping-images">${imgs.map((src,i)=>`<button type="button" class="${active===src?'active':''}" data-map-group="${esc(g.name)}" data-map-value="${esc(value)}" data-map-image="${esc(src)}" title="Foto ${i+1}"><img src="${esc(src)}" alt=""><small>${i+1}</small></button>`).join('')}</div></div>`}).join('')}</div>`;
    }).join('')
  }

  function renderList(){const q=norm($('#productSearch').value);const rows=catalog.filter(p=>!q||norm(`${p.codigo} ${p.nombre} ${p.descripcion||''}`).includes(q));$('#productSelect').innerHTML=rows.map(p=>`<option value="${p.codigo}">${p.codigo} · ${esc(p.nombre)}</option>`).join('');if(!rows.find(x=>x.codigo===current))current=rows[0]?.codigo||'';$('#productSelect').value=current;renderProduct()}

  function exportJSON(){const blob=new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='store-admin.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

  function bind(){
    $('#productSearch').addEventListener('input',renderList);$('#productSelect').addEventListener('change',e=>{current=e.target.value;renderProduct()});
    $('#stockInput').addEventListener('input',e=>{const v=e.target.value.trim();const pc=productCfg(current);if(v==='')delete pc.stock;else pc.stock=Number(v)});
    $('#featuredCheck').addEventListener('change',e=>{const set=new Set(config.featured||[]);e.target.checked?set.add(current):set.delete(current);config.featured=[...set]});
    $('#personalizableCheck').addEventListener('change',e=>{const pc=productCfg(current),set=new Set(pc.badges||[]);e.target.checked?set.add('Personalizable'):set.delete('Personalizable');pc.badges=[...set]});
    document.addEventListener('click',e=>{const b=e.target.closest('[data-map-group]');if(!b)return;const map=ensureMap(current,b.dataset.mapGroup);map[b.dataset.mapValue]=b.dataset.mapImage;renderProduct()});
    $('#saveLocal').onclick=saveLocal;$('#resetLocal').onclick=resetLocal;$('#exportConfig').onclick=exportJSON;
    $('#clearAnalytics').onclick=()=>{localStorage.removeItem(ANALYTICS_KEY);analytics()};
  }

  async function init(){
    const [c,v,a]=await Promise.all([fetch('data/catalogo-whatsapp-auto.json',{cache:'no-store'}),fetch('data/product-variants.json',{cache:'no-store'}),fetch('data/store-admin.json',{cache:'no-store'})]);catalog=c.ok?await c.json():[];variants=v.ok?await v.json():{};config=a.ok?await a.json():config;try{const local=JSON.parse(localStorage.getItem(OVERRIDE_KEY)||'null');if(local)config=local}catch{}
    current=catalog[0]?.codigo||'';bind();renderList();analytics()
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
