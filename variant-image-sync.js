(() => {
  const details=new Map();
  let variants={};
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function currentCode(){return document.querySelector('#metaCode')?.textContent.trim()||''}
  function currentImages(code){return details.get(code)?.imagenes||[]}
  function optionValue(o){return typeof o==='string'?o:(o?.value??o?.label??'')}

  async function load(){
    try{
      const [cat,varRes]=await Promise.all([
        fetch('data/catalogo-whatsapp-auto.json?v=20260915-variant-images-v1',{cache:'no-store'}),
        fetch('data/product-variants.json?v=20260915-variant-images-v1',{cache:'no-store'})
      ]);
      if(cat.ok){const arr=await cat.json();arr.forEach(x=>details.set(x.codigo,x))}
      if(varRes.ok)variants=await varRes.json();
    }catch(err){console.warn('FER: no se pudo cargar asociación variante-imagen',err)}
  }

  function setImage(code,index,src=''){
    const imgs=currentImages(code);
    if(Number.isInteger(index)&&index>=0&&index<imgs.length){
      if(typeof window.setModalImage==='function'){
        window.setModalImage(index);
        return;
      }
      src=imgs[index];
    }
    if(src){
      const modal=document.querySelector('#modalImg');
      if(modal)modal.src=src;
    }
  }

  function syncFromButton(button){
    const code=currentCode();
    if(!code)return;
    const groupName=button.dataset.variantGroup||'';
    const value=button.dataset.variantValue||'';
    const spec=variants[code];
    const group=spec?.groups?.find(g=>g.name===groupName);
    const imgs=currentImages(code);

    if(group?.type==='images'){
      const buttons=[...button.closest('.variant-images')?.querySelectorAll('[data-variant-group]')||[]];
      const idx=buttons.indexOf(button);
      setImage(code,idx,button.dataset.variantImage||'');
      return;
    }

    if(!group||!Array.isArray(group.options))return;
    const optionIndex=group.options.findIndex(o=>norm(optionValue(o))===norm(value));
    if(optionIndex<0)return;
    const option=group.options[optionIndex];

    if(typeof option==='object'&&option){
      if(Number.isInteger(option.imageIndex)){
        setImage(code,option.imageIndex,option.image||'');
        return;
      }
      if(option.image){
        const idx=imgs.indexOf(option.image);
        setImage(code,idx,option.image);
        return;
      }
    }

    const visual=/color|piedra|modelo|variante/i.test(groupName);
    if(visual&&imgs.length>=group.options.length)setImage(code,optionIndex);
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-variant-group][data-variant-value]');
    if(button)setTimeout(()=>syncFromButton(button),0);
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
