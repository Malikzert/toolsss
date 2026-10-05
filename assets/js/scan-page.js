(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

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

  // simple matrix ops
  function zerosMat(r,c){ var m=[]; for(var i=0;i<r;i++){ m[i]=[]; for(var j=0;j<c;j++) m[i][j]=0;} return m; }
  function identityMat(n){ var m=zerosMat(n,n); for(var i=0;i<n;i++) m[i][i]=1; return m; }
  function mulMv(M,v){ var r=[]; for(var i=0;i<M.length;i++){ var s=0; for(var j=0;j<v.length;j++) s+=M[i][j]*v[j]; r[i]=s; } return r; }
  function transpose(M){ var r=M.length,c=M[0].length; var T=zerosMat(c,r); for(var i=0;i<r;i++) for(var j=0;j<c;j++) T[j][i]=M[i][j]; return T; }
  function mulMM(a,b){ var ar=a.length,ac=a[0].length,bc=b[0].length; var C=zerosMat(ar,bc); for(var i=0;i<ar;i++) for(var j=0;j<bc;j++){ var s=0; for(var k=0;k<ac;k++) s+=a[i][k]*b[k][j]; C[i][j]=s; } return C; }
  function eigenJacobiSmall(A,maxIter,eps){
    var n=9; var D=copyMat9(A); var V=idMat9();
    for(var iter=0;iter<maxIter;iter++){
      var p=0,q=1,mx=0;
      for(var i=0;i<n;i++) for(var j=i+1;j<n;j++){ var v=Math.abs(D[i][j]); if(v>mx){ mx=v; p=i;q=j; } }
      if(mx<eps) break;
      var app=D[p][p], aqq=D[q][q], apq=D[p][q];
      var theta=(aqq-app)/(2*apq);
      var t=1/(Math.abs(theta)+Math.sqrt(1+theta*theta)); if(theta<0) t=-t;
      var c=1/Math.sqrt(1+t*t), s=t*c, tau=s/(1+c);
      // rotate D
      for(var k=0;k<n;k++){
        if(k===p||k===q) continue;
        var dkp=D[k][p], dkq=D[k][q];
        D[k][p]=D[p][k]=dkp-s*(dkq+dkp*tau);
        D[k][q]=D[q][k]=dkq+s*(dkp-dkq*tau);
      }
      var vp=V[p], vq=V[q];
      for(var k=0;k<n;k++){
        var t1=vp[k]*c-vq[k]*s, t2=vp[k]*s+vq[k]*c;
        vp[k]=t1; vq[k]=t2;
      }
      D[p][p]=app-c*c*apq*2 + s*s*aqq;
      D[q][q]=aqq+c*c*apq*2 + s*s*app;
      D[p][q]=D[q][p]=0;
    }
    // eigenvector for smallest D[i][i]? take col 8 of V? return V as rows? easier: last row index 8
    return {V:V, D:D};
  }
  function copyMat9(A){ var D=zerosMat(9,9); for(var i=0;i<9;i++) for(var j=0;j<9;j++) D[i][j]=A[i][j]; return D; }
  function idMat9(){ var I=zerosMat(9,9); for(var i=0;i<9;i++) I[i][i]=1; return I; }
  function zerosMat9(){ return zerosMat(9,9); }

  function homography(src,dst){
    // 4 points
    var A=zerosMat(8,9);
    for(var i=0;i<4;i++){
      var s=src[i], dpt=dst[i];
      var r1=i*2, r2=i*2+1;
      A[r1][0]=-s.x; A[r1][1]=-s.y; A[r1][2]=-1; A[r1][3]=0; A[r1][4]=0; A[r1][5]=0; A[r1][6]=dpt.x*s.x; A[r1][7]=dpt.x*s.y; A[r1][8]=dpt.x;
      A[r2][0]=0; A[r2][1]=0; A[r2][2]=0; A[r2][3]=-s.x; A[r2][4]=-s.y; A[r2][5]=-1; A[r2][6]=dpt.y*s.x; A[r2][7]=dpt.y*s.y; A[r2][8]=dpt.y;
    }
    // ATA 9x9
    var At=transpose(A);
    var AtA=zerosMat(9,9);
    for(var i=0;i<9;i++){
      for(var j=0;j<9;j++){
        var s=0;
        for(var k=0;k<8;k++) s+=At[i][k]*A[k][j];
        AtA[i][j]=s;
      }
    }
    var ev=eigenJacobiSmall(AtA,30,1e-9);
    var h=ev.V[8]; // smallest
    var H=[h[0]/h[8], h[1]/h[8], h[2]/h[8], h[3]/h[8], h[4]/h[8], h[5]/h[8], h[6]/h[8], h[7]/h[8], 1];
    return H;
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
    var H=homography(pts,dst);
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
        if(ix<0||iy<0||ix+1>=w||iy+1>=h) continue;
        var fx=sx-ix, fy=sy-iy;
        var i00=(iy*w+ix)*4, i10=(iy*w+(ix+1))*4, i01=((iy+1)*w+ix)*4, i11=((iy+1)*w+(ix+1))*4;
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
    applyFilter();
    btnDown.disabled=false;
  }
  var _origOut=null;

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
        var gg=(r*.299+g*.587+b*.114)|0;
        d[i]=d[i+1]=d[i+2]=gg; d[i+3]=o[i+3];
      }else if(filterMode==='bw'){
        var g2=(r*.299+g*.587+b*.114);
        var vv=g2>150?255:0;
        d[i]=d[i+1]=d[i+2]=vv; d[i+3]=o[i+3];
      }else if(filterMode==='enh'){
        var gg2=(r*.299+g*.587+b*.114);
        var nr=clamp(r*1.08,0,255), ng=clamp(g*1.04,0,255), nb=clamp(b*1.06,0,255);
        var cc=(gg2-128)*1.16+128; cc=clamp(cc,0,255);
        d[i]=Math.max(nr,cc*.95); d[i+1]=Math.max(ng,cc); d[i+2]=Math.max(nb,cc*.95); d[i+3]=o[i+3];
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
    if(cnt<areaThr){ resetPoints(); setHint('Auto-deteksi lemah, pakai titik manual'); return; }
    // expand
    var pad=12;
    xmin=clamp(xmin-pad,0,dw); xmax=clamp(xmax+pad,0,dw);
    ymin=clamp(ymin-pad,0,dw); ymax=clamp(ymax+pad,dh);
    var sx=w/dw, sy=h/dh;
    pts=[
      {x:xmin*sx,y:ymin*sy},
      {x:xmax*sx,y:ymin*sy},
      {x:xmax*sx,y:ymax*sy},
      {x:xmin*sx,y:ymax*sy}
    ];
    ptsDisp=pts.map(getDispFromImg);
    drawEditor(); applyWarp(); hideHint();
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
})();
