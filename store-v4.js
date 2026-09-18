(() => {
  const VERSION='20260918-store-v4-variants';
  const CART_KEY='fer_cart_v1';
  const PROFILE_KEY='fer_checkout_profile_v1';
  const ADMIN_OVERRIDE_KEY='fer_store_admin_override_v1';
  const ANALYTICS_KEY='fer_local_analytics_v1';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const money=n=>n?`$${Number(n).toLocaleString('es-CL')}`:'Consultar';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const catalog=new Map();
  let variants={};
  let admin={version:1,deliveryOptions:['Por coordinar','Retiro','Despacho'],featured:[],products:{},variantImages:{},customVariants:{}};
  let installPrompt=null;

  function readJSON(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'');return v??fallback}catch{return fallback}}
  function loadCart(){return readJSON(CART_KEY,[])}
  function saveCart(cart){localStorage.setItem(CART_KEY,JSON.stringify(cart));window.dispatchEvent(new StorageEvent('storage',{key:CART_KEY,newValue:JSON.stringify(cart)}))}
  function track(type,data={}){try{const events=readJSON(ANALYTICS_KEY,[]);events.push({type,at:new Date().toISOString(),...data});localStorage.setItem(ANALYTICS_KEY,JSON.stringify(events.slice(-300)))}catch{}}
  function currentCode(){return $('#metaCode')?.textContent.trim()||''}
  function detail(code){return catalog.get(code)||{}}
  function images(code){return detail(code).imagenes||[]}
  function productAdmin(code){return admin.products?.[code]||{}}
  function optionObj(o){return typeof o==='string'?{label:o,value:o}:o||{}}
  function selectionKey(options){return Object.keys(options||{}).sort().map(k=>`${k}=${options[k]}`).join('|')}

  function inferredStock(code){
    const configured=productAdmin(code).stock;
    if(Number.isFinite(Number(configured)))return Number(configured);
    const d=detail(code).descripcion||'';
    if(/par\s+único/i.test(d))return 1;
    let m=d.match(/(\d+)\s+(?:unidades?\s+)?disponibles?/i);if(m)return Number(m[1]);
    m=d.match(/disponibles?\s*[:\-]?\s*(\d+)/i);if(m)return Number(m[1]);
    m=d.match(/(\d+)\s+unidad(?:es)?\s+de\s+cada/i);if(m)return Number(m[1]);
    return null;
  }

  function stockFor(code,options={}){
    const map=productAdmin(code).variantStock||{};
    const key=selectionKey(options);
    if(key&&Object.prototype.hasOwnProperty.call(map,key))return Number(map[key]);
    return inferredStock(code);
  }

  function groupSpec(code,groupName){return variants?.[code]?.groups?.find(g=>g.name===groupName)}
  function resolveVariantImage(code,groupName,value){
    const custom=admin.variantImages?.[code]?.[groupName]?.[value];
    if(custom)return custom;
    const g=groupSpec(code,groupName);if(!g)return '';
    const o=(g.options||[]).map(optionObj).find(x=>norm(x.value??x.label)===norm(value));
    if(o?.image)return o.image;
    if(Number.isInteger(o?.imageIndex))return images(code)[o.imageIndex]||'';
    return '';
  }

  function setGalleryImage(code,src){
    if(!src)return;
    const list=images(code);const idx=list.indexOf(src);
    if(idx>=0&&typeof window.setModalImage==='function'){window.setModalImage(idx);return}
    const img=$('#modalImg');if(img)img.src=src;
    $$('.modal-thumb').forEach(b=>b.classList.toggle('active',b.querySelector('img')?.getAttribute('src')===src));
  }

  function currentSelections(){
    const out={};
    $$('#variantGroups .variant-group').forEach(group=>{
      const name=group.dataset.group||group.querySelector('.variant-label span')?.textContent.trim();if(!name)return;
      const active=group.querySelector('[data-variant-value].active');
      const input=group.querySelector('[data-variant-text]');
      const value=active?.dataset.variantValue||input?.value.trim()||'';
      if(value)out[name]=value;
    });
    return out;
  }

  function optionSoldOut(code,group,value){
    const map=productAdmin(code).variantStock||{};
    const needle=`${group}=${value}`;
    const matches=Object.entries(map).filter(([k])=>k.split('|').includes(needle));
    return matches.length>0&&matches.every(([,v])=>Number(v)<=0);
  }

  function decorateVariantOptions(){
    const code=currentCode();if(!code)return;
    $$('#variantGroups [data-variant-group][data-variant-value]').forEach(btn=>{
      const group=btn.dataset.variantGroup,value=btn.dataset.variantValue;
      const src=resolveVariantImage(code,group,value)||btn.dataset.variantImage||'';
      if(src){btn.dataset.variantImageStable=src;if(btn.classList.contains('variant-option')&&!btn.querySelector('.variant-swatch-image')){const img=document.createElement('img');img.className='variant-swatch-image';img.src=src;img.alt='';btn.prepend(img);btn.classList.add('has-variant-image')}}
      const sold=optionSoldOut(code,group,value);btn.classList.toggle('is-sold-out',sold);btn.disabled=sold;
    });
  }

  function updateModalAvailability(){
    const code=currentCode();if(!code)return;
    const stock=stockFor(code,currentSelections());
    let label='Consultar disponibilidad';
    if(stock===0)label='Agotado';else if(stock===1)label='Última unidad';else if(Number.isFinite(stock)&&stock>1)label=`${stock} disponibles`;
    const pill=$('#modalAvailability'),meta=$('#metaAvailability');if(pill)pill.textContent=label;if(meta)meta.textContent=label;
    const add=$('#addToCart');if(add){add.disabled=stock===0;add.textContent=stock===0?'Agotado':'🛒 Agregar al carrito'}
  }

  function decorateCards(){
    $$('.card').forEach(card=>{
      const code=card.querySelector('.code-tag')?.textContent.trim();const photo=card.querySelector('.photo');if(!code||!photo)return;
      let box=photo.querySelector('.store-badges');if(!box){box=document.createElement('div');box.className='store-badges';photo.appendChild(box)}
      const d=detail(code).descripcion||'',stock=inferredStock(code),product=(window.FER_PRODUCTS||[]).find(p=>p.code===code),custom=/personaliz|color(?:es)? de tu preferencia/i.test(d),badges=[];
      if(stock===0)badges.push(['Agotado','out']);else if(stock===1)badges.push(['Última unidad','last']);
      if(product?.isNew)badges.push(['Nuevo','new']);
      if(custom)badges.push(['Personalizable','custom']);
      (productAdmin(code).badges||[]).forEach(x=>badges.push([x,'custom']));
      box.innerHTML=badges.slice(0,3).map(([t,c])=>`<span class="store-badge ${c}">${esc(t)}</span>`).join('');
      if(!badges.length)box.remove();
    });
  }

  function decorateCart(){
    const btn=$('#cartWhatsApp');if(btn){btn.textContent='Revisar pedido';btn.removeAttribute('target')}
    $$('.cart-row').forEach(row=>{
      if(row.querySelector('.cart-edit-option'))return;
      const key=row.dataset.cartKey;const item=loadCart().find(x=>x.key===key);if(!item)return;
      const main=row.querySelector('.cart-row-main');if(!main)return;
      const edit=document.createElement('button');edit.type='button';edit.className='cart-edit-option';edit.textContent='Elegir otra variante';edit.dataset.editProduct=item.code;main.appendChild(edit);
    });
  }

  function decorateFavorites(){
    $$('#favoritesList .favorite-row').forEach(row=>{
      if(row.querySelector('.favorite-cart-btn'))return;
      const text=row.textContent||'';const code=(text.match(/FER-\d+/)||[])[0];if(!code)return;
      const cell=row.children[1]||row;const b=document.createElement('button');b.type='button';b.className='favorite-cart-btn';b.dataset.favoriteCart=code;b.textContent='🛒 Elegir y agregar';cell.appendChild(b);row.classList.add('store-v4-favorite');
    });
  }

  function openProduct(code){
    if(typeof window.openProduct==='function'){window.openProduct(code);return}
    const opener=document.querySelector(`[data-open="${CSS.escape(code)}"]`);if(opener){opener.click();return}
    const u=new URL(location.href);u.searchParams.set('producto',code);location.href=u.toString();
  }

  function cartSummaryHTML(){
    const cart=loadCart();return cart.map(x=>`<div class="checkout-item"><img src="${esc(x.image||'')}" alt=""><div><b>${esc(x.name)}</b><small>${esc(Object.entries(x.options||{}).map(([k,v])=>`${k}: ${v}`).join(' · ')||'Sin variante')} · Cantidad ${x.qty}</small></div><strong>${money((Number(x.price)||0)*(Number(x.qty)||0))}</strong></div>`).join('')
  }
  function totalCart(){return loadCart().reduce((a,x)=>a+(Number(x.price)||0)*(Number(x.qty)||0),0)}

  function mountCheckout(){
    if($('#checkoutPanel'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="checkout-overlay" id="checkoutOverlay"></div><section class="checkout-panel" id="checkoutPanel" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle"><div class="checkout-head"><h3 id="checkoutTitle">Revisar pedido</h3><button class="checkout-close" id="checkoutClose" aria-label="Cerrar">×</button></div><div class="checkout-body"><p class="checkout-intro">Revisa productos, variantes y cantidades antes de enviar el pedido por WhatsApp.</p><div class="checkout-summary-list" id="checkoutSummary"></div><div class="checkout-total"><span>Total estimado</span><b id="checkoutTotal">$0</b></div><div class="checkout-form"><label class="checkout-field"><span>Nombre</span><input id="checkoutName" autocomplete="name" placeholder="Tu nombre"></label><label class="checkout-field"><span>Comuna</span><input id="checkoutCommune" placeholder="Ej.: Calera de Tango"></label><label class="checkout-field full"><span>Entrega</span><select id="checkoutDelivery"></select></label><label class="checkout-field full"><span>Observaciones</span><textarea id="checkoutNotes" placeholder="Ej.: horario, regalo, combinación especial…"></textarea></label></div><button class="checkout-send" id="checkoutSend">Enviar pedido por WhatsApp</button><p class="checkout-note">El total es referencial. FER Accesorios confirma disponibilidad, entrega y monto final por WhatsApp.</p></div></section>`);
    $('#checkoutOverlay').onclick=closeCheckout;$('#checkoutClose').onclick=closeCheckout;$('#checkoutSend').onclick=sendCheckout;
  }

  function openCheckout(){
    const cart=loadCart();if(!cart.length)return;
    mountCheckout();$('#checkoutSummary').innerHTML=cartSummaryHTML();$('#checkoutTotal').textContent=money(totalCart());
    const delivery=$('#checkoutDelivery');delivery.innerHTML=(admin.deliveryOptions||['Por coordinar']).map(x=>`<option>${esc(x)}</option>`).join('');
    const p=readJSON(PROFILE_KEY,{});$('#checkoutName').value=p.name||'';$('#checkoutCommune').value=p.commune||'';$('#checkoutDelivery').value=p.delivery||delivery.options[0]?.value||'';$('#checkoutNotes').value='';
    $('#checkoutOverlay').classList.add('open');$('#checkoutPanel').classList.add('open');document.body.classList.add('modal-open');track('checkout_open',{items:cart.length,total:totalCart()});
  }
  function closeCheckout(){$('#checkoutOverlay')?.classList.remove('open');$('#checkoutPanel')?.classList.remove('open');if(!$('#productModal')?.classList.contains('open')&&!$('#cartDrawer')?.classList.contains('open'))document.body.classList.remove('modal-open')}

  function sendCheckout(){
    const cart=loadCart();if(!cart.length)return;
    const profile={name:$('#checkoutName').value.trim(),commune:$('#checkoutCommune').value.trim(),delivery:$('#checkoutDelivery').value};localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
    const notes=$('#checkoutNotes').value.trim();
    const lines=cart.map((x,i)=>{const opts=Object.entries(x.options||{}).map(([k,v])=>`   • ${k}: ${v}`).join('\n');const subtotal=(Number(x.price)||0)*(Number(x.qty)||0);return `${i+1}. ${x.name} (${x.code})\n${opts?opts+'\n':''}   • Cantidad: ${x.qty}\n   • Precio unitario: ${money(x.price)}\n   • Subtotal: ${money(subtotal)}`});
    const customer=[profile.name&&`Nombre: ${profile.name}`,profile.commune&&`Comuna: ${profile.commune}`,profile.delivery&&`Entrega: ${profile.delivery}`,notes&&`Observaciones: ${notes}`].filter(Boolean).join('\n');
    const text=`Hola, quiero hacer este pedido en FER Accesorios:\n\n${lines.join('\n\n')}\n\nTOTAL ESTIMADO: ${money(totalCart())}${customer?`\n\nDATOS DEL PEDIDO\n${customer}`:''}\n\nPor favor confírmame disponibilidad y total final.`;
    track('whatsapp_order',{items:cart.reduce((a,x)=>a+Number(x.qty||0),0),total:totalCart()});window.open(`https://wa.me/${window.FER_CONFIG?.whatsappNumber||'56964133598'}?text=${encodeURIComponent(text)}`,'_blank','noopener');
  }

  function setupPWA(){
    if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;let b=$('#storeInstall');if(!b){b=document.createElement('button');b.id='storeInstall';b.className='store-install';b.textContent='＋ Instalar FER';document.body.appendChild(b);b.onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;b.classList.remove('show')}}b.classList.add('show')});
  }

  function bind(){
    document.addEventListener('click',e=>{
      const variant=e.target.closest('#variantGroups [data-variant-group][data-variant-value]');if(variant){if(variant.disabled){e.preventDefault();e.stopImmediatePropagation();return}const code=currentCode(),src=variant.dataset.variantImageStable||resolveVariantImage(code,variant.dataset.variantGroup,variant.dataset.variantValue)||variant.dataset.variantImage||'';if(src){setTimeout(()=>setGalleryImage(code,src),0);setTimeout(()=>setGalleryImage(code,src),80)}setTimeout(()=>{decorateVariantOptions();updateModalAvailability()},30);track('variant_select',{code,group:variant.dataset.variantGroup,value:variant.dataset.variantValue})}
      const cartWa=e.target.closest('#cartWhatsApp');if(cartWa){e.preventDefault();e.stopImmediatePropagation();openCheckout();return}
      const edit=e.target.closest('[data-edit-product]');if(edit){closeCheckout();$('#cartClose')?.click();openProduct(edit.dataset.editProduct);setTimeout(()=>$('#cartConfigurator')?.scrollIntoView({behavior:'smooth',block:'start'}),350);return}
      const favCart=e.target.closest('[data-favorite-cart]');if(favCart){$('#favoritesClose')?.click();openProduct(favCart.dataset.favoriteCart);setTimeout(()=>$('#cartConfigurator')?.scrollIntoView({behavior:'smooth',block:'start'}),350);return}
      const open=e.target.closest('[data-open]');if(open)track('product_open',{code:open.dataset.open});
      if(e.target.closest('[data-favorite],#modalFavorite'))track('favorite_toggle',{code:currentCode()||e.target.closest('[data-favorite]')?.dataset.favorite});
      if(e.target.closest('#addToCart,[data-quick-cart]'))setTimeout(()=>{track('add_cart',{code:currentCode()||e.target.closest('[data-quick-cart]')?.dataset.quickCart});decorateCart()},80);
    },true);
    document.addEventListener('input',e=>{if(e.target.matches('[data-variant-text]'))setTimeout(updateModalAvailability,20)});
  }

  function observers(){
    const obs=new MutationObserver(()=>requestAnimationFrame(()=>{decorateVariantOptions();decorateCards();decorateCart();decorateFavorites();updateModalAvailability();const h=$('.related-block h4');if(h)h.textContent='Combínalo con'}));obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});
  }

  async function loadData(){
    try{
      const [catRes,varRes,adminRes]=await Promise.all([
        fetch(`data/catalogo-whatsapp-auto.json?v=${VERSION}`,{cache:'no-store'}),
        fetch(`data/product-variants.json?v=${VERSION}`,{cache:'no-store'}),
        fetch(`data/store-admin.json?v=${VERSION}`,{cache:'no-store'})
      ]);
      if(catRes.ok){const rows=await catRes.json();rows.forEach(x=>catalog.set(x.codigo,x))}
      if(varRes.ok)variants=await varRes.json();
      if(adminRes.ok)admin=await adminRes.json();
      const local=readJSON(ADMIN_OVERRIDE_KEY,null);if(local&&typeof local==='object')admin=local;admin.customVariants??={};variants={...variants,...admin.customVariants};
    }catch(err){console.warn('FER tienda v4: configuración incompleta',err)}
  }

  async function init(){await loadData();mountCheckout();bind();observers();setupPWA();decorateVariantOptions();decorateCards();decorateCart();decorateFavorites();updateModalAvailability()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
