(() => {
  const WHATSAPP='56964133598';

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  function groupSelection(group){
    const label=group.querySelector('.variant-label span')?.textContent.trim()||group.dataset.group||'Opción';
    const text=group.querySelector('[data-variant-text]');
    if(text)return {label,value:text.value.trim(),required:!!group.querySelector('.variant-label small')};
    const active=group.querySelector('[data-variant-group][data-variant-value].active');
    return {label,value:active?.dataset.variantValue?.trim()||'',required:!!group.querySelector('.variant-label small')};
  }

  function readSelections(){
    return $$('#variantGroups .variant-group').map(groupSelection);
  }

  function selectionPhrase(label,value){
    const l=label.toLowerCase();
    const v=value.toLowerCase();
    if(l.includes('material del gancho'))return `gancho de ${v}`;
    if(l.includes('terminación del gancho'))return `gancho ${v.startsWith('baño')?'con ': 'en '}${v}`;
    if(l==='color'||l.includes('color / opción'))return `color ${v}`;
    if(l.includes('piedra'))return `piedra ${v}`;
    if(l.includes('terminación'))return `terminación ${v}`;
    if(l.includes('color / modelo'))return v.replace(/^opción\s+/i,'modelo de la foto ');
    return `${label.toLowerCase()} ${v}`;
  }

  function parsePrice(text){
    const n=Number(String(text||'').replace(/[^0-9]/g,''));
    return Number.isFinite(n)?n:0;
  }

  function money(n){return `$${Number(n||0).toLocaleString('es-CL')}`}

  function buildMessage(){
    const title=$('#modalTitle')?.textContent.trim()||'Producto';
    const code=$('#metaCode')?.textContent.trim()||$('#modalCode')?.textContent.trim()||'';
    const qty=Math.max(1,Number($('#productQty')?.textContent||1));
    const priceText=$('#modalPrice')?.textContent.trim()||'';
    const price=parsePrice(priceText);
    const selections=readSelections();
    const missing=selections.filter(x=>x.required&&!x.value);

    if(missing.length){
      $('#variantError')?.classList.add('show');
      $('#cartConfigurator')?.scrollIntoView({behavior:'smooth',block:'nearest'});
      return null;
    }

    const chosen=selections.filter(x=>x.value);
    const phrase=chosen.map(x=>selectionPhrase(x.label,x.value)).join(', ');
    const notes=$('#variantNotes')?.value.trim()||'';
    const firstLine=phrase
      ? `Hola, quiero ${qty} ${title} (${code}) con ${phrase}.`
      : `Hola, quiero ${qty} ${title} (${code}).`;

    const lines=[firstLine];
    if(chosen.length){
      lines.push('', 'Selección exacta:');
      chosen.forEach(x=>lines.push(`• ${x.label}: ${x.value}`));
    }
    if(notes)lines.push(`• Nota: ${notes}`);
    lines.push(`• Cantidad: ${qty}`);
    if(price){
      lines.push(`• Precio unitario: ${money(price)}`);
      lines.push(`• Total: ${money(price*qty)}`);
    }else if(priceText){
      lines.push(`• Precio: ${priceText}`);
    }
    lines.push('', 'Por favor confírmame disponibilidad.');
    return lines.join('\n');
  }

  function syncLabel(){
    const wa=$('#waConsult');
    if(!wa)return;
    const hasVariants=$$('#variantGroups .variant-group').length>0;
    wa.textContent=hasVariants?'Consultar esta selección por WhatsApp':'Consultar por WhatsApp';
  }

  document.addEventListener('click',e=>{
    const wa=e.target.closest('#waConsult');
    if(!wa)return;
    e.preventDefault();
    const text=buildMessage();
    if(!text)return;
    const url=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
    window.open(url,'_blank','noopener');
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-variant-group][data-variant-value]'))setTimeout(syncLabel,0);
    if(e.target.closest('[data-open]'))setTimeout(syncLabel,180);
  });
  document.addEventListener('input',e=>{if(e.target.matches('[data-variant-text],#variantNotes'))syncLabel()});

  const modal=$('#productModal');
  if(modal)new MutationObserver(syncLabel).observe(modal,{attributes:true,attributeFilter:['class','aria-hidden']});
  setTimeout(syncLabel,250);
  setTimeout(syncLabel,1000);
})();
