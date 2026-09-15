(() => {
  const CART_KEY='fer_cart_v1';
  const PRODUCTS=(window.FER_PRODUCTS||[]).slice();
  const CONFIG=window.FER_CONFIG||{};
  const details=new Map();
  let variantMap={};
  let cart=loadCart();
  let currentCode='';
  let currentQty=1;
  let currentSelections={};

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>n?`$${Number(n).toLocaleString('es-CL')}`:'Consultar';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function loadCart(){
    try{const v=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}
  }
  function saveCart(){localStorage.setItem(CART_KEY,JSON.stringify(cart));renderCart();updateCartCounts()}
  function product(code){return PRODUCTS.find(p=>p.code===code)}
  function detail(code){return details.get(code)||{descripcion:'',imagenes:[]}}
  function imagesOf(p){const d=detail(p.code),arr=[];(d.imagenes||[]).forEach(x=>x&&arr.push(x));if(Array.isArray(p.images))p.images.forEach(x=>x&&arr.push(x));if(p.image)arr.push(p.image);return [...new Set(arr)]}
  function toast(msg){let t=$('#cartToast');if(!t){t=document.createElement('div');t.id='cartToast';t.className='cart-toast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),1700)}

  function splitSimpleOptions(text){
    return String(text||'').replace(/\.$/,'').split(/\s+o\s+|\s+y\s+|\s*[,/]\s*/i).map(x=>x.trim()).filter(x=>x&&x.length<35);
  }

  function inferredSpec(p){
    const manual=variantMap[p.code];
    if(manual)return JSON.parse(JSON.stringify(manual));
    const d=detail(p.code),desc=d.descripcion||'',imgs=imagesOf(p),name=norm(p.name);
    const groups=[];

    let m=desc.match(/(?:disponibles?\s+)?a pedido en\s+([^\.]+)/i);
    if(m){const opts=splitSimpleOptions(m[1]);if(opts.length>=2&&opts.length<=8)groups.push({name:'Color / opción',type:'options',required:true,options:opts})}

    if(!groups.length){
      m=desc.match(/disponibles?\s+en[,\s]+([^\.]+)/i);
      if(m){
        const known=['Lapislázuli','Jade','Piedra Luna','Amatista','Ojo de tigre','Jaspe rojo','Turquesa','Rojo','Blanco','Azul','Negro','Dorado','Plateado'];
        const opts=known.filter(x=>norm(m[1]).includes(norm(x)));
        if(opts.length>=2)groups.push({name:'Variante',type:'options',required:true,options:opts});
      }
    }

    const customColor=/color\/colores de tu preferencia|color de tu preferencia|distintos colores|personalizad/i.test(desc);
    if(customColor&&!groups.some(g=>/color/i.test(g.name)))groups.push({name:'Color',type:'text',required:true,placeholder:'Indica el color o combinación que prefieres'});

    const imageVariantHint=/cada color|por color|cada uno|cada modelo|modelo|tipo|variante/i.test(desc)||/(traba|scrunch|lazo|bamba|cabello)/i.test(name);
    if(!groups.length&&imgs.length>1&&imageVariantHint)groups.push({name:'Color / modelo',type:'images',required:true});

    return groups.length?{groups}:null;
  }

  function expandGroups(p,spec){
    if(!spec?.groups)return [];
    const imgs=imagesOf(p);
    return spec.groups.map(g=>{
      const out={...g};
      if(g.type==='images')out.options=imgs.map((src,i)=>({label:`Opción ${i+1}`,value:`Opción ${i+1}`,image:src,index:i}));
      else if(Array.isArray(g.options))out.options=g.options.map((o,i)=>typeof o==='string'?{label:o,value:o,index:i}:o);
      return out;
    });
  }

  function selectedSummary(item){
    const entries=Object.entries(item.options||{}).filter(([,v])=>v);
    if(!entries.length)return 'Sin variante';
    return entries.map(([k,v])=>`${k}: ${v}`).join(' · ')+(item.notes?` · Nota: ${item.notes}`:'');
  }

  function itemKey(code,options,notes=''){
    const opts=Object.keys(options||{}).sort().map(k=>`${k}=${options[k]}`).join('|');
    return `${code}|${opts}|${notes.trim()}`;
  }

  function mount(){
    const nav=$('.navlinks');
    if(nav&&!$('#cartNav')){
      const b=document.createElement('button');b.id='cartNav';b.className='nav-cart fer-cart-trigger';b.innerHTML='🛒 Carrito <b data-cart-count>0</b>';
      nav.insertBefore(b,$('#favoritesNav')||nav.lastChild);
    }

    const mobile=$('.mobile-nav');
    if(mobile&&!$('#mobileCart')){
      const a=document.createElement('a');a.href='#';a.id='mobileCart';a.className='mobile-cart-trigger fer-cart-trigger';a.innerHTML='Carrito <span class="cart-count-badge" data-cart-count>0</span>';
      mobile.insertBefore(a,$('#mobileFavorites')||mobile.children[2]||null);
    }

    if(!$('#cartOverlay')){
      document.body.insertAdjacentHTML('beforeend',`
        <div class="cart-overlay" id="cartOverlay"></div>
        <aside class="cart-drawer" id="cartDrawer" aria-label="Carrito de compras">
          <div class="cart-head"><h3>Tu carrito</h3><button class="cart-close" id="cartClose" aria-label="Cerrar">×</button></div>
          <div class="cart-list" id="cartList"></div>
          <div class="cart-foot">
            <div class="cart-summary"><span>Total estimado</span><b id="cartTotal">$0</b></div>
            <p class="cart-foot-note">El pedido se envía por WhatsApp para confirmar disponibilidad. No se cobra en esta página.</p>
            <a class="cart-whatsapp" id="cartWhatsApp" href="#" target="_blank" rel="noopener">Enviar pedido por WhatsApp</a>
            <button class="cart-clear" id="cartClear">Vaciar carrito</button>
          </div>
        </aside>`);
    }

    const modalActions=$('.modal-actions');
    if(modalActions&&!$('#cartConfigurator')){
      modalActions.insertAdjacentHTML('beforebegin',`
        <section class="cart-configurator" id="cartConfigurator">
          <h4>Elige y agrega al carrito</h4>
          <p class="variant-help" id="variantHelp">Selecciona la opción exacta si este diseño tiene colores, piedras o modelos distintos.</p>
          <div id="variantGroups"></div>
          <label class="variant-group" id="variantNotesWrap" hidden>
            <span class="variant-label">Notas del pedido</span>
            <input class="variant-text" id="variantNotes" type="text" placeholder="Ej.: combinación personalizada">
          </label>
          <div class="cart-buy-row">
            <div class="product-qty"><button type="button" id="productQtyMinus" aria-label="Restar">−</button><output id="productQty">1</output><button type="button" id="productQtyPlus" aria-label="Sumar">+</button></div>
            <button type="button" class="add-cart-btn" id="addToCart">🛒 Agregar al carrito</button>
          </div>
          <div class="variant-error" id="variantError">Selecciona todas las opciones antes de agregar.</div>
        </section>`);
    }
    updateCartCounts();renderCart();installQuickCartButtons();
  }

  function renderVariantConfigurator(code){
    const p=product(code),box=$('#variantGroups');if(!p||!box)return;
    currentCode=code;currentQty=1;currentSelections={};
    $('#productQty').textContent='1';$('#variantError').classList.remove('show');
    const spec=inferredSpec(p),groups=expandGroups(p,spec);
    $('#variantHelp').textContent=groups.length?'Selecciona exactamente la variante que quieres antes de agregarla.':'Este diseño no requiere elegir variante.';
    box.innerHTML=groups.map((g,gi)=>{
      const req=g.required!==false?'<small>Obligatorio</small>':'';
      if(g.type==='text')return `<div class="variant-group" data-group="${esc(g.name)}"><div class="variant-label"><span>${esc(g.name)}</span>${req}</div><input class="variant-text" data-variant-text="${esc(g.name)}" placeholder="${esc(g.placeholder||'Escribe tu elección')}"></div>`;
      if(g.type==='images')return `<div class="variant-group" data-group="${esc(g.name)}"><div class="variant-label"><span>${esc(g.name)}</span>${req}</div><div class="variant-images">${(g.options||[]).map(o=>`<button type="button" class="variant-image-option" data-variant-group="${esc(g.name)}" data-variant-value="${esc(o.value)}" data-variant-image="${esc(o.image||'')}"><img src="${esc(o.image||'')}" alt="${esc(o.label)}"><span>${esc(o.label)}</span></button>`).join('')}</div></div>`;
      return `<div class="variant-group" data-group="${esc(g.name)}"><div class="variant-label"><span>${esc(g.name)}</span>${req}</div><div class="variant-options">${(g.options||[]).map(o=>`<button type="button" class="variant-option" data-variant-group="${esc(g.name)}" data-variant-value="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div></div>`;
    }).join('');
    const notesWrap=$('#variantNotesWrap');notesWrap.hidden=!spec?.allowNotes;$('#variantNotes').value='';if(spec?.notesPlaceholder)$('#variantNotes').placeholder=spec.notesPlaceholder;
  }

  function validateSelections(){
    const p=product(currentCode),spec=inferredSpec(p),groups=expandGroups(p,spec);
    for(const g of groups){if(g.required!==false&&!String(currentSelections[g.name]||'').trim())return false}
    return true;
  }

  function addCurrentToCart(){
    const p=product(currentCode);if(!p)return;
    $$('[data-variant-text]').forEach(input=>{currentSelections[input.dataset.variantText]=input.value.trim()});
    if(!validateSelections()){const e=$('#variantError');e.classList.add('show');e.scrollIntoView({behavior:'smooth',block:'nearest'});return}
    const notes=$('#variantNotes')?.value.trim()||'';
    const imgs=imagesOf(p);const chosenImage=$('.variant-image-option.active img')?.getAttribute('src')||imgs[0]||p.image||'';
    const key=itemKey(p.code,currentSelections,notes);
    const existing=cart.find(x=>x.key===key);
    if(existing)existing.qty+=currentQty;else cart.push({key,code:p.code,name:p.name,price:Number(p.price)||0,image:chosenImage,options:{...currentSelections},notes,qty:currentQty});
    saveCart();toast(`${p.name} agregado al carrito`);
  }

  function updateCartCounts(){const n=cart.reduce((a,x)=>a+(Number(x.qty)||0),0);$$('[data-cart-count]').forEach(el=>el.textContent=n)}
  function cartTotal(){return cart.reduce((a,x)=>a+(Number(x.price)||0)*(Number(x.qty)||0),0)}
  function orderWhatsApp(){
    const lines=cart.map((x,i)=>{const sub=(Number(x.price)||0)*(Number(x.qty)||0);return `${i+1}. ${x.name} (${x.code})\n   ${selectedSummary(x)}\n   Cantidad: ${x.qty} × ${money(x.price)} = ${money(sub)}`});
    const text=`Hola, quiero hacer este pedido en FER Accesorios:\n\n${lines.join('\n\n')}\n\nTOTAL ESTIMADO: ${money(cartTotal())}\n\nPor favor confírmame disponibilidad.`;
    return `https://wa.me/${CONFIG.whatsappNumber||'56964133598'}?text=${encodeURIComponent(text)}`;
  }

  function renderCart(){
    const list=$('#cartList');if(!list)return;
    if(!cart.length){list.innerHTML='<div class="cart-empty"><b>Tu carrito está vacío</b><p>Abre un diseño, elige su variante y agrégalo aquí.</p></div>';$('#cartWhatsApp').style.display='none';$('#cartClear').style.display='none';$('#cartTotal').textContent='$0';return}
    list.innerHTML=cart.map(x=>`<div class="cart-row" data-cart-key="${esc(x.key)}"><img src="${esc(x.image||'')}" alt="${esc(x.name)}"><div class="cart-row-main"><span class="cart-code">${esc(x.code)}</span><b>${esc(x.name)}</b><div class="cart-variant">${esc(selectedSummary(x))}</div><div class="cart-price">${money(x.price)}</div></div><div class="cart-row-actions"><button class="cart-remove" data-cart-remove="${esc(x.key)}" aria-label="Quitar">×</button><div class="cart-mini-qty"><button data-cart-minus="${esc(x.key)}">−</button><span>${x.qty}</span><button data-cart-plus="${esc(x.key)}">+</button></div></div></div>`).join('');
    $('#cartTotal').textContent=money(cartTotal());$('#cartWhatsApp').style.display='flex';$('#cartWhatsApp').href=orderWhatsApp();$('#cartClear').style.display='block';
  }

  function openCart(){renderCart();$('#cartOverlay').classList.add('open');$('#cartDrawer').classList.add('open');document.body.classList.add('modal-open')}
  function closeCart(){$('#cartOverlay').classList.remove('open');$('#cartDrawer').classList.remove('open');if(!$('#productModal')?.classList.contains('open')&&!$('#favoritesDrawer')?.classList.contains('open'))document.body.classList.remove('modal-open')}

  function installQuickCartButtons(){
    $$('.card').forEach(card=>{
      const code=card.querySelector('[data-open]')?.dataset.open,actions=card.querySelector('.card-actions');if(!code||!actions||actions.querySelector('[data-quick-cart]'))return;
      const b=document.createElement('button');b.type='button';b.className='small-btn quick-cart-btn';b.dataset.quickCart=code;b.textContent='＋ Carrito';actions.appendChild(b);
    });
  }

  function quickAdd(code){
    const p=product(code);if(!p)return;const spec=inferredSpec(p),groups=expandGroups(p,spec);
    if(groups.length){const opener=document.querySelector(`[data-open="${CSS.escape(code)}"]`);if(opener)opener.click();setTimeout(()=>{renderVariantConfigurator(code);toast('Elige la variante exacta antes de agregar')},120);return}
    const imgs=imagesOf(p),key=itemKey(code,{},'');const existing=cart.find(x=>x.key===key);if(existing)existing.qty+=1;else cart.push({key,code,name:p.name,price:Number(p.price)||0,image:imgs[0]||p.image||'',options:{},notes:'',qty:1});saveCart();toast(`${p.name} agregado al carrito`);
  }

  function bind(){
    document.addEventListener('click',e=>{
      const trigger=e.target.closest('.fer-cart-trigger');if(trigger){e.preventDefault();openCart();return}
      const opt=e.target.closest('[data-variant-group][data-variant-value]');if(opt){const group=opt.dataset.variantGroup;currentSelections[group]=opt.dataset.variantValue;$$(`[data-variant-group="${CSS.escape(group)}"]`).forEach(x=>x.classList.toggle('active',x===opt));if(opt.dataset.variantImage&&$('#modalImg'))$('#modalImg').src=opt.dataset.variantImage;$('#variantError')?.classList.remove('show');return}
      const quick=e.target.closest('[data-quick-cart]');if(quick){e.preventDefault();e.stopPropagation();quickAdd(quick.dataset.quickCart);return}
      const minus=e.target.closest('[data-cart-minus]');if(minus){const x=cart.find(i=>i.key===minus.dataset.cartMinus);if(x){x.qty=Math.max(1,x.qty-1);saveCart()}return}
      const plus=e.target.closest('[data-cart-plus]');if(plus){const x=cart.find(i=>i.key===plus.dataset.cartPlus);if(x){x.qty+=1;saveCart()}return}
      const rem=e.target.closest('[data-cart-remove]');if(rem){cart=cart.filter(i=>i.key!==rem.dataset.cartRemove);saveCart();return}
    });
    $('#cartClose').onclick=closeCart;$('#cartOverlay').onclick=closeCart;$('#cartClear').onclick=()=>{cart=[];saveCart()};
    $('#productQtyMinus').onclick=()=>{currentQty=Math.max(1,currentQty-1);$('#productQty').textContent=currentQty};
    $('#productQtyPlus').onclick=()=>{currentQty+=1;$('#productQty').textContent=currentQty};
    $('#addToCart').onclick=addCurrentToCart;
    document.addEventListener('input',e=>{if(e.target.matches('[data-variant-text]')){currentSelections[e.target.dataset.variantText]=e.target.value.trim();$('#variantError')?.classList.remove('show')}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#cartDrawer')?.classList.contains('open'))closeCart()});
  }

  async function loadData(){
    try{
      const [cat,varRes]=await Promise.all([
        fetch('data/catalogo-whatsapp-auto.json?v=20260915-cart-v1',{cache:'no-store'}),
        fetch('data/product-variants.json?v=20260915-cart-v1',{cache:'no-store'})
      ]);
      if(cat.ok){const arr=await cat.json();arr.forEach(x=>details.set(x.codigo,x))}
      if(varRes.ok)variantMap=await varRes.json();
    }catch(err){console.warn('FER carrito: no se pudieron cargar variantes',err)}
  }

  function watchModal(){
    const modal=$('#productModal');if(!modal)return;
    const sync=()=>{if(modal.classList.contains('open')){const code=$('#metaCode')?.textContent.trim();if(code)renderVariantConfigurator(code)}};
    new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['class','aria-hidden']});
    document.addEventListener('click',e=>{if(e.target.closest('[data-open]'))setTimeout(sync,80)});
  }

  function watchCatalog(){const grid=$('#productGrid');if(!grid)return;new MutationObserver(()=>requestAnimationFrame(installQuickCartButtons)).observe(grid,{childList:true,subtree:false})}

  async function init(){mount();bind();watchModal();watchCatalog();await loadData();installQuickCartButtons();const modal=$('#productModal');if(modal?.classList.contains('open')){const code=$('#metaCode')?.textContent.trim();if(code)renderVariantConfigurator(code)}renderCart();updateCartCounts()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
