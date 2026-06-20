#!/usr/bin/env node
'use strict';
/*
 * Generatore icone PWA per BFT — marchio felino (mezzo muso) line-art.
 * Disegna su tile scura: contorno testa/orecchio, occhio oro, muso, baffi,
 * linea di taglio centrale. Nessuna dipendenza esterna (encoder PNG incluso).
 * La stessa geometria genera anche icon.svg, così PNG e SVG coincidono.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const TILE = [0x14, 0x16, 0x19];   // tile scura
const LINE = [0xF2, 0xF2, 0xEF];   // linee chiare
const GOLD = [0xF4, 0xC4, 0x00];   // occhio / accento oro

/* --- geometria del felino in spazio locale 0..1 (x→destra, y→giù) --- */
const STROKES = [
  // contorno: fronte → orecchio a punta → nuca → guancia → mento
  [[0.50,0.21],[0.54,0.13],[0.585,0.075],[0.635,0.06],[0.70,0.085],[0.755,0.145],[0.80,0.24],[0.815,0.34],[0.795,0.45],[0.75,0.55],[0.67,0.63],[0.58,0.675],[0.51,0.695]],
  // linea di taglio centrale
  [[0.50,0.19],[0.50,0.70]],
  // piega interna orecchio
  [[0.605,0.15],[0.645,0.125],[0.685,0.165]],
  // palpebra superiore
  [[0.55,0.395],[0.62,0.36],[0.69,0.365],[0.735,0.405]],
  // palpebra inferiore
  [[0.57,0.43],[0.63,0.46],[0.69,0.452],[0.735,0.41]],
  // baffi
  [[0.53,0.59],[0.64,0.582],[0.74,0.575]],
  [[0.53,0.605],[0.65,0.612],[0.755,0.63]],
  [[0.53,0.62],[0.63,0.642],[0.72,0.668]],
];
const EYE = [0.645, 0.402, 0.042];            // cx, cy, r (occhio oro)
const NOSE = [[0.505,0.55],[0.555,0.55],[0.53,0.598]]; // muso

/* --- centra e scala la geometria nel suo bounding box --- */
const PTS = [];
STROKES.forEach(s => s.forEach(p => PTS.push(p)));
NOSE.forEach(p => PTS.push(p));
PTS.push([EYE[0]-EYE[2], EYE[1]-EYE[2]], [EYE[0]+EYE[2], EYE[1]+EYE[2]]);
let bx0=1, by0=1, bx1=0, by1=0;
PTS.forEach(p => { bx0=Math.min(bx0,p[0]); by0=Math.min(by0,p[1]); bx1=Math.max(bx1,p[0]); by1=Math.max(by1,p[1]); });
const bcx=(bx0+bx1)/2, bcy=(by0+by1)/2, bext=Math.max(bx1-bx0, by1-by0);
function fit(p, scale){ return [0.5+((p[0]-bcx)/bext)*scale, 0.5+((p[1]-bcy)/bext)*scale]; }

function distSeg(px,py, ax,ay, bx,by){
  const dx=bx-ax, dy=by-ay; const l2=dx*dx+dy*dy;
  let t = l2>0 ? ((px-ax)*dx+(py-ay)*dy)/l2 : 0;
  t = t<0?0:(t>1?1:t);
  const cx=ax+t*dx, cy=ay+t*dy;
  return Math.hypot(px-cx, py-cy);
}
function inTri(px,py, t){
  const [a,b,c]=t;
  const d1=(px-b[0])*(a[1]-b[1])-(a[0]-b[0])*(py-b[1]);
  const d2=(px-c[0])*(b[1]-c[1])-(b[0]-c[0])*(py-c[1]);
  const d3=(px-a[0])*(c[1]-a[1])-(c[0]-a[0])*(py-a[1]);
  const neg=(d1<0)||(d2<0)||(d3<0), pos=(d1>0)||(d2>0)||(d3>0);
  return !(neg&&pos);
}
function inRoundRect(x,y,r){
  const [x0,y0,x1,y1,rad]=r;
  if(x<x0||x>x1||y<y0||y>y1) return false;
  if(rad<=0) return true;
  const cx=Math.min(Math.max(x,x0+rad),x1-rad);
  const cy=Math.min(Math.max(y,y0+rad),y1-rad);
  const dx=x-cx, dy=y-cy;
  return dx*dx+dy*dy<=rad*rad;
}

/* colore del felino in un punto (coord locali 0..1, già fit), o null = tile */
function felineColor(x,y, hw, scale){
  const e=fit(EYE, scale); const er=(EYE[2]/bext)*scale;
  const dx=x-e[0], dy=y-e[1];
  if(dx*dx+dy*dy <= er*er) return GOLD;
  for(let s=0;s<STROKES.length;s++){
    const pl=STROKES[s];
    for(let i=0;i<pl.length-1;i++){
      const a=fit(pl[i],scale), b=fit(pl[i+1],scale);
      if(distSeg(x,y,a[0],a[1],b[0],b[1])<=hw) return LINE;
    }
  }
  const n=[fit(NOSE[0],scale),fit(NOSE[1],scale),fit(NOSE[2],scale)];
  if(inTri(x,y,n)) return LINE;
  return null;
}

function render(size, opts){
  const ss=4, N=ss*ss;
  const bg=opts.bg, scale=opts.scale;
  const hw=Math.max(0.011, 1.0/size);
  const buf=Buffer.alloc(size*size*4);
  for(let j=0;j<size;j++){
    for(let i=0;i<size;i++){
      let sr=0,sg=0,sb=0,cov=0;
      for(let sy=0;sy<ss;sy++){
        for(let sx=0;sx<ss;sx++){
          const x=(i+(sx+0.5)/ss)/size;
          const y=(j+(sy+0.5)/ss)/size;
          const inBg = bg ? inRoundRect(x,y,bg) : true;
          if(!inBg) continue;
          const fc=felineColor(x,y,hw,scale);
          const c=fc||TILE;
          sr+=c[0]; sg+=c[1]; sb+=c[2]; cov++;
        }
      }
      const o=(j*size+i)*4;
      if(cov>0){
        buf[o]=Math.round(sr/cov); buf[o+1]=Math.round(sg/cov); buf[o+2]=Math.round(sb/cov);
        buf[o+3]=Math.round((cov/N)*255);
      }
    }
  }
  return buf;
}

/* --- encoder PNG (RGBA, color type 6) --- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(buf){let c=0xFFFFFFFF;for(let i=0;i<buf.length;i++)c=CRC[(c^buf[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);const tb=Buffer.from(type,'ascii');const body=Buffer.concat([tb,data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(body),0);return Buffer.concat([len,body,crc]);}
function encodePNG(size,rgba){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const raw=Buffer.alloc(size*(size*4+1));
  for(let y=0;y<size;y++){ raw[y*(size*4+1)]=0; rgba.copy(raw,y*(size*4+1)+1,y*size*4,(y+1)*size*4); }
  const idat=zlib.deflateSync(raw,{level:9});
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]);
}

/* --- icon.svg vettoriale coerente coi PNG --- */
function rgb(a){return 'rgb('+a[0]+','+a[1]+','+a[2]+')';}
function svgIcon(scale, bg){
  const P=512;
  const M=p=>{const f=fit(p,scale); return [(f[0]*P).toFixed(1),(f[1]*P).toFixed(1)];};
  const poly=pl=>'<polyline points="'+pl.map(p=>M(p).join(',')).join(' ')+'" fill="none" stroke="'+rgb(LINE)+'" stroke-width="'+(0.022*P).toFixed(1)+'" stroke-linecap="round" stroke-linejoin="round"/>';
  const e=M(EYE); const er=((EYE[2]/bext)*scale*P).toFixed(1);
  const n=[M(NOSE[0]),M(NOSE[1]),M(NOSE[2])];
  const bgEl = bg
    ? '<rect x="'+(bg[0]*P).toFixed(1)+'" y="'+(bg[1]*P).toFixed(1)+'" width="'+((bg[2]-bg[0])*P).toFixed(1)+'" height="'+((bg[3]-bg[1])*P).toFixed(1)+'" rx="'+(bg[4]*P).toFixed(1)+'" fill="'+rgb(TILE)+'"/>'
    : '<rect width="512" height="512" fill="'+rgb(TILE)+'"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n'+bgEl+'\n'+
    STROKES.map(poly).join('\n')+'\n'+
    '<polygon points="'+n.map(p=>p.join(',')).join(' ')+'" fill="'+rgb(LINE)+'"/>\n'+
    '<circle cx="'+e[0]+'" cy="'+e[1]+'" r="'+er+'" fill="'+rgb(GOLD)+'"/>\n</svg>\n';
}

const outDir=path.join(__dirname,'..','icons');
fs.mkdirSync(outDir,{recursive:true});
const NORMAL={ scale:0.86, bg:[0.02,0.02,0.98,0.98,0.22] };
const MASKABLE={ scale:0.62, bg:null };
const APPLE={ scale:0.82, bg:null };

function writePNG(name,size,opts){
  const data=encodePNG(size,render(size,opts));
  fs.writeFileSync(path.join(outDir,name),data);
  console.log('  ',name,size+'x'+size,(data.length/1024).toFixed(1)+' KB');
}
console.log('Generazione icone felino in /icons:');
writePNG('icon-192.png',192,NORMAL);
writePNG('icon-512.png',512,NORMAL);
writePNG('icon-maskable-512.png',512,MASKABLE);
writePNG('apple-touch-icon.png',180,APPLE);
writePNG('favicon-32.png',32,NORMAL);
writePNG('favicon-16.png',16,NORMAL);
fs.writeFileSync(path.join(outDir,'icon.svg'),svgIcon(NORMAL.scale,NORMAL.bg));
console.log('   icon.svg');
console.log('Fatto.');
