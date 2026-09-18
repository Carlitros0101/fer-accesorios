(() => {
  const LOGO='assets/branding/fer-logo-final.png?v=20260915-logo-fix-v9';
  const RAIL_IDS=['railNew','railGifts','railStones','railHandmade'];

  function loadCartAssets(){
    if(!document.querySelector('link[data-fer-cart]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='cart-v1.css?v=20260918-published-config-v1';
      link.dataset.ferCart='1';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-fer-cart]')){
      const script=document.createElement('script');
      script.src='cart-v1.js?v=20260918-published-config-v1';
      script.dataset.ferCart='1';
      script.async=false;
      (document.body||document.documentElement).appendChild(script);
    }
    if(!document.querySelector('script[data-fer-cart-wa]')){
      const fix=document.createElement('script');
      fix.src='cart-wa-fix.js?v=20260918-published-config-v1';
      fix.dataset.ferCartWa='1';
      fix.async=false;
      (document.body||document.documentElement).appendChild(fix);
    }
    if(!document.querySelector('script[data-fer-variant-engine]')){
      const engine=document.createElement('script');
      engine.src='variant-engine-v3.js?v=20260918-published-config-v1';
      engine.dataset.ferVariantEngine='1';
      engine.async=false;
      (document.body||document.documentElement).appendChild(engine);
    }
  }

  function applyBranding(){
    document.querySelectorAll('header .brand, footer .brand').forEach((el,i)=>{
      el.dataset.brandReady='1';
      el.classList.add('brand-logo');
      let img=el.querySelector('img');
      if(!img){
        img=document.createElement('img');
        el.textContent='';
        el.appendChild(img);
      }
      img.className=i?'footer-logo':'';
      img.src=LOGO;
      img.alt='FER Accesorios';
    });

    const heroCopy=document.querySelector('.hero-copy');
    if(heroCopy){
      let img=heroCopy.querySelector('.hero-logo');
      if(!img){
        img=document.createElement('img');
        img.className='hero-logo';
        heroCopy.insertBefore(img,heroCopy.firstChild);
      }
      img.src=LOGO;
      img.alt='FER Accesorios';
      const eyebrow=heroCopy.querySelector(':scope > .eyebrow');
      if(eyebrow) eyebrow.style.display='none';
    }
  }

  function forceInitialPaint(){
    try{
      if(document.getElementById('heroGallery')?.children.length===0 && typeof renderHero==='function') renderHero();
      if(document.getElementById('railNew')?.children.length===0 && typeof renderCommercial==='function') renderCommercial();
      if(document.getElementById('productGrid')?.children.length===0 && typeof renderCatalog==='function') renderCatalog(true);
      if(typeof renderFavorites==='function') renderFavorites();
    }catch(err){console.warn('FER: render inicial de respaldo',err)}
  }

  function cardStep(rail){
    const card=rail.querySelector('.rail-card');
    if(!card) return Math.max(rail.clientWidth*.78,240);
    const style=getComputedStyle(rail);
    const gap=parseFloat(style.columnGap||style.gap||'0')||0;
    return card.getBoundingClientRect().width+gap;
  }

  function updateControls(rail,controls){
    if(!rail||!controls) return;
    const prev=controls.querySelector('[data-rail-prev]');
    const next=controls.querySelector('[data-rail-next]');
    const count=controls.querySelector('.rail-counter');
    const max=Math.max(0,rail.scrollWidth-rail.clientWidth);
    const step=Math.max(1,cardStep(rail));
    const total=Math.max(1,rail.children.length);
    const index=Math.min(total,Math.max(1,Math.round(rail.scrollLeft/step)+1));
    prev.disabled=rail.scrollLeft<=3;
    next.disabled=rail.scrollLeft>=max-3||max<=3;
    count.textContent=`${index} / ${total}`;
  }

  function setupRail(rail){
    if(!rail||rail.dataset.carouselReady==='1') return;
    rail.dataset.carouselReady='1';
    const section=rail.parentElement;
    section.classList.add('rail-section');
    const controls=document.createElement('div');
    controls.className='rail-controls';
    controls.innerHTML=`<button class="rail-arrow" type="button" data-rail-prev aria-label="Anterior">‹</button><span class="rail-counter" aria-live="polite">1 / ${Math.max(1,rail.children.length)}</span><button class="rail-arrow" type="button" data-rail-next aria-label="Siguiente">›</button>`;
    section.appendChild(controls);
    if(!section.querySelector('.rail-swipe-hint')){
      const hint=document.createElement('p');
      hint.className='rail-swipe-hint';
      hint.textContent='Desliza para ver más productos';
      section.appendChild(hint);
    }
    const move=dir=>{rail.scrollBy({left:cardStep(rail)*dir,behavior:'smooth'});setTimeout(()=>updateControls(rail,controls),420)};
    controls.querySelector('[data-rail-prev]').addEventListener('click',()=>move(-1));
    controls.querySelector('[data-rail-next]').addEventListener('click',()=>move(1));
    rail.addEventListener('scroll',()=>requestAnimationFrame(()=>updateControls(rail,controls)),{passive:true});
    rail.tabIndex=0;
    rail.setAttribute('aria-label',rail.getAttribute('aria-label')||'Carrusel de productos');
    rail.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}});
    new MutationObserver(()=>requestAnimationFrame(()=>updateControls(rail,controls))).observe(rail,{childList:true});
    requestAnimationFrame(()=>updateControls(rail,controls));
  }

  function setupAll(){
    applyBranding();
    RAIL_IDS.forEach(id=>setupRail(document.getElementById(id)));
    forceInitialPaint();
    RAIL_IDS.forEach(id=>{const rail=document.getElementById(id);if(!rail)return;updateControls(rail,rail.parentElement.querySelector('.rail-controls'))});
  }

  function start(){loadCartAssets();setupAll();setTimeout(setupAll,250);setTimeout(setupAll,1200);setTimeout(setupAll,3000)}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
