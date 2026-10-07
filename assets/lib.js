/* 作品集共用工具：亂數、分布函數、線性代數、SVG 圖表、檢查清單 */
(function(){
const PF={};
PF.$=id=>document.getElementById(id);
PF.esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
PF.pct=(v,d=2)=>(v*100).toFixed(d)+'%';
PF.num=(v,d=0)=>Number(v).toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d});
PF.fmtP=p=>p<1e-4?'< 0.0001':p.toFixed(4);
PF.debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};

/* ---------- 亂數 ---------- */
PF.rng=function(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
PF.randn=function(r){let u=0;while(u===0)u=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*r());};
PF.gammaRand=function(r,k,theta){
  if(k<1){const u=r()||1e-12;return PF.gammaRand(r,k+1,theta)*Math.pow(u,1/k);}
  const d=k-1/3,c=1/Math.sqrt(9*d);
  for(;;){let x,v;do{x=PF.randn(r);v=1+c*x;}while(v<=0);v=v*v*v;const u=r();
    if(u<1-0.0331*x*x*x*x||Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v*theta;}
};
PF.poissonRand=function(r,lam){
  if(lam<30){const L=Math.exp(-lam);let k=0,p=1;do{k++;p*=r();}while(p>L);return k-1;}
  return Math.max(0,Math.round(lam+Math.sqrt(lam)*PF.randn(r)));
};
PF.binomRand=function(r,n,p){ // n 大時用常態近似
  if(n<=60){let k=0;for(let i=0;i<n;i++)if(r()<p)k++;return k;}
  return Math.min(n,Math.max(0,Math.round(n*p+Math.sqrt(n*p*(1-p))*PF.randn(r))));
};

/* ---------- 特殊函數與分布 ---------- */
PF.erf=function(x){const s=x<0?-1:1;x=Math.abs(x);const t=1/(1+0.3275911*x);
  const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return s*y;};
PF.normCdf=z=>0.5*(1+PF.erf(z/Math.SQRT2));
PF.normPdf=z=>Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
PF.normInv=function(p){
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239];
  const b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
  const c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
  const d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
  const pl=0.02425;let q,r;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p<=1-pl){q=p-0.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
  q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
};
PF.lgamma=function(x){
  const c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(x<0.5)return Math.log(Math.PI/Math.abs(Math.sin(Math.PI*x)))-PF.lgamma(1-x);
  x-=1;let a=c[0];const t=x+7.5;for(let i=1;i<9;i++)a+=c[i]/(x+i);
  return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a);
};
PF.gammaP=function(a,x){
  if(x<=0)return 0;const gln=PF.lgamma(a);
  if(x<a+1){let ap=a,sum=1/a,del=sum;for(let n=0;n<1000;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*1e-15)break;}return sum*Math.exp(-x+a*Math.log(x)-gln);}
  let b=x+1-a,c=1e300,d=1/b,h=d;
  for(let i=1;i<1000;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-15)break;}
  return 1-Math.exp(-x+a*Math.log(x)-gln)*h;
};
PF.chi2Sf=(x,k)=>Math.max(0,1-PF.gammaP(k/2,x/2));
function betacf(a,b,x){
  const FP=1e-300;const qab=a+b,qap=a+1,qam=a-1;let c=1,d=1-qab*x/qap;if(Math.abs(d)<FP)d=FP;d=1/d;let h=d;
  for(let m=1;m<=500;m++){const m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));
    d=1+aa*d;if(Math.abs(d)<FP)d=FP;c=1+aa/c;if(Math.abs(c)<FP)c=FP;d=1/d;h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));
    d=1+aa*d;if(Math.abs(d)<FP)d=FP;c=1+aa/c;if(Math.abs(c)<FP)c=FP;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-15)break;}
  return h;
}
PF.ibeta=function(x,a,b){
  if(x<=0)return 0;if(x>=1)return 1;
  const bt=Math.exp(PF.lgamma(a+b)-PF.lgamma(a)-PF.lgamma(b)+a*Math.log(x)+b*Math.log(1-x));
  return x<(a+1)/(a+b+2)?bt*betacf(a,b,x)/a:1-bt*betacf(b,a,1-x)/b;
};
PF.tP2=(t,df)=>PF.ibeta(df/(df+t*t),df/2,0.5); // 雙尾 p 值
PF.tCrit=function(df,alpha){let lo=0,hi=100;for(let i=0;i<100;i++){const m=(lo+hi)/2;if(PF.tP2(m,df)>alpha)lo=m;else hi=m;}return(lo+hi)/2;};
PF.poissonPmf=(k,l)=>Math.exp(-l+k*Math.log(l)-PF.lgamma(k+1));

/* ---------- 線性代數 ---------- */
PF.inv=function(A){
  const n=A.length,M=A.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>i===j?1:0)]);
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;
    if(Math.abs(M[p][c])<1e-12)return null;[M[c],M[p]]=[M[p],M[c]];
    const v=M[c][c];for(let j=0;j<2*n;j++)M[c][j]/=v;
    for(let r=0;r<n;r++)if(r!==c){const f=M[r][c];if(f)for(let j=0;j<2*n;j++)M[r][j]-=f*M[c][j];}}
  return M.map(r=>r.slice(n));
};
/* OLS：X 不含截距，回傳含截距的係數、標準誤、t、p、R² */
PF.ols=function(X,y){
  const n=y.length,k=X[0]?X[0].length:0,p=k+1;
  const Z=X.map(r=>[1,...r]);
  const XtX=Array.from({length:p},()=>new Array(p).fill(0)),Xty=new Array(p).fill(0);
  for(let i=0;i<n;i++){const z=Z[i];for(let a=0;a<p;a++){Xty[a]+=z[a]*y[i];for(let b=0;b<p;b++)XtX[a][b]+=z[a]*z[b];}}
  const inv=PF.inv(XtX);if(!inv)return null;
  const beta=inv.map(r=>r.reduce((s,v,j)=>s+v*Xty[j],0));
  let sse=0,ym=y.reduce((a,b)=>a+b,0)/n,sst=0;const fit=new Array(n);
  for(let i=0;i<n;i++){fit[i]=Z[i].reduce((s,v,j)=>s+v*beta[j],0);sse+=(y[i]-fit[i])**2;sst+=(y[i]-ym)**2;}
  const df=n-p,s2=sse/df;
  const se=inv.map((r,i)=>Math.sqrt(Math.max(0,r[i]*s2)));
  const t=beta.map((b,i)=>b/se[i]);const pv=t.map(v=>PF.tP2(Math.abs(v),df));
  const r2=1-sse/sst;return {beta,se,t,p:pv,r2,adj:1-(1-r2)*(n-1)/df,df,s:Math.sqrt(s2),fit};
};

/* ---------- 圖表 ---------- */
PF.niceStep=function(span,n){if(!(span>0))return 1;const raw=span/n,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p;return(m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p;};
let clipN=0;
PF.chart=function(el,cfg){
  const W=cfg.w||640,H=cfg.h||250,ml=cfg.ml||52,mr=cfg.mr||14,mt=16,mb=32,iw=W-ml-mr,ih=H-mt-mb;
  const x0=cfg.x0,x1=cfg.x1,y0=cfg.y0||0,y1=cfg.y1;
  const X=v=>ml+(v-x0)/(x1-x0)*iw,Y=v=>mt+ih-(v-y0)/(y1-y0)*ih;
  const xf=cfg.xFmt||(v=>PF.num(v,0)),yf=cfg.yFmt||(v=>String(+v.toFixed(6)));
  const id='clip'+(++clipN);
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${PF.esc(cfg.label||'')}"><defs><clipPath id="${id}"><rect x="${ml}" y="${mt}" width="${iw}" height="${ih}"/></clipPath></defs>`;
  const ys=cfg.yStep||PF.niceStep(y1-y0,cfg.yn||4),yStart=Math.ceil(y0/ys-1e-9);
  for(let i=yStart;i*ys<=y1+ys*1e-6;i++){const t=i*ys;s+=`<line class="grid" x1="${ml}" x2="${W-mr}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text x="${ml-6}" y="${(Y(t)+4).toFixed(1)}" text-anchor="end">${PF.esc(yf(t))}</text>`;}
  let xt=cfg.xTicks;
  if(!xt){const st=cfg.xStep||PF.niceStep(x1-x0,cfg.xn||6);xt=[];for(let i=Math.ceil(x0/st-1e-9);i*st<=x1+st*1e-6;i++)xt.push({v:i*st,l:xf(i*st)});}
  xt.forEach(t=>{s+=`<text x="${X(t.v).toFixed(1)}" y="${H-10}" text-anchor="middle">${PF.esc(t.l)}</text>`;});
  s+=`<g clip-path="url(#${id})">`;
  const base=Y(Math.max(y0,Math.min(0,y1)));
  for(const se of cfg.series){
    if(se.kind==='bar'){
      const bw=Math.max(1,(se.width||0.8)*iw/(x1-x0));
      se.pts.forEach(([x,y])=>{const yy=Y(y),top=Math.min(yy,base),h=Math.abs(base-yy);if(h<0.01)return;
        s+=`<rect x="${(X(x)-bw/2).toFixed(2)}" y="${top.toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" fill="${typeof se.color==='function'?se.color(x,y):se.color}" ${se.op?`fill-opacity="${se.op}"`:''}/>`;});
    }else if(se.kind==='dots'){
      se.pts.forEach(p=>{s+=`<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="${se.r||2.5}" fill="${p[2]||se.color}" fill-opacity="${se.op||0.7}"/>`;});
    }else{
      if(!se.pts.length)continue;
      const d=se.pts.map(([x,y],i)=>(i?'L':'M')+X(x).toFixed(1)+' '+Y(y).toFixed(1)).join('');
      if(se.fill){const f=se.pts[0],l=se.pts[se.pts.length-1];s+=`<path d="${d}L${X(l[0]).toFixed(1)} ${base.toFixed(1)}L${X(f[0]).toFixed(1)} ${base.toFixed(1)}Z" fill="${se.fillColor||se.stroke}" fill-opacity="${se.fo||0.15}"/>`;}
      if(!se.noStroke)s+=`<path d="${d}" fill="none" stroke="${se.stroke}" stroke-width="${se.sw||2}" ${se.dash?`stroke-dasharray="${se.dash}"`:''} ${se.op?`stroke-opacity="${se.op}"`:''}/>`;
    }
  }
  s+='</g>';
  if(y0<=0&&y1>=0)s+=`<line class="axis" x1="${ml}" x2="${W-mr}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>`;
  (cfg.hmarks||[]).forEach(m=>{const y=Y(m.y);s+=`<line x1="${ml}" x2="${W-mr}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${m.color}" stroke-dasharray="4 3" stroke-width="1.2"/>`;
    if(m.label)s+=`<text class="mk" x="${W-mr-4}" y="${(y-5).toFixed(1)}" text-anchor="end">${PF.esc(m.label)}</text>`;});
  (cfg.vmarks||[]).forEach((m,i)=>{const x=X(m.x);if(x<ml-1||x>W-mr+1)return;const anchor=x>W-130?'end':'start',dx=anchor==='end'?-5:5;
    s+=`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${mt}" y2="${mt+ih}" stroke="${m.color}" stroke-dasharray="4 3" stroke-width="1.2"/>`;
    if(m.label)s+=`<text class="mk" x="${(x+dx).toFixed(1)}" y="${mt+10+i*14}" text-anchor="${anchor}">${PF.esc(m.label)}</text>`;});
  el.innerHTML=s+'</svg>';
};
PF.tiles=function(el,rows){el.innerHTML=rows.map(([k,v,s,c])=>`<div class="stat ${c||''}"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s||''}</span></div>`).join('');};
PF.checks=function(listEl,sumEl,rows){
  const lab={ok:'通過',bad:'未通過',info:'提示'};
  const fail=rows.filter(r=>r[3]==='bad').length,pass=rows.filter(r=>r[3]==='ok').length,info=rows.length-fail-pass;
  sumEl.innerHTML=`<span class="pill ${fail?'bad':'ok'}">${fail?fail+' 項未通過':'全部通過'}</span><span class="spec">${pass} 通過 · ${fail} 未通過 · ${info} 項提示</span>`;
  listEl.innerHTML=rows.map(([id,d,detail,st])=>`<div class="qa-row"><span class="id">${id}</span><span class="d">${PF.esc(d)}<small>${PF.esc(detail)}</small></span><span class="pill ${st}">${lab[st]}</span></div>`).join('');
};
PF.invalid=(ids,bad)=>ids.forEach(id=>{const el=PF.$(id);if(el)el.setAttribute('aria-invalid',bad.includes(id));});
window.PF=PF;
})();
