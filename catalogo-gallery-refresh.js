(async function refreshFerGalleries(){
  try{
    const r=await fetch('data/catalogo-whatsapp-auto.json?v=20260914-gallery-v11',{cache:'no-store'});
    if(!r.ok)return;
    const data=await r.json();
    data.forEach(x=>{
      const p=sourceProducts.find(y=>y.code===x.codigo);
      if(!p)return;
      if(x.descripcion)descMap.set(x.codigo,x.descripcion);
      if(Array.isArray(x.imagenes)&&x.imagenes.length){
        p.images=[...new Set(x.imagenes.filter(Boolean))];
        p.image=p.images[0]||p.image;
      }
    });
    renderHero();
    renderCatalog(false);
    const code=new URLSearchParams(location.search).get('producto');
    if(code){
      setTimeout(()=>openProduct(code,false),0);
    }
  }catch(e){
    console.error('No se pudieron refrescar las galerías de FER',e);
  }
})();
