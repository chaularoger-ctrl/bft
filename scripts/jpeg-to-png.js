#!/usr/bin/env node
'use strict';
/*
 * Decoder JPEG baseline (puro JS, nessuna dipendenza) -> RGBA, con encoder PNG.
 * Serve a convertire le immagini logo (JPEG) nelle icone PNG quadrate richieste
 * da iOS/Android, che altrimenti non potremmo generare in questo ambiente.
 * Supporta: baseline DCT (SOF0), Huffman, sottocampionamento croma, restart.
 *
 * Uso: node scripts/jpeg-to-png.js <in.jpg> <out.png> [size] [bg]
 *   size : se indicato, ritaglia al quadrato centrale e ridimensiona a size x size
 *   bg   : colore di sfondo "r,g,b" per comporre eventuale trasparenza (default 255,255,255)
 */
const fs = require('fs');
const zlib = require('zlib');

const ZIGZAG = [
   0, 1, 8,16, 9, 2, 3,10,
  17,24,32,25,18,11, 4, 5,
  12,19,26,33,40,48,41,34,
  27,20,13, 6, 7,14,21,28,
  35,42,49,56,57,50,43,36,
  29,22,15,23,30,37,44,51,
  58,59,52,45,38,31,39,46,
  53,60,61,54,47,55,62,63
];

function buildHuffman(bits, values){
  // bits: array length 16 con numero di codici per lunghezza; values: simboli
  const tree = [];
  let code = 0, k = 0;
  const maxcode = [], valptr = [], mincode = [];
  // costruiamo tabella di lookup per lunghezza
  const codes = [];
  for(let len=1; len<=16; len++){
    for(let i=0;i<bits[len-1];i++){
      codes.push({ len, code: code, value: values[k++] });
      code++;
    }
    code <<= 1;
  }
  // lookup map: chiave "len:code"
  const map = new Map();
  for(const c of codes) map.set(c.len*65536 + c.code, c.value);
  return { map, maxLen: codes.reduce((m,c)=>Math.max(m,c.len),0) };
}

function decodeJPEG(buf){
  let p = 0;
  const len = buf.length;
  function u16(){ const v=(buf[p]<<8)|buf[p+1]; p+=2; return v; }

  const quant = {};        // id -> Int32Array(64) in ordine naturale
  const huffDC = {}, huffAC = {};
  let frame = null;
  let restartInterval = 0;

  if(u16() !== 0xFFD8) throw new Error('Non e un JPEG (SOI mancante)');

  while(p < len){
    if(buf[p] !== 0xFF){ p++; continue; }
    let marker = buf[p+1]; p += 2;
    if(marker === 0xD9) break; // EOI
    if(marker === 0x01 || (marker>=0xD0 && marker<=0xD7)) continue; // standalone
    const segLen = u16();
    const segEnd = p + segLen - 2;

    if(marker === 0xDB){ // DQT
      while(p < segEnd){
        const pq = buf[p]>>4, tq = buf[p]&15; p++;
        const t = new Int32Array(64);
        for(let i=0;i<64;i++){ t[ZIGZAG[i]] = pq? u16() : buf[p++]; }
        quant[tq] = t;
      }
    } else if(marker === 0xC0 || marker === 0xC1){ // SOF0/1 baseline
      const precision = buf[p++];
      const h = u16(); const w = u16();
      const nc = buf[p++];
      const comps = [];
      let maxH=1, maxV=1;
      for(let i=0;i<nc;i++){
        const id = buf[p++];
        const hv = buf[p++];
        const cH = hv>>4, cV = hv&15;
        const tq = buf[p++];
        maxH = Math.max(maxH,cH); maxV = Math.max(maxV,cV);
        comps.push({ id, h:cH, v:cV, tq });
      }
      frame = { w, h, comps, maxH, maxV };
    } else if(marker === 0xC2){
      throw new Error('JPEG progressivo non supportato');
    } else if(marker === 0xC4){ // DHT
      while(p < segEnd){
        const tc = buf[p]>>4, th = buf[p]&15; p++;
        const bits = [];
        let total=0;
        for(let i=0;i<16;i++){ bits.push(buf[p++]); total+=bits[i]; }
        const values = [];
        for(let i=0;i<total;i++) values.push(buf[p++]);
        const tbl = buildHuffman(bits, values);
        if(tc===0) huffDC[th]=tbl; else huffAC[th]=tbl;
      }
    } else if(marker === 0xDD){ // DRI
      restartInterval = u16();
    } else if(marker === 0xDA){ // SOS
      const ns = buf[p++];
      const scanComps = [];
      for(let i=0;i<ns;i++){
        const cs = buf[p++];
        const td = buf[p]>>4, ta = buf[p]&15; p++;
        const comp = frame.comps.find(c=>c.id===cs);
        scanComps.push({ comp, td, ta });
      }
      p += 3; // Ss, Se, Ah/Al (baseline: 0,63,0)
      p = decodeScan(buf, p, frame, scanComps, huffDC, huffAC, quant, restartInterval);
      // dopo lo scan baseline abbiamo finito i dati immagine
      continue;
    } else {
      // segmento non gestito: salta
    }
    p = segEnd;
  }

  return frame.out; // RGBA Uint8 width*height*4
}

function decodeScan(buf, p, frame, scanComps, huffDC, huffAC, quant, restartInterval){
  const { w, h, maxH, maxV } = frame;
  const mcuW = 8*maxH, mcuV = 8*maxV;
  const mcusX = Math.ceil(w/mcuW), mcusY = Math.ceil(h/mcuV);

  // piani per componente alla loro risoluzione campionata
  for(const c of frame.comps){
    c.bw = mcusX * c.h;            // blocchi in larghezza
    c.bh = mcusY * c.v;            // blocchi in altezza
    c.pw = c.bw * 8;
    c.ph = c.bh * 8;
    c.data = new Uint8ClampedArray(c.pw * c.ph);
    c.pred = 0;
  }

  // bit reader con destuffing
  let bitBuf = 0, bitCnt = 0, marker = 0;
  function reset(){ bitBuf=0; bitCnt=0; }
  function readBit(){
    if(bitCnt===0){
      if(p >= buf.length){ return 0; }
      let b = buf[p++];
      if(b === 0xFF){
        const n = buf[p];
        if(n === 0x00){ p++; }
        else if(n>=0xD0 && n<=0xD7){ /* restart, lo gestisce il chiamante */ p--; marker=n; return -1; }
        else { p--; marker=n; return -1; }
      }
      bitBuf = b; bitCnt = 8;
    }
    bitCnt--;
    return (bitBuf >> bitCnt) & 1;
  }
  function readBits(n){ let v=0; for(let i=0;i<n;i++){ const b=readBit(); if(b<0) return v; v=(v<<1)|b; } return v; }
  function decodeHuff(tbl){
    let code=0;
    for(let l=1; l<=16; l++){
      const b=readBit(); if(b<0) return 0;
      code=(code<<1)|b;
      const v=tbl.map.get(l*65536+code);
      if(v!==undefined) return v;
    }
    return 0;
  }
  function extend(v, t){ return v < (1<<(t-1)) ? v - (1<<t) + 1 : v; }

  const block = new Int32Array(64);
  function decodeBlock(c, sc){
    block.fill(0);
    const t = decodeHuff(huffDC[sc.td]);
    const diff = t? extend(readBits(t), t) : 0;
    c.pred += diff;
    const q = quant[c.tq];
    block[0] = c.pred * q[0];
    let k=1;
    while(k<64){
      const rs = decodeHuff(huffAC[sc.ta]);
      const r = rs>>4, s = rs&15;
      if(s===0){ if(r===15){ k+=16; continue; } else break; }
      k += r;
      if(k>=64) break;
      const val = extend(readBits(s), s);
      block[ZIGZAG[k]] = val * q[ZIGZAG[k]];
      k++;
    }
    return block;
  }

  let restartCount = 0;
  function handleRestart(){
    // allinea a byte e consuma marker RSTn
    reset();
    if(marker>=0xD0 && marker<=0xD7){ p+=2; marker=0; }
    else {
      // cerca RSTn
      while(p<buf.length-1){ if(buf[p]===0xFF && buf[p+1]>=0xD0 && buf[p+1]<=0xD7){ p+=2; break; } p++; }
    }
    for(const c of frame.comps) c.pred = 0;
  }

  const idctTmp = new Float32Array(64);
  for(let my=0; my<mcusY; my++){
    for(let mx=0; mx<mcusX; mx++){
      for(const sc of scanComps){
        const c = sc.comp;
        for(let by=0; by<c.v; by++){
          for(let bx=0; bx<c.h; bx++){
            const blk = decodeBlock(c, sc);
            idct(blk, idctTmp);
            const ox = (mx*c.h + bx)*8;
            const oy = (my*c.v + by)*8;
            for(let yy=0; yy<8; yy++){
              let di = (oy+yy)*c.pw + ox;
              let si = yy*8;
              for(let xx=0; xx<8; xx++){ c.data[di+xx] = idctTmp[si+xx]; }
            }
          }
        }
      }
      restartCount++;
      if(restartInterval && restartCount % restartInterval === 0 && !(my===mcusY-1 && mx===mcusX-1)){
        handleRestart();
      }
    }
  }

  // ricomposizione RGBA con upsampling nearest
  const out = new Uint8ClampedArray(w*h*4);
  const comps = frame.comps;
  const Y = comps[0];
  const Cb = comps[1]; const Cr = comps[2];
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const yi = Y.data[Math.min((y*Y.v/maxV|0), Y.ph-1)*Y.pw + Math.min((x*Y.h/maxH|0), Y.pw-1)];
      let r,g,b;
      if(comps.length===1){ r=g=b=yi; }
      else {
        const cbx = Math.min((x*Cb.h/maxH|0), Cb.pw-1), cby = Math.min((y*Cb.v/maxV|0), Cb.ph-1);
        const crx = Math.min((x*Cr.h/maxH|0), Cr.pw-1), cry = Math.min((y*Cr.v/maxV|0), Cr.ph-1);
        const cb = Cb.data[cby*Cb.pw+cbx]-128;
        const cr = Cr.data[cry*Cr.pw+crx]-128;
        r = yi + 1.402*cr;
        g = yi - 0.344136*cb - 0.714136*cr;
        b = yi + 1.772*cb;
      }
      const o=(y*w+x)*4;
      out[o]=r; out[o+1]=g; out[o+2]=b; out[o+3]=255;
    }
  }
  frame.out = out;
  return p;
}

// IDCT 8x8 separabile (float)
const C = new Float32Array(8);
for(let u=0;u<8;u++) C[u] = u===0 ? Math.SQRT1_2 : 1;
const COS = [];
for(let x=0;x<8;x++){ COS[x]=new Float32Array(8); for(let u=0;u<8;u++) COS[x][u]=Math.cos((2*x+1)*u*Math.PI/16); }
function idct(blk, out){
  const tmp = new Float32Array(64);
  // righe
  for(let y=0;y<8;y++){
    for(let x=0;x<8;x++){
      let s=0;
      for(let u=0;u<8;u++) s += C[u]*blk[y*8+u]*COS[x][u];
      tmp[y*8+x]=s*0.5;
    }
  }
  // colonne
  for(let x=0;x<8;x++){
    for(let y=0;y<8;y++){
      let s=0;
      for(let v=0;v<8;v++) s += C[v]*tmp[v*8+x]*COS[y][v];
      out[y*8+x]=s*0.5 + 128;
    }
  }
}

// --- ridimensionamento (box filter) con crop quadrato centrale ---
function resizeSquare(rgba, w, h, size){
  const side = Math.min(w,h);
  const ox = (w-side)>>1, oy=(h-side)>>1;
  const out = Buffer.alloc(size*size*4);
  for(let j=0;j<size;j++){
    const sy0 = oy + Math.floor(j*side/size), sy1 = oy + Math.floor((j+1)*side/size);
    for(let i=0;i<size;i++){
      const sx0 = ox + Math.floor(i*side/size), sx1 = ox + Math.floor((i+1)*side/size);
      let r=0,g=0,b=0,n=0;
      for(let y=Math.max(sy0,0); y<Math.min(sy1,h) || (y===sy0); y++){
        if(y>=h) break;
        for(let x=Math.max(sx0,0); x<Math.min(sx1,w) || (x===sx0); x++){
          if(x>=w) break;
          const o=(y*w+x)*4; r+=rgba[o]; g+=rgba[o+1]; b+=rgba[o+2]; n++;
        }
      }
      const o=(j*size+i)*4;
      out[o]=Math.round(r/n); out[o+1]=Math.round(g/n); out[o+2]=Math.round(b/n); out[o+3]=255;
    }
  }
  return out;
}

// --- encoder PNG ---
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function chunk(type,data){const l=Buffer.alloc(4);l.writeUInt32BE(data.length,0);const tb=Buffer.from(type,'ascii');const body=Buffer.concat([tb,data]);const cb=Buffer.alloc(4);cb.writeUInt32BE(crc32(body),0);return Buffer.concat([l,body,cb]);}
function encodePNG(size, rgba){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4); ihdr[8]=8; ihdr[9]=6;
  const raw=Buffer.alloc(size*(size*4+1));
  for(let y=0;y<size;y++){ raw[y*(size*4+1)]=0; rgba.copy(raw,y*(size*4+1)+1,y*size*4,(y+1)*size*4); }
  const idat=zlib.deflateSync(raw,{level:9});
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]);
}

module.exports = { decodeJPEG, resizeSquare, encodePNG };

if(require.main === module){
  const [,, inF, outF, sizeArg] = process.argv;
  if(!inF || !outF){ console.error('uso: node jpeg-to-png.js <in.jpg> <out.png> [size]'); process.exit(1); }
  const buf = fs.readFileSync(inF);
  // recupera dimensioni dal frame
  const t0=Date.now();
  const rgba = decodeJPEG(buf);
  // serve w,h: rilegge SOF velocemente
  let w=0,h=0,p=2;
  while(p<buf.length){ if(buf[p]!==0xFF){p++;continue;} const m=buf[p+1]; p+=2; if(m>=0xD0&&m<=0xD9||m===0x01) continue; const sl=(buf[p]<<8)|buf[p+1]; if(m===0xC0||m===0xC1){ h=(buf[p+3]<<8)|buf[p+4]; w=(buf[p+5]<<8)|buf[p+6]; break;} p+=sl; }
  if(sizeArg){ const s=+sizeArg; fs.writeFileSync(outF, encodePNG(s, resizeSquare(rgba,w,h,s))); }
  else { fs.writeFileSync(outF, encodePNG(w, /*solo quadrate*/ resizeSquare(rgba,w,h,Math.min(w,h)))); }
  console.log('OK', outF, w+'x'+h, '->', sizeArg||Math.min(w,h), (Date.now()-t0)+'ms');
}
