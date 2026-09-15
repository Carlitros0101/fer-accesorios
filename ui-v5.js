(() => {
  const LOGO='assets/branding/fer-logo.svg';
  const RAIL_IDS=['railNew','railGifts','railStones','railHandmade'];

  function applyBranding(){
    document.querySelectorAll('header .brand, footer .brand').forEach((el,i)=>{
      el.classList.add('brand-logo');
      el.innerHTML=`<img class="${i?'footer-logo':''}" src="${LOGO}" alt="FER Accesorios">`;
    });
    const heroCopy=document.querySelector('.hero-copy');
    if(heroCopy&&!heroCopy.querySelector('.hero-logo')){
      const img=document.createElement('img');
      img.className='hero-logo';
      img.src=LOGO;
      img.alt='FER Accesorios';
      heroCopy.insertBefore(img,heroCopy.firstChild);
      const eyebrow=heroCopy.querySelector(':scope > .eyebrow');
      if(eyebrow) eyebrow.style.display='none';
    }
  }

  function cardStep(rail){
    const card=rail.querySelector('.rail-card');
    if(!card) return Math.max(rail.clientWidth*.78,240);
    const style=getComputedStyle(rail);
    const gap=parseFloat(style.columnGap||style.gap||'0')||0;
    return card.getBoundingClientRect().width+gap;
  }

  function updateControls(rail,controls){
    const prev=controls.querySelector('[data-rail-prev]');
    const next=controls.querySelector('[data-rail-next]');
    const count=controls.querySelector('.rail-counter');
    const max=Math.max(0,rail.scrollWidth-rail.clientWidth);
    const step=Math.max(1,cardStep(rail));
    const total=Math.max(1,rail.children.length);
    const index=Math.min(total,Math.max(1,Math.round(rail.scrollLeft/step)+1));
    prev.disabled=rail.scrollLeft<=3;
    next.disabled=rail.scrollLeft>=max-3 || max<=3;
    count.textContent=`${index} / ${total}`;
  }

  function setupRail(rail){
    if(!rail || rail.dataset.carouselReady==='1') return;
    rail.dataset.carouselReady='1';
    const section=rail.parentElement;
    section.classList.add('rail-section');

    const controls=document.createElement('div');
    controls.className='rail-controls';
    controls.innerHTML=`
      <button class="rail-arrow" type="button" data-rail-prev aria-label="Anterior">‹</button>
      <span class="rail-counter" aria-live="polite">1 / ${Math.max(1,rail.children.length)}</span>
      <button class="rail-arrow" type="button" data-rail-next aria-label="Siguiente">›</button>`;
    section.appendChild(controls);

    if(!section.querySelector('.rail-swipe-hint')){
      const hint=document.createElement('p');
      hint.className='rail-swipe-hint';
      hint.textContent='Desliza para ver más productos';
      section.appendChild(hint);
    }

    const move=dir=>{
      const delta=cardStep(rail)*dir;
      rail.scrollBy({left:delta,behavior:'smooth'});
      setTimeout(()=>updateControls(rail,controls),380);
    };
    controls.querySelector('[data-rail-prev]').addEventListener('click',()=>move(-1));
    controls.querySelector('[data-rail-next]').addEventListener('click',()=>move(1));
    rail.addEventListener('scroll',()=>requestAnimationFrame(()=>updateControls(rail,controls)),{passive:true});

    // Teclado y rueda horizontal en escritorio.
    rail.tabIndex=0;
    rail.setAttribute('aria-label',rail.getAttribute('aria-label')||'Carrusel de productos');
    rail.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'){e.preventDefault();move(1)}
      if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}
    });

    // Cuando el catálogo termina de renderizar o cambia, recalcular.
    new MutationObserver(()=>updateControls(rail,controls)).observe(rail,{childList:true});
    requestAnimationFrame(()=>updateControls(rail,controls));
  }

  function setupAll(){
    applyBranding();
    RAIL_IDS.forEach(id=>setupRail(document.getElementById(id)));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupAll,{once:true});
  else setupAll();

  // tienda-v2 carga datos de forma asíncrona; observar hasta que aparezcan tarjetas.
  const observer=new MutationObserver(()=>setupAll());
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>observer.disconnect(),12000);
})();
