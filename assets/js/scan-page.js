(function () {
  'use strict';

  function initScan() {
    var $ = function (id) { return document.getElementById(id); };
    if (!$('scCanvas') || !$('scOut')) return; // tidak ada UI scan di halaman ini

  var stage = $('scStage');
  var cvs = $('scCanvas');
  var ctx = cvs.getContext('2d', { willReadFrequently: true });
  var outCvs = $('scOut');
  var outCtx = outCvs.getContext('2d');

  var fileIn = $('scFile');
  var btnOpen = $('scOpen');
  var btnAuto = $('scAuto');
  var btnReset = $('scReset');
  var btnToggle = $('scToggleEdit');
  var btnApply = $('scApplyWarp');
  var btnDown = $('scDownload');
  var hint = $('scHint');
  var statusEl = $('scStatus');

  var rBlur = $('rBlur'), vBlur = $('vBlur');
  var rC1 = $('rC1'), vC1 = $('vC1');
  var rC2 = $('rC2'), vC2 = $('vC2');
  var rArea = $('rArea'), vArea = $('vArea');

  var chips = document.querySelectorAll('.sc-chip');
  var filterMode = 'none';

  var img = null;
  var imgW = 0, imgH = 0;
  var dispW = 0, dispH = 0;
  var scaleDisp = 1;
  var scaleImg = 1;

  var pts = null;
  var ptsDisp = null;
  var editMode = false;
  var dragging = -1;
  var hover = -1;

  var MAX_DET = 1600;
  /* Jarak penebalan tepi (px pada skala deteksi) supaya outline dokumen
     yang terputus oleh teks/gambar di halaman tetap menyambung. */
  var EDGE_JOIN = 2;
  /* Toleransi deempan gambar (px) untuk membedakan outline dokumen asli
     dari artefak blur tepat di batas frame. */
  var FRAME_TOL = 3;
  /* Kepadatan piksel tepi minimum (fraksi dari luas gambar) sebelum auto-detect
     dicoba. Nilai kecil karena tepi cuma membentuk garis, bukan bidang. */
  var EDGE_MIN_FRAC = 0.008;
  var _srcCache = null, _srcW = 0, _srcH = 0;

  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function dist2(a,b){ var dx=a.x-b.x,dy=a.y-b.y; return dx*dx+dy*dy; }
  function areaPoly(p){
    var s=0;
    for(var i=0;i<4;i++){ var j=(i+1)%4; s += p[i].x*p[j].y - p[j].x*p[i].y; }
    return Math.abs(s)/2;
  }
  function getDispFromImg(p){ return {x:p.x*scaleDisp, y:p.y*scaleDisp}; }
  function getImgFromDisp(p){ return {x:p.x*scaleImg, y:p.y*scaleImg}; }

  function orderPoints(ptsIn){
    var cx=0,cy=0;
    for(var i=0;i<4;i++){ cx+=ptsIn[i].x; cy+=ptsIn[i].y; }
    cx/=4; cy/=4;
    var list=[];
    for(var k=0;k<4;k++){
      var p=ptsIn[k]; var ang=Math.atan2(p.y-cy,p.x-cx);
      list.push({x:p.x,y:p.y,ang:ang});
    }
    list.sort(function(m,n){ return m.ang-n.ang; });
    var b=list.map(function(v){ return {x:v.x,y:v.y}; });
    // approx TL,TR,BR,BL by y+x? fallback
    b.sort(function(m,n){ if(Math.abs(m.y-n.y)>6) return m.y-n.y; return m.x-n.x; });
    var tl=b[0], br=b[3];
    var mid=[b[1],b[2]].sort(function(m,n){ return m.x-n.x; });
    var tr=mid[1], bl=mid[0];
    return [tl,tr,br,bl];
  }

  function resizeCanvasToImage(){
    if(!img) return;
    var w=imgW,h=imgH;
    var maxW=stage.clientWidth||960, maxH=stage.clientHeight||640;
    var r=Math.min(maxW/w, maxH/h, 1);
    dispW=Math.round(w*r); dispH=Math.round(h*r);
    scaleDisp=r; scaleImg=1/r;
    cvs.width=dispW; cvs.height=dispH;
    outCvs.width=Math.max(720, Math.round(w*0.88));
    outCvs.height=Math.max(560, Math.round(h*0.88));
    drawEditor();
    if(pts) applyWarp();
  }

  function drawEditor(){
    if(!img){ ctx.clearRect(0,0,cvs.width,cvs.height); return; }
    ctx.clearRect(0,0,cvs.width,cvs.height);
    ctx.drawImage(img,0,0,dispW,dispH);
    if(ptsDisp && ptsDisp.length===4){
      ctx.save();
      ctx.strokeStyle='rgba(46,230,214,.95)';
      ctx.lineWidth=2.4;
      ctx.beginPath();
      ctx.moveTo(ptsDisp[0].x,ptsDisp[0].y);
      ctx.lineTo(ptsDisp[1].x,ptsDisp[1].y);
      ctx.lineTo(ptsDisp[2].x,ptsDisp[2].y);
      ctx.lineTo(ptsDisp[3].x,ptsDisp[3].y);
      ctx.closePath(); ctx.stroke();
      for(var i=0;i<4;i++){
        var p=ptsDisp[i];
        var r=(i===dragging||i===hover)?8:6;
        ctx.fillStyle=(i===dragging)?'rgba(255,70,85,1)':'rgba(46,230,214,1)';
        ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(10,10,14,.9)'; ctx.lineWidth=1.4; ctx.stroke();
      }
      ctx.restore();
      btnApply.disabled=false; btnReset.disabled=false; btnToggle.disabled=false;
    }else{
      btnApply.disabled=true; btnReset.disabled=true; btnToggle.disabled=true;
    }
    btnAuto.disabled=!img;
    btnDown.disabled=!pts;
  }

  function setHint(s){ hint.textContent=s; hint.classList.remove('hidden'); }
  function hideHint(){ hint.classList.add('hidden'); }

  /* Homografi 4 titik (DLT) memakai Gauss-Jordan dengan pivot parsial.
     Sistem 8x8 linear, lebih stabil dan mudah diverifikasi dibanding
     solver eigenvalue buatan sendiri. Koefisien h8 dibekukan 1. */
  function homography(src,dst){
    var A=[], b=[], i;
    for(i=0;i<4;i++){
      var sx=src[i].x, sy=src[i].y, dx=dst[i].x, dy=dst[i].y;
      /* u = x*h0 + y*h1 + h2 + u*x*h6 + u*y*h7 */
      A.push([sx, sy, 1, 0, 0, 0, -dx*sx, -dx*sy]); b.push(dx);
      /* v = x*h3 + y*h4 + h5 + v*x*h6 + v*y*h7 */
      A.push([0, 0, 0, sx, sy, 1, -dy*sx, -dy*sy]); b.push(dy);
    }
    for(i=0;i<8;i++) A[i].push(b[i]);
    var h=solve8(A);
    if(!h) return null;
    return [h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];
  }

  /* Gauss-Jordan dengan pivot parsial pada matriks augmented 8x9 */
  function solve8(A){
    for(var col=0;col<8;col++){
      var piv=col, best=Math.abs(A[col][col]);
      for(var r2=col+1;r2<8;r2++){
        var v=Math.abs(A[r2][col]);
        if(v>best){ best=v; piv=r2; }
      }
      if(best<1e-10) return null;
      var tmp=A[col]; A[col]=A[piv]; A[piv]=tmp;
      var d=A[col][col];
      for(var c2=col;c2<9;c2++) A[col][c2]/=d;
      for(var r3=0;r3<8;r3++){
        if(r3===col) continue;
        var f=A[r3][col];
        if(f===0) continue;
        for(var c3=col;c3<9;c3++) A[r3][c3]-=f*A[col][c3];
      }
    }
    var out=[];
    for(var r4=0;r4<8;r4++) out[r4]=A[r4][8];
    return out;
  }

  function getSourceData(im,w,h){
    if(_srcCache && _srcW===w && _srcH===h) return _srcCache;
    var c=document.createElement('canvas');
    c.width=w; c.height=h;
    var cc=c.getContext('2d',{willReadFrequently:true});
    cc.drawImage(im,0,0,w,h);
    _srcCache=cc.getImageData(0,0,w,h).data;
    _srcW=w; _srcH=h; return _srcCache;
  }

  function applyWarp(){
    if(!img || !pts || pts.length!==4) return;
    var w=imgW,h=imgH;
    var ow=outCvs.width, oh=outCvs.height;
    var dst=[{x:0,y:0},{x:ow,y:0},{x:ow,y:oh},{x:0,y:oh}];
    /* Petakan koordinat output -> koordinat gambar. Forward (gambar->output)
       tidak bisa dipakai langsung karena itu maju satu piksel per piksel. */
    var H=homography(dst,pts);
    if(!H){ outCtx.clearRect(0,0,ow,oh); return; }
    var idd=outCtx.createImageData(ow,oh);
    var d=idd.data;
    var src=getSourceData(img,w,h);
    for(var y=0;y<oh;y++){
      for(var x=0;x<ow;x++){
        var dd=H[6]*x+H[7]*y+H[8];
        if(Math.abs(dd)<1e-6) dd=1e-6;
        var sx=(H[0]*x+H[1]*y+H[2])/dd;
        var sy=(H[3]*x+H[4]*y+H[5])/dd;
        var ix=Math.floor(sx), iy=Math.floor(sy);
        if(ix<0||iy<0||ix>=w||iy>=h) continue;
        var fx=sx-ix, fy=sy-iy;
        /* Tepi diklem ke piksel terakhir supaya kolom/baris terakhir hasil
           tetap terisi (bukan gutter hitam). */
        var ax0=ix, ay0=iy, ax1=ix+1, ay1=iy+1;
        if(ax1>=w) ax1=w-1;
        if(ay1>=h) ay1=h-1;
        var i00=(ay0*w+ax0)*4, i10=(ay0*w+ax1)*4, i01=(ay1*w+ax0)*4, i11=(ay1*w+ax1)*4;
        var di=(y*ow+x)*4;
        for(var c=0;c<4;c++){
          var v00=src[i00+c], v10=src[i10+c], v01=src[i01+c], v11=src[i11+c];
          var v=(v00*(1-fx)+v10*fx)*(1-fy)+(v01*(1-fx)+v11*fx)*fy;
          d[di+c]=clamp(Math.round(v),0,255);
        }
      }
    }
    outCtx.putImageData(idd,0,0);
    _origOut=outCtx.getImageData(0,0,ow,oh);
    computeLevels(_origOut.data);
    applyFilter();
    btnDown.disabled=false;
  }
  var _origOut=null;
  /* Level tinta dan kertas dibaca dari hasil warp supaya filter ikut
     menyesuaikan kondisi foto, bukan angka tetap. */
  var _whitePoint=235, _blackPoint=25;
  var _hist=new Uint32Array(256);

  function computeLevels(data){
    _hist.fill(0);
    var n=data.length/4, i;
    for(i=0;i<data.length;i+=4){
      var g=(data[i]*0.299+data[i+1]*0.587+data[i+2]*0.114)|0;
      _hist[clamp(g,0,255)]++;
    }
    /* titik hitam: 2% piksel tergelap */
    var dark=n*0.02, acc=0, lo=0;
    for(i=0;i<256;i++){ acc+=_hist[i]; if(acc>=dark){ lo=i; break; } }
    /* titik putih: 90% piksel, diabaikan titik terang terluar */
    var light=n*0.90, acc2=0, hi=255;
    for(i=0;i<256;i++){ acc2+=_hist[i]; if(acc2>=light){ hi=i; break; } }
    _blackPoint=clamp(lo,0,255);
    _whitePoint=clamp(Math.max(hi,_blackPoint+40),1,255);
  }

  /* Tarik kecerahan antara black point dan white point (linear). */
  function normalizeWhite(g){
    var span=Math.max(1,_whitePoint-_blackPoint);
    return clamp(Math.round((g-_blackPoint)*255/span),0,255);
  }

  /* Tarik kontras ke rentang penuh lalu perhalus dengan gamma < 1. */
  function stretchContrast(g){
    var span=Math.max(1,_whitePoint-_blackPoint);
    var v=clamp((g-_blackPoint)*255/span,0,255);
    return clamp(Math.round(Math.pow(v/255,0.85)*255),0,255);
  }

  function applyFilter(){
    if(!_origOut) return;
    var ow=outCvs.width,oh=outCvs.height;
    var cur=outCtx.getImageData(0,0,ow,oh);
    var d=cur.data, o=_origOut.data;
    if(filterMode==='none'){
      for(var i=0;i<d.length;i++) d[i]=o[i];
      outCtx.putImageData(cur,0,0); return;
    }
    for(var i=0;i<d.length;i+=4){
      var r=o[i],g=o[i+1],b=o[i+2];
      if(filterMode==='gray'){
        /* Kecerahan dinormalisasi ke white point supaya kertas tetap putih
           bersih, bukan abu-abu. */
        var gg=(r*.299+g*.587+b*.114)|0;
        gg=normalizeWhite(gg);
        d[i]=d[i+1]=d[i+2]=gg; d[i+3]=o[i+3];
      }else if(filterMode==='bw'){
        /* Ambang adaptif di tengah antara tinta dan kertas supaya tulisan
           tetap hitam pekat dan latar tetap putih bersih. */
        var g2=(r*.299+g*.587+b*.114);
        var mid=(_whitePoint+_blackPoint)/2;
        var vv=g2>mid?255:0;
        d[i]=d[i+1]=d[i+2]=vv; d[i+3]=o[i+3];
      }else if(filterMode==='enh'){
        /* Kontras ditarik antara black point dan white point, lalu kurva
           digeser supaya tulisan pekat dan latar bersih seperti scan cetak. */
        var gg2=(r*.299+g*.587+b*.114);
        var cc2=stretchContrast(gg2);
        d[i]=cc2; d[i+1]=cc2; d[i+2]=cc2; d[i+3]=o[i+3];
      }
    }
    outCtx.putImageData(cur,0,0);
  }

  // simple auto-detect: use blur+canny approx via sampling
  function autoDetect(){
    if(!img) return;
    var w=img.naturalWidth||imgW, h=img.naturalHeight||imgH;
    var dw=Math.min(w,MAX_DET), dh=Math.round(h*(dw/w));
    var c=document.createElement('canvas'); c.width=dw; c.height=dh;
    var cc=c.getContext('2d',{willReadFrequently:true});
    cc.drawImage(img,0,0,dw,dh);
    var id=cc.getImageData(0,0,dw,dh);
    var g=gray(id.data,dw,dh);
    var gb=gauss(g,dw,dh, parseFloat(rBlur.value));
    var m=mag(gb,dw,dh);
    var nm=nmax(m.mag,m.dir,dw,dh);
    var ed=thresh(nm,dw,dh,parseInt(rC1.value),parseInt(rC2.value));
    // rough bbox
    var xmin=dw,ymin=dh,xmax=0,ymax=0;
    var areaThr=dw*dh*parseFloat(rArea.value);
    var cnt=0;
    for(var y=5;y<dh-5;y++){
      for(var x=5;x<dw-5;x++){
        if(ed[y*dw+x]>200){ cnt++; xmin=Math.min(xmin,x); xmax=Math.max(xmax,x); ymin=Math.min(ymin,y); ymax=Math.max(ymax,y); }
      }
    }
    /* cnt menghitung piksel tepi (skala keliling outline), bukan luas dokumen,
       jadi tidak boleh dibandingkan dengan areaThr. */
    if(cnt<dw*dh*EDGE_MIN_FRAC){ resetPoints(); setHint('Auto-deteksi lemah, pakai titik manual'); return; }

    /* Cari quad tepi dokumen: komponen tepi -> convex hull -> 4 sudut terluas */
    var quad=detectQuad(ed,gb,dw,dh,areaThr);
    if(!quad){
      /* fallback: bbox tepi dengan padding */
      var pad=12;
      xmin=clamp(xmin-pad,0,dw); xmax=clamp(xmax+pad,0,dw);
      ymin=clamp(ymin-pad,0,dh); ymax=clamp(ymax+pad,0,dh);
      quad=[{x:xmin,y:ymin},{x:xmax,y:ymin},{x:xmax,y:ymax},{x:xmin,y:ymax}];
      setHint('Tepi kurang tegas, memakai batas area');
    }else{
      hideHint();
    }

    var sx=w/dw, sy=h/dh;
    quad=orderCorners(quad);
    pts=quad.map(function(q){ return {x:q.x*sx, y:q.y*sy}; });
    ptsDisp=pts.map(getDispFromImg);
    drawEditor(); applyWarp();
  }

  /* Cari 4 sudut dokumen dari peta tepi. Balik ke null kalau tidak meyakinkan.
     Peta tepi ditebalkan dulu supaya garis dokumen yang terputus (misalnya
     oleh teks di halaman) tetap menyambung jadi satu outline. Setiap outline
     diuji sendiri lalu quad terluas yang bukan sekadar batas frame dipilih. */
  function detectQuad(ed,gImg,dw,dh,areaThr){
    var solid=dilate(ed,dw,dh,EDGE_JOIN);
    var comps=largestComponents(solid,dw,dh);
    var best=null, bestArea=0;
    for(var ci=0;ci<comps.length;ci++){
      var pix=comps[ci];
      var M=3;
      var ptsPix=[];
      for(var i=0;i<pix.length;i+=2){
        var x=pix[i], y=pix[i+1];
        if(x>=M&&y>=M&&x<dw-M&&y<dh-M) ptsPix.push({x:x,y:y});
      }
      if(ptsPix.length<12) continue;
      var hull=convexHull(ptsPix);
      if(hull.length<4) continue;
      /* kurangi titik hull agar combinations tetap murah */
      if(hull.length>24){
        var thin=[];
        for(var h=0;h<24;h++) thin.push(hull[Math.round(h*(hull.length-1)/23)]);
        hull=thin;
      }
      var q=bestQuad(hull);
      if(!q) continue;
      var ar=Math.abs(polyArea(q));
      if(ar<areaThr) continue;
      /* Quad yang menempeltepi gambar di semua sisi hampir selalu artefak blur
         batas frame, bukan dokumen. Quad dokumen asli dicegah oleh margin M
         di atas, jadi sisanya ditolak di sini. */
      if(touchesFrame(q,dw,dh,FRAME_TOL)) continue;
      if(ar>bestArea){ bestArea=ar; best=q; }
    }
    if(!best) return null;
    return best;
  }

  /* Quad terluas dari sekumpulan titik hull */
  function bestQuad(hull){
    var n=hull.length, best=null, bestArea=0;
    for(var a=0;a<n-3;a++) for(var b=a+1;b<n-2;b++) for(var c=b+1;c<n-1;c++) for(var d=c+1;d<n;d++){
      var q=[hull[a],hull[b],hull[c],hull[d]];
      if(!isConvex(q)) continue;
      var ar=Math.abs(polyArea(q));
      if(ar>bestArea){ bestArea=ar; best=q; }
    }
    return best;
  }

  /* Quad dianggap artefak frame kalau keempat sisinya menempel tepi gambar. */
  function touchesFrame(q,dw,dh,tol){
    var left=1e9,right=-1e9,top=1e9,bottom=-1e9,i;
    for(i=0;i<4;i++){
      var a=q[i], b=q[(i+1)%4];
      if(Math.abs(a.y-b.y)<Math.abs(a.x-b.x)){
        left=Math.min(left,Math.min(a.x,b.x));
        right=Math.max(right,Math.max(a.x,b.x));
      }else{
        top=Math.min(top,Math.min(a.y,b.y));
        bottom=Math.max(bottom,Math.max(a.y,b.y));
      }
    }
    return left<=tol && top<=tol && right>=dw-1-tol && bottom>=dh-1-tol;
  }

  function isConvex(q){
    var sign=0;
    for(var i=0;i<4;i++){
      var a=q[i], b=q[(i+1)%4], c=q[(i+2)%4];
      var cr=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
      if(cr===0) continue;
      var s=cr>0?1:-1;
      if(sign===0) sign=s;
      else if(s!==sign) return false;
    }
    return true;
  }

  /* Tebalkan peta biner supayacelah kecil antar garis hilang. */
  function dilate(ed,dw,dh,r){
    if(r<=0) return ed;
    var out=Uint8Array.from(ed);
    for(var y=r;y<dh-r;y++){
      for(var x=r;x<dw-r;x++){
        if(!ed[y*dw+x]) continue;
        for(var dy=-r;dy<=r;dy++){
          var row=(y+dy)*dw;
          for(var dx=-r;dx<=r;dx++) out[row+(x+dx)]=255;
        }
      }
    }
    return out;
  }

  /* Komponen terhubung 8-arah dari piksel tepi kuat, urut dari terbesar. */
  function largestComponents(ed,dw,dh){
    var seen=new Uint8Array(dw*dh), out=[];
    for(var y=1;y<dh-1;y++){
      for(var x=1;x<dw-1;x++){
        var si=y*dw+x;
        if(seen[si]||ed[si]!==255) continue;
        var stack=[si], pix=[];
        seen[si]=1;
        while(stack.length){
          var idx=stack.pop();
          var cx=idx%dw, cy=(idx/dw)|0;
          pix.push(cx,cy);
          for(var ky=-1;ky<=1;ky++) for(var kx=-1;kx<=1;kx++){
            if(kx===0&&ky===0) continue;
            var nx=cx+kx, ny=cy+ky;
            if(nx<1||ny<1||nx>=dw-1||ny>=dh-1) continue;
            var ni=ny*dw+nx;
            if(seen[ni]||ed[ni]!==255) continue;
            seen[ni]=1; stack.push(ni);
          }
        }
        out.push(pix);
      }
    }
    out.sort(function(a,b){ return b.length-a.length; });
    return out.slice(0,6);
  }

  /* Andrew monotone chain */
  function convexHull(list){
    var p=list.slice().sort(function(a,b){ return a.x===b.x ? a.y-b.y : a.x-b.x; });
    var cross=function(o,a,b){ return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x); };
    var lower=[],i;
    for(i=0;i<p.length;i++){
      while(lower.length>=2 && cross(lower[lower.length-2],lower[lower.length-1],p[i])<=0) lower.pop();
      lower.push(p[i]);
    }
    var upper=[];
    for(i=p.length-1;i>=0;i--){
      while(upper.length>=2 && cross(upper[upper.length-2],upper[upper.length-1],p[i])<=0) upper.pop();
      upper.push(p[i]);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function polyArea(p){
    var a=0;
    for(var i=0;i<p.length;i++){
      var j=(i+1)%p.length;
      a+=p[i].x*p[j].y-p[j].x*p[i].y;
    }
    return a/2;
  }

  /* Rapikan sudut: urut kiri-atas, kanan-atas, kanan-bawah, kiri-bawah.
     Pakai sudut terhadap titik berat supaya tetap benar walau dokumen
     difoto miring atau hampir terbalik. */
  function orderCorners(q){
    var c=q.map(function(p){ return {x:p.x,y:p.y}; });
    var cx=0, cy=0, i;
    for(i=0;i<c.length;i++){ cx+=c[i].x; cy+=c[i].y; }
    cx/=c.length; cy/=c.length;
    c.sort(function(a,b){
      return Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx);
    });
    /* putar sehingga titik paling kiri-atas jadi awal */
    var best=0;
    for(i=1;i<c.length;i++){
      if(c[i].x+c[i].y < c[best].x+c[best].y) best=i;
    }
    return c.slice(best).concat(c.slice(0,best));
  }
  function gray(d,w,h){ var g=new Uint8Array(w*h); var i=0,j=0; while(i<d.length){ g[j++]=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)|0; i+=4; } return g; }
  function gauss(g,w,h,r){ var k=(r*2+1),s=k*k; var o=new Uint8Array(w*h); var rr=Math.floor(r); for(var y=rr;y<h-rr;y++) for(var x=rr;x<w-rr;x++){ var sum=0; for(var ky=-rr;ky<=rr;ky++) for(var kx=-rr;kx<=rr;kx++) sum+=g[(y+ky)*w+(x+kx)]; o[y*w+x]=(sum/s)|0; } return o; }
  function mag(g,w,h){ var m=new Uint8Array(w*h), dir=new Uint8Array(w*h); var Sx=[-1,0,1,-2,0,2,-1,0,1],Sy=[-1,-2,-1,0,0,0,1,2,1]; for(var y=1;y<h-1;y++) for(var x=1;x<w-1;x++){ var gx=0,gy=0; for(var ky=-1;ky<=1;ky++) for(var kx=-1;kx<=1;kx++){ var v=g[(y+ky)*w+(x+kx)]; var kk=ky*3+kx+4; gx+=v*Sx[kk]; gy+=v*Sy[kk]; } var mm=Math.hypot(gx,gy); m[y*w+x]=clamp(mm,0,255); var a=Math.atan2(gy,gx); dir[y*w+x]=((Math.round(a/(Math.PI/4))+4)%4); } return {mag:m,dir:dir}; }
  function nmax(m,dir,w,h){ var o=new Uint8Array(w*h); for(var y=1;y<h-1;y++) for(var x=1;x<w-1;x++){ var v=m[y*w+x], d=dir[y*w+x], n1=0,n2=0; if(d===0){ n1=m[y*w+x+1]; n2=m[y*w+x-1]; } else if(d===1){ n1=m[(y-1)*w+x+1]; n2=m[(y+1)*w+x-1]; } else if(d===2){ n1=m[(y-1)*w+x]; n2=m[(y+1)*w+x]; } else { n1=m[(y-1)*w+x-1]; n2=m[(y+1)*w+x+1]; } o[y*w+x]=(v>=n1&&v>=n2)?v:0; } return o; }
  function thresh(nm,w,h,t1,t2){ var o=new Uint8Array(w*h); for(var y=0;y<h;y++) for(var x=0;x<w;x++){ var v=nm[y*w+x]; if(v>=t2) o[y*w+x]=255; else if(v>=t1) o[y*w+x]=120; else o[y*w+x]=0; } for(var y=1;y<h-1;y++) for(var x=1;x<w-1;x++){ if(o[y*w+x]===255) continue; if(o[y*w+x]===120){ var ok=false; for(var ky=-1;ky<=1;ky++) for(var kx=-1;kx<=1;kx++) if(o[(y+ky)*w+(x+kx)]===255){ ok=true; break; } if(ok) break; o[y*w+x]=ok?255:0; } else o[y*w+x]=0; } return o; }

  // UI
  btnOpen.onclick=function(){ fileIn.click(); };
  fileIn.onchange=function(e){
    var f=e.target.files[0]; if(!f) return;
    var rd=new FileReader();
    rd.onload=function(ev){
      var im=new Image();
      im.onload=function(){
        img=im; imgW=im.naturalWidth||im.width; imgH=im.naturalHeight||im.height;
        _srcCache=null; pts=null; ptsDisp=null;
        statusEl.textContent='Gambar: '+imgW+'×'+imgH;
        resizeCanvasToImage();
        setHint('Klik Auto-detect Ulang atau geser titik sudut');
      };
      im.src=ev.target.result;
    };
    rd.readAsDataURL(f);
  };
  btnAuto.onclick=autoDetect;
  btnReset.onclick=resetPoints;
  function resetPoints(){
    if(!img) return;
    var m=18;
    pts=[{x:m,y:m},{x:imgW-m,y:m},{x:imgW-m,y:imgH-m},{x:m,y:imgH-m}];
    ptsDisp=pts.map(getDispFromImg);
    drawEditor(); applyWarp(); hideHint();
  }
  btnToggle.onclick=function(){
    editMode=!editMode;
    btnToggle.textContent=editMode?'Keluar Edit':'Mode Edit Sudut';
    hint.classList.toggle('hidden',!editMode);
    drawEditor();
  };
  btnApply.onclick=applyWarp;
  btnDown.onclick=function(){
    if(!outCvs) return;
    var url=outCvs.toDataURL('image/jpeg',0.95);
    var a=document.createElement('a'); a.href=url; a.download='scan-dokumen.jpg'; a.click();
  };
  chips.forEach(function(c){ c.onclick=function(){ chips.forEach(function(x){ x.classList.remove('active'); }); c.classList.add('active'); filterMode=c.dataset.filter; applyFilter(); }; });

  // mouse
  function pos(e){
    var r=cvs.getBoundingClientRect();
    var cx=e.clientX||(e.touches&&e.touches[0].clientX);
    var cy=e.clientY||(e.touches&&e.touches[0].clientY);
    return {x:cx-r.left,y:cy-r.top};
  }
  cvs.addEventListener('pointerdown',function(e){
    if(!ptsDisp) return;
    var p=pos(e);
    var best=-1,bd=1e9;
    for(var i=0;i<4;i++){ var d=dist2(p,ptsDisp[i]); if(d<bd && d<60*60){ bd=d; best=i; } }
    if(best>=0){ dragging=best; cvs.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  cvs.addEventListener('pointermove',function(e){
    var p=pos(e);
    if(dragging>=0){
      ptsDisp[dragging]=p; pts[dragging]=getImgFromDisp(p);
      drawEditor(); return;
    }
    if(!ptsDisp){ hover=-1; return; }
    var best=-1,bd=1e9;
    for(var i=0;i<4;i++){ var d=dist2(p,ptsDisp[i]); if(d<bd && d<60*60){ bd=d; best=i; } }
    if(best!==hover){ hover=best; drawEditor(); }
  });
  function end(){ dragging=-1; }
  cvs.addEventListener('pointerup',end); cvs.addEventListener('pointercancel',end); cvs.addEventListener('pointerleave',end);

  window.addEventListener('resize',resizeCanvasToImage);
  rBlur.oninput=function(){ vBlur.textContent=parseFloat(rBlur.value).toFixed(1); };
  rC1.oninput=function(){ vC1.textContent=rC1.value; };
  rC2.oninput=function(){ vC2.textContent=rC2.value; };
  rArea.oninput=function(){ vArea.textContent=parseFloat(rArea.value).toFixed(2); };

  drawEditor();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScan);
  } else {
    initScan();
  }
})();
