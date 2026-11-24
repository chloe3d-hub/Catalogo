/* Regenera data/products.json a partir de data/products.js.
   La página del catálogo lee products.js y el tracker (Yi Shu Manager) lee products.json: tienen que ser idénticos.
   Después de cambiar un producto en products.js, ejecuta:  node tools/sincronizar-json.js */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'data');
const src = fs.readFileSync(path.join(dir, 'products.js'), 'utf8');
const datos = new Function(src + ';return YISHU_DATA;')();
fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(datos, null, 2));
console.log('products.json actualizado: ' + datos.sections.reduce((n, s) => n + s.products.length, 0) + ' productos.');
