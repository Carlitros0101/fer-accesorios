# Cómo agregar nuevos productos a Fer Accesorios

La web ahora usa `catalogo.js` como fuente única de productos.

## Flujo recomendado

1. Subir la nueva foto a `assets/productos/`.
2. Abrir `catalogo.js`.
3. Copiar uno de los bloques existentes y cambiar:
   - `code`: código único, por ejemplo `FER-004`.
   - `name`: nombre confirmado del producto.
   - `image`: ruta exacta de la fotografía.
   - `category`: categoría.
   - `price`: precio numérico cuando esté confirmado; usar `null` mientras no exista.
   - `available`: `true`, `false` o `null` si aún no está confirmado.
   - `isNew`: `true` para mostrarlo en Novedades.
   - `order`: número que define el orden en la colección.
4. Guardar el archivo. GitHub Pages actualizará automáticamente la web.

## Ejemplo

```js
{
  code:'FER-004',
  name:'Nombre confirmado',
  image:'assets/productos/nueva-foto.jpeg',
  category:'Accesorios',
  price:null,
  available:null,
  isNew:true,
  order:4
}
```

No incorporar precios, disponibilidad o nombres comerciales sin confirmación.