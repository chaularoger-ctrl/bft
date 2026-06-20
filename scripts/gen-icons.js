#!/usr/bin/env node
'use strict';
/*
 * Generatore icone PWA da una foto logo (JPEG) — usa il decoder puro-JS.
 * Sorgente: icons/logo-panther.jpg (pantera, sfondo chiaro).
 * Produce: favicon 16/32, apple-touch 180, icon 192/512, maskable 512, icon.svg.
 *   - icone normali: crop quadrato "cover" (la pantera riempie il riquadro)
 *   - maskable: "contain" con margine di sicurezza per il ritaglio adattivo Android
 *   - icon.svg: foto incorporata (data URI) per i contesti vettoriali (tab)
 */
const fs = require('fs');
const path = require('path');
const { decodeJPEG, resizeSquare, encodePNG } = require('./jpeg-to-png');

const SRC = path.join(__dirname, '..', 'icons', 'logo-panther.jpg');
const outDir = path.join(__dirname, '..', 'icons');

const jpg = fs.readFileSync(SRC);
const rgba = decodeJPEG(jpg);
// dimensioni dal frame SOF0
let w=0,h=0,p=2;
while(p<jpg.length){ if(jpg[p]!==0xFF){p++;continue;} const m=jpg[p+1]; p+=2; if((m>=0xD0&&m<=0xD9)||m===0x01) continue; const sl=(jpg[p]<<8)|jpg[p+1]; if(m===0xC0||m===0xC1){ h=(jpg[p+3]<<8)|jpg[p+4]; w=(jpg[p+5]<<8)|jpg[p+6]; break;} p+=sl; }

// colore di sfondo = media dei quattro angoli (per riempire i margini in modo invisibile)
function corner(x,y){ const o=(y*w+x)*4; return [rgba[o],rgba[o+1],rgba[o+2]]; }
const cs=[corner(0,0),corner(w-1,0),corner(0,h-1),corner(w-1,h-1)];
const BG=[0,1,2].map(k=>Math.round(cs.reduce((s,c)=>s+c[k],0)/4));

// "contain" su tela quadrata con margine pad (0..0.5) e sfondo BG
function resizeContain(size, pad){
  const out=Buffer.alloc(size*size*4);
  for(let i=0;i<out.length;i+=4){ out[i]=BG[0]; out[i+1]=BG[1]; out[i+2]=BG[2]; out[i+3]=255; }
  const inner=Math.round(size*(1-2*pad));
  const side=Math.min(w,h), ox=(w-side)>>1, oy=(h-side)>>1;
  const off=Math.round(size*pad);
  for(let j=0;j<inner;j++){
    const sy0=oy+Math.floor(j*side/inner), sy1=oy+Math.floor((j+1)*side/inner);
    for(let i=0;i<inner;i++){
      const sx0=ox+Math.floor(i*side/inner), sx1=ox+Math.floor((i+1)*side/inner);
      let r=0,g=0,b=0,n=0;
      for(let y=sy0;y<=sy1&&y<h;y++) for(let x=sx0;x<=sx1&&x<w;x++){ const o=(y*w+x)*4; r+=rgba[o];g+=rgba[o+1];b+=rgba[o+2];n++; }
      const o=((j+off)*size+(i+off))*4;
      out[o]=Math.round(r/n); out[o+1]=Math.round(g/n); out[o+2]=Math.round(b/n); out[o+3]=255;
    }
  }
  return out;
}

function write(name, size, data){ fs.writeFileSync(path.join(outDir,name), encodePNG(size,data)); console.log('  ', name, size+'x'+size); }

console.log('Generazione icone pantera in /icons (bg '+BG.join(',')+'):');
const cover = (s)=>resizeSquare(rgba,w,h,s);
write('icon-192.png',192, cover(192));
write('icon-512.png',512, cover(512));
write('apple-touch-icon.png',180, cover(180));
write('favicon-32.png',32, cover(32));
write('favicon-16.png',16, cover(16));
write('icon-maskable-512.png',512, resizeContain(512, 0.14));

// icon.svg con la foto incorporata, ritaglio quadrato centrale
const b64 = jpg.toString('base64');
const side=Math.min(w,h), vx=((w-side)/2).toFixed(1);
const svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
 +'viewBox="'+vx+' 0 '+side+' '+side+'" width="'+side+'" height="'+side+'">\n'
 +'<rect x="'+vx+'" y="0" width="'+side+'" height="'+side+'" fill="rgb('+BG.join(',')+')"/>\n'
 +'<image x="0" y="0" width="'+w+'" height="'+h+'" xlink:href="data:image/jpeg;base64,'+b64+'"/>\n'
 +'</svg>\n';
fs.writeFileSync(path.join(outDir,'icon.svg'), svg);
console.log('   icon.svg ('+Math.round(svg.length/1024)+' KB)');
console.log('Fatto.');
