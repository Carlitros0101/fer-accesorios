const instagram='https://www.instagram.com/fer_accesorioss_/';
const base='https://raw.githubusercontent.com/Carlitros0101/fer-accesorios/main/assets/productos/';
const products=[
{name:'Pieza 01',category:'Accesorios',image:base+'WhatsApp%20Image%202026-09-06%20at%2011.00.24%20PM.jpeg'},
{name:'Pieza 02',category:'Accesorios',image:base+'WhatsApp%20Image%202026-09-06%20at%2011.00.36%20PM.jpeg'},
{name:'Pieza 03',category:'Accesorios',image:base+'WhatsApp%20Image%202026-09-06%20at%2011.00.50%20PM.jpeg'}
];
const grid=document.querySelector('#grid');
function render(f='Todos'){
 const filtered=products.filter(p=>f==='Todos'||p.category===f);
 grid.innerHTML=filtered.map(p=>`<article class="card real-card"><div class="visual real"><img src="${p.image}" alt="Accesorio artesanal Fer" loading="eager" decoding="async" onerror="this.closest('.visual').classList.add('img-error');this.style.display='none'"></div><div class="info"><strong>${p.name}</strong><p>Pieza artesanal · Fer Accesorios</p><a href="${instagram}" target="_blank" rel="noopener">Consultar disponibilidad →</a></div></article>`).join('')||'<p class="empty">Pronto agregaremos piezas en esta categoría.</p>';
}
document.querySelectorAll('[data-f]').forEach((b,i)=>{if(i===0)b.classList.add('active');b.onclick=()=>{document.querySelectorAll('[data-f]').forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.f)}});
document.querySelector('#year').textContent=new Date().getFullYear();
render();