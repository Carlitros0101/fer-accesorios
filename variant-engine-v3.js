(() => {
  const details=new Map();
  let variants={};
  const ADMIN_OVERRIDE_KEY='fer_store_admin_override_v1';
  let ready=false;

  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currentCode=()=>$('#metaCode')?.textContent.trim()||'';
  const imagesOf=code=>details.get(code)?.imagenes||[];

  async function loadPublishedAdmin(){
    const urls=['data/store-admin.json',...Array.from({length:6},(_,i)=>`data/store-custom-variants-${i+1}.json`)];
    const responses=await Promise.all(urls.map(u=>fetch(`${u}?v=20260918-published-config-v1`,{cache:'no-store'})));
    const base=responses[0].ok?await responses[0].json():{};
    base.customVariants={...(base.customVariants||{})};
    for(const r of responses.slice(1)){if(r.ok)Object.assign(base.customVariants,await r.json())}
    return base;
  }

  async function load(){
    try{
      const [cat,varRes,publishedAdmin]=await Promise.all([
        fetch('data/catalogo-whatsapp-auto.json?v=20260918-published-config-v1',{cache:'no-store'}),
        fetch('data/product-variants.json?v=20260918-published-config-v1',{cache:'no-store'}),
        loadPublishedAdmin()
      ]);
      if(cat.ok){const arr=await cat.json();arr.forEach(x=>details.set(x.codigo,x))}
      if(varRes.ok)variants=await varRes.json();
      let admin=publishedAdmin||{};
      try{const local=JSON.parse(localStorage.getItem(ADMIN_OVERRIDE_KEY)||'null');if(local)admin=local}catch{}
      if(admin?.customVariants)variants={...variants,...admin.customVariants};
      ready=true;
      syncNow();
    }catch(err){console.warn('FER variantes: no se pudo cargar la configuración publicada',err)}
  }

  function optionObject(o){return typeof o==='string'?{label:o,value:o}:o||{}}

  function renderKnownConfig(code){
    if(!ready)return;
    const box=$('#variantGroups');
    const spec=variants[code];
    if(!box||!spec?.groups)return;
    const imgs=imagesOf(code);

    box.innerHTML=spec.groups.map(g=>{
      const req=g.required!==false?'<small>Obligatorio</small>':'';
      if(g.type==='text'){
        return `<div class="variant-group" data-engine-v3="1" data-group="${esc(g.name)}"><div class="variant-label"><span>${esc(g.name)}</span>${req}</div><input class="variant-text" data-variant-text="${esc(g.name)}" placeholder="${esc(g.placeholder||'Escribe tu elección')}"></div>`;
      }
      if(g.type==='images'){
        const opts=imgs.map((src,i)=>({label:`Opción ${i+1}`,value:`Opción ${i+1}`,image:src,imageIndex:i}));
        return `<div class="variant-group" data-engine-v3="1" data-group="${esc(g.name)}"><div class="variant-label"><span>${esc(g.name)}</span>${req}</div><div class="variant-images">${opts.map(o=>`<button type="button" class="variant-image-option" data-variant-group="${esc(g.name)}" data-variant-value="${esc(o.value)}" data-variant-image="${esc(o.image)}" data-variant-image-index="${o.imageIndex}"><img src="${esc(o.image)}" alt="${esc(o.label)}"><span>${esc(o.label)}</span></button>`).join('')}</div></div>`;
      }
      const opts=(g.options||[]).map(optionObject);
      return `<div class="variant-group" data-engine-v3="1" data-group="${esc(g.name)}"><div class="variant-label"><span>${esc(g.name)}</span>${req}</div><div class="variant-options">${opts.map(o=>`<button type="button" class="variant-option" data-variant-group="${esc(g.name)}" data-variant-value="${esc(o.value??o.label)}"${Number.isInteger(o.imageIndex)?` data-variant-image-index="${o.imageIndex}"`:''}${o.image?` data-variant-image="${esc(o.image)}"`:''}>${esc(o.label??o.value)}</button>`).join('')}</div></div>`;
    }).join('');

    box.dataset.engineCode=code;
    const help=$('#variantHelp');
    if(help)help.textContent='Selecciona exactamente la variante que quieres. Cuando una opción tiene una foto asociada, la imagen cambia automáticamente.';
    const notesWrap=$('#variantNotesWrap');
    if(notesWrap){
      notesWrap.hidden=!spec.allowNotes;
      const input=$('#variantNotes');
      if(input&&spec.notesPlaceholder)input.placeholder=spec.notesPlaceholder;
    }
  }

  function showImage(button){
    const raw=button.dataset.variantImageIndex;
    const idx=raw===''||raw==null?NaN:Number(raw);
    if(Number.isInteger(idx)&&typeof window.setModalImage==='function'){
      window.setModalImage(idx);
      return;
    }
    const src=button.dataset.variantImage;
    if(src){
      const img=$('#modalImg');
      if(img)img.src=src;
    }
  }

  function syncNow(){
    const modal=$('#productModal');
    if(!modal||!modal.classList.contains('open'))return;
    const code=currentCode();
    if(!code||!variants[code])return;
    const box=$('#variantGroups');
    if(!box)return;
    if(box.dataset.engineCode!==code||!box.querySelector('[data-engine-v3="1"]'))renderKnownConfig(code);
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-variant-group][data-variant-value]');
    if(button&&button.closest('#variantGroups')){
      showImage(button);
      const group=button.dataset.variantGroup;
      document.querySelectorAll(`#variantGroups [data-variant-group="${CSS.escape(group)}"]`).forEach(x=>x.classList.toggle('active',x===button));
    }
    if(e.target.closest('[data-open]'))setTimeout(syncNow,120);
  });

  const modal=$('#productModal');
  if(modal)new MutationObserver(()=>setTimeout(syncNow,0)).observe(modal,{attributes:true,attributeFilter:['class','aria-hidden']});
  const box=$('#variantGroups');
  if(box)new MutationObserver(()=>{
    const code=currentCode();
    if(ready&&variants[code]&&!box.querySelector('[data-engine-v3="1"]'))setTimeout(()=>renderKnownConfig(code),0);
  }).observe(box,{childList:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
