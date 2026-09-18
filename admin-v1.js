(() => {
  const OVERRIDE_KEY='fer_store_admin_override_v1';
  const ANALYTICS_KEY='fer_local_analytics_v1';
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let catalog=[];let variants={};let config={version:1,deliveryOptions:['Por coordinar','Retiro','Despacho'],featured:[],products:{},variantImages:{},customVariants:{}};
  let current='';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function optionObj(o){return typeof o==='string'?{label:o,value:o}:o||{}}
  function saveLocal(){localStorage.setItem(OVERRIDE_KEY,JSON.stringify(config));$('#saveState').textContent='Cambios aplicados en este dispositivo.';setTimeout(()=>$('#saveState').textContent='',2200)}
  function resetLocal(){localStorage.removeItem(OVERRIDE_KEY);location.reload()}
  function product(code){return catalog.find(x=>x.codigo===code)}
  function productCfg(code){config.products[code]??={};return config.products[code]}
  function ensureMap(code,group){config.variantImages[code]??={};config.variantImages[code][group]??={};return config.variantImages[code][group]}
  function currentImages(){return product(current)?.imagenes||[]}
  function effectiveSpec(code){return config.customVariants?.[code]||variants[code]||null}
  function ensureCustomVariants(){config.customVariants??={}}
  function cloneSpec(spec){return JSON.parse(JSON.stringify(spec||{groups:[]}))}
  function makeCustomFromExisting(){
    ensureCustomVariants();
    config.customVariants[current]=cloneSpec(effectiveSpec(current));
    renderProduct();
  }
  function createVariantsFromPhotos(){
    const imgs=currentImages(); if(!imgs.length)return;
    ensureCustomVariants();
    config.customVariants[current]={groups:[{name:'Color / modelo',type:'options',required:true,options:imgs.map((src,i)=>({label:`Opción ${i+1}`,value:`Opción ${i+1}`,image:src}))}]};
    renderProduct();
  }
  function addCustomGroup(){
    ensureCustomVariants();
    const spec=config.customVariants[current]||{groups:[]};
    spec.groups??=[];
    spec.groups.push({name:`Variante ${spec.groups.length+1}`,type:'options',required:true,options:[]});
    config.customVariants[current]=spec;
    renderProduct();
  }

  function analytics(){const events=(()=>{try{return JSON.parse(localStorage.getItem(ANALYTICS_KEY)||'[]')}catch{return []}})();const count=t=>events.filter(e=>e.type===t).length;$('#analytics').innerHTML=[['Fichas abiertas',count('product_open')],['Agregados al carrito',count('add_cart')],['Checkout abierto',count('checkout_open')],['Pedidos a WhatsApp',count('whatsapp_order')]].map(([l,v])=>`<div class="metric"><b>${v}</b><span>${l}</span></div>`).join('')}

  function renderProduct(){
    const p=product(current);if(!p)return;const pc=productCfg(current),imgs=currentImages(),spec=effectiveSpec(current),isCustom=!!config.customVariants?.[current];
    $('#productTitle').textContent=p.nombre;$('#productMeta').textContent=`${p.codigo} · ${p.precio?`$${Number(p.precio).toLocaleString('es-CL')}`:'Precio por consultar'}`;$('#stockInput').value=Number.isFinite(Number(pc.stock))?pc.stock:'';
    $('#featuredCheck').checked=(config.featured||[]).includes(current);$('#personalizableCheck').checked=(pc.badges||[]).includes('Personalizable');
    $('#imageGrid').innerHTML=imgs.map((src,i)=>`<div class="image-card"><b>${i+1}</b><img src="${esc(src)}" alt="Foto ${i+1}"></div>`).join('')||'<p class="muted">Sin galería cargada.</p>';
    const editor=$('#variantEditor');
    if(!spec?.groups?.length){
      editor.innerHTML=`<div class="variant-empty"><div><b>Este producto no tiene variantes configuradas.</b><p class="muted">Si las fotografías corresponden a colores o modelos distintos, puedes crear las opciones desde aquí.</p></div><div class="variant-builder-actions"><button type="button" class="admin-btn primary" data-create-from-photos>Crear opciones desde las fotos</button><button type="button" class="admin-btn" data-add-group>Agregar grupo manualmente</button></div></div>`;
      return
    }
    editor.innerHTML=`${!isCustom?'<div class="variant-source-note"><span>Estas variantes vienen de la configuración general.</span><button type="button" class="admin-btn" data-customize-variants>Personalizar para este producto</button></div>':''}${isCustom?'<div class="variant-builder-actions top"><button type="button" class="admin-btn" data-add-group>＋ Agregar grupo de variantes</button><button type="button" class="admin-btn danger" data-reset-custom-variants>Restablecer configuración original</button></div>':''}`+spec.groups.map((g,gi)=>{
      if(g.type==='text')return `<div class="variant-group-editor"><div class="variant-group-head"><h3>${esc(g.name)}</h3>${isCustom?`<button type="button" class="mini-danger" data-remove-group="${gi}">Eliminar grupo</button>`:''}</div><p class="muted">Esta variante es texto libre; no requiere asociar una foto fija.</p></div>`;
      let opts=[];if(g.type==='images')opts=imgs.map((src,i)=>({label:`Opción ${i+1}`,value:`Opción ${i+1}`}));else opts=(g.options||[]).map(optionObj);
      const map=ensureMap(current,g.name);
      return `<div class="variant-group-editor" data-group-index="${gi}">
        <div class="variant-group-head">
          ${isCustom?`<input class="variant-group-name-input" data-group-name="${gi}" value="${esc(g.name)}" aria-label="Nombre del grupo">`:`<h3>${esc(g.name)}</h3>`}
          ${isCustom?`<button type="button" class="mini-danger" data-remove-group="${gi}">Eliminar grupo</button>`:''}
        </div>
        ${opts.map((o,oi)=>{const value=o.value??o.label;const active=map[value]||o.image||(Number.isInteger(o.imageIndex)?imgs[o.imageIndex]:'');return `<div class="variant-row">
          <div class="variant-name">${isCustom?`<input class="variant-option-name-input" data-option-name="${gi}:${oi}" value="${esc(o.label??value)}" aria-label="Nombre de la opción">`:`${esc(o.label??value)}`}</div>
          <div class="mapping-images">${imgs.map((src,i)=>`<button type="button" class="${active===src?'active':''}" data-map-group="${esc(g.name)}" data-map-value="${esc(value)}" data-map-image="${esc(src)}" data-map-index="${gi}:${oi}" title="Foto ${i+1}"><img src="${esc(src)}" alt=""><small>${i+1}</small></button>`).join('')}</div>
          ${isCustom?`<button type="button" class="mini-danger option-remove" data-remove-option="${gi}:${oi}">×</button>`:''}
        </div>`}).join('')}
        ${isCustom?`<button type="button" class="admin-btn variant-add-option" data-add-option="${gi}">＋ Agregar opción</button>`:''}
      </div>`;
    }).join('')
  }

  function renderList(){const q=norm($('#productSearch').value);const rows=catalog.filter(p=>!q||norm(`${p.codigo} ${p.nombre} ${p.descripcion||''}`).includes(q));$('#productSelect').innerHTML=rows.map(p=>`<option value="${p.codigo}">${p.codigo} · ${esc(p.nombre)}</option>`).join('');if(!rows.find(x=>x.codigo===current))current=rows[0]?.codigo||'';$('#productSelect').value=current;renderProduct()}

  function exportJSON(){const blob=new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='store-admin.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

  function bind(){
    $('#productSearch').addEventListener('input',renderList);$('#productSelect').addEventListener('change',e=>{current=e.target.value;renderProduct()});
    $('#stockInput').addEventListener('input',e=>{const v=e.target.value.trim();const pc=productCfg(current);if(v==='')delete pc.stock;else pc.stock=Number(v)});
    $('#featuredCheck').addEventListener('change',e=>{const set=new Set(config.featured||[]);e.target.checked?set.add(current):set.delete(current);config.featured=[...set]});
    $('#personalizableCheck').addEventListener('change',e=>{const pc=productCfg(current),set=new Set(pc.badges||[]);e.target.checked?set.add('Personalizable'):set.delete('Personalizable');pc.badges=[...set]});
    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-map-group]');
      if(b){
        const map=ensureMap(current,b.dataset.mapGroup);map[b.dataset.mapValue]=b.dataset.mapImage;
        const pos=b.dataset.mapIndex;
        if(pos&&config.customVariants?.[current]){const [gi,oi]=pos.split(':').map(Number);const opt=config.customVariants[current].groups?.[gi]?.options?.[oi];if(opt)opt.image=b.dataset.mapImage}
        renderProduct();return
      }
      if(e.target.closest('[data-create-from-photos]')){createVariantsFromPhotos();return}
      if(e.target.closest('[data-customize-variants]')){makeCustomFromExisting();return}
      if(e.target.closest('[data-add-group]')){addCustomGroup();return}
      const rg=e.target.closest('[data-remove-group]');if(rg){const gi=Number(rg.dataset.removeGroup);config.customVariants?.[current]?.groups?.splice(gi,1);renderProduct();return}
      const ro=e.target.closest('[data-remove-option]');if(ro){const [gi,oi]=ro.dataset.removeOption.split(':').map(Number);config.customVariants?.[current]?.groups?.[gi]?.options?.splice(oi,1);renderProduct();return}
      const ao=e.target.closest('[data-add-option]');if(ao){const gi=Number(ao.dataset.addOption),g=config.customVariants?.[current]?.groups?.[gi];if(g){g.options??=[];g.options.push({label:`Opción ${g.options.length+1}`,value:`Opción ${g.options.length+1}`});renderProduct()}return}
      if(e.target.closest('[data-reset-custom-variants]')){if(config.customVariants?.[current])delete config.customVariants[current];renderProduct()}
    });
    document.addEventListener('change',e=>{
      const gn=e.target.closest('[data-group-name]');if(gn&&config.customVariants?.[current]){const gi=Number(gn.dataset.groupName),g=config.customVariants[current].groups?.[gi];if(g){const old=g.name,newName=gn.value.trim()||old;if(old!==newName&&config.variantImages?.[current]?.[old]){config.variantImages[current][newName]=config.variantImages[current][old];delete config.variantImages[current][old]}g.name=newName;renderProduct()}return}
      const on=e.target.closest('[data-option-name]');if(on&&config.customVariants?.[current]){const [gi,oi]=on.dataset.optionName.split(':').map(Number),o=config.customVariants[current].groups?.[gi]?.options?.[oi];if(o){const old=o.value??o.label,newVal=on.value.trim()||old;o.label=newVal;o.value=newVal;renderProduct()}}
    });
    $('#saveLocal').onclick=saveLocal;$('#resetLocal').onclick=resetLocal;$('#exportConfig').onclick=exportJSON;
    $('#clearAnalytics').onclick=()=>{localStorage.removeItem(ANALYTICS_KEY);analytics()};
  }

  async function loadPublishedConfig(){
    const urls=['data/store-admin.json',...Array.from({length:6},(_,i)=>`data/store-custom-variants-${i+1}.json`)];
    const responses=await Promise.all(urls.map(u=>fetch(`${u}?v=20260918-published-config-v1`,{cache:'no-store'})));
    const base=responses[0].ok?await responses[0].json():config;
    base.customVariants={...(base.customVariants||{})};
    for(const r of responses.slice(1)){if(r.ok)Object.assign(base.customVariants,await r.json())}
    return base;
  }

  async function init(){
    const [c,v,published]=await Promise.all([
      fetch('data/catalogo-whatsapp-auto.json?v=20260918-published-config-v1',{cache:'no-store'}),
      fetch('data/product-variants.json?v=20260918-published-config-v1',{cache:'no-store'}),
      loadPublishedConfig()
    ]);
    catalog=c.ok?await c.json():[];
    variants=v.ok?await v.json():{};
    config=published||config;
    config.customVariants??={};
    try{const local=JSON.parse(localStorage.getItem(OVERRIDE_KEY)||'null');if(local)config=local}catch{}
    config.customVariants??={};
    current=catalog[0]?.codigo||'';bind();renderList();analytics()
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
