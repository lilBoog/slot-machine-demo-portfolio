/* 金鯉躍門共用數學引擎：符號、連線、預設 PAR 配置、單線評估、解析 RTP、輪帶排列與完整遊戲流程。
   第 1 章調整的配置存在 localStorage（jinli-config），第 2–5 章讀取同一份。 */
(function(){
const S={};
S.SYM=[{k:'W',g:'鯉',n:'錦鯉（百搭）'},{k:'S',g:'門',n:'龍門（分散）'},{k:'H1',g:'寶',n:'元寶'},{k:'H2',g:'意',n:'如意'},{k:'H3',g:'燈',n:'燈籠'},{k:'H4',g:'錢',n:'銅錢'},{k:'A',g:'A',n:'A'},{k:'K',g:'K',n:'K'},{k:'Q',g:'Q',n:'Q'},{k:'J',g:'J',n:'J'}];
S.LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[1,0,1,2,1],[1,2,1,0,1],[0,1,1,1,0],[2,1,1,1,2],[0,1,0,1,0],[2,1,2,1,2],[1,1,0,1,1],[1,1,2,1,1],[0,0,2,0,0],[2,2,0,2,2],[0,2,2,2,0]];
S.NS=S.SYM.length;S.NL=S.LINES.length;S.BET=S.NL;
const P3=(a,b,c)=>[0,0,0,a,b,c];
S.DEFAULT={
  cnt:[[0,2,3,3,2],[1,2,2,2,1],[2,2,2,2,2],[3,3,3,3,3],[4,4,4,4,4],[4,4,4,4,4],[5,5,5,5,5],[5,5,5,5,5],[6,6,6,6,6],[6,6,6,6,6]],
  pay:[P3(60,250,1250),[0,0,0,0,0,0],P3(50,200,1000),P3(30,125,500),P3(20,75,300),P3(15,60,250),P3(10,30,125),P3(10,25,100),P3(8,20,75),P3(6,20,60)],
  sc:[0,0,0,2,10,50],fs:10,mult:2,target:0.97};
const KEY='jinli-config';
const clone=o=>JSON.parse(JSON.stringify(o));
function valid(c){
  try{return c&&Array.isArray(c.cnt)&&c.cnt.length===S.NS&&c.cnt.every(r=>Array.isArray(r)&&r.length===5&&r.every(v=>Number.isInteger(v)&&v>=0))
    &&Array.isArray(c.pay)&&c.pay.length===S.NS&&c.pay.every(r=>r.length===6&&r.every(v=>v>=0))&&Array.isArray(c.sc)&&c.sc.length===6
    &&c.fs>=1&&c.mult>=1&&S.lengths(c).every((l,r)=>l>=15&&c.cnt[1][r]*3<=l);}catch(e){return false;}
}
S.lengths=c=>[0,1,2,3,4].map(r=>c.cnt.reduce((a,row)=>a+row[r],0));
S.load=function(){
  try{const raw=localStorage.getItem(KEY);if(raw){const c=JSON.parse(raw);if(valid(c)){c.L=S.lengths(c);return{cfg:c,custom:!S.isDefault(c)};}}}catch(e){}
  const c=clone(S.DEFAULT);c.L=S.lengths(c);return{cfg:c,custom:false};
};
S.save=function(c){try{localStorage.setItem(KEY,JSON.stringify({cnt:c.cnt,pay:c.pay,sc:c.sc,fs:c.fs,mult:c.mult,target:c.target}));}catch(e){}};
S.clear=function(){try{localStorage.removeItem(KEY);}catch(e){}};
S.isDefault=c=>JSON.stringify([c.cnt,c.pay,c.sc,c.fs,c.mult])===JSON.stringify([S.DEFAULT.cnt,S.DEFAULT.pay,S.DEFAULT.sc,S.DEFAULT.fs,S.DEFAULT.mult]);
/* 依倍數縮放整張賠率表（用於製作不同 RTP 的數學版本；RTP 與賠率呈線性） */
S.scaled=function(c,k){const d=clone(c);d.pay=d.pay.map(r=>r.map(v=>v*k));d.sc=d.sc.map(v=>v*k);d.L=S.lengths(d);return d;};

/* 單線評估（W=0 百搭，S=1 分散）：回傳 [賠付, 中獎符號, 連線數] */
S.evalLine=function(b,pay){
  let kw=0;while(kw<5&&b[kw]===0)kw++;
  const pw=kw>=3?pay[0][kw]:0;
  if(kw===5)return pw;
  const s=b[kw];if(s===1)return pw;
  let k=kw;while(k<5&&(b[k]===s||b[k]===0))k++;
  const ps=k>=3?pay[s][k]:0;
  return ps>=pw?ps:pw;
};
S.analytic=function(c){
  const L=c.L||S.lengths(c);
  const nz=[0,1,2,3,4].map(r=>{const a=[];for(let i=0;i<S.NS;i++)if(c.cnt[i][r]>0)a.push([i,c.cnt[i][r]/L[r]]);return a;});
  let ev=0;const b=[0,0,0,0,0];
  for(const[a0,q0]of nz[0]){b[0]=a0;for(const[a1,q1]of nz[1]){b[1]=a1;const p1=q0*q1;for(const[a2,q2]of nz[2]){b[2]=a2;const p2=p1*q2;
    for(const[a3,q3]of nz[3]){b[3]=a3;const p3=p2*q3;for(const[a4,q4]of nz[4]){b[4]=a4;const x=S.evalLine(b,c.pay);if(x>0)ev+=p3*q4*x;}}}}}
  let dist=[1,0,0,0,0,0];
  for(let r=0;r<5;r++){const q=3*c.cnt[1][r]/L[r],nd=[0,0,0,0,0,0];for(let i=0;i<6;i++){nd[i]+=dist[i]*(1-q);if(i<5)nd[i+1]+=dist[i]*q;}dist=nd;}
  const scEV=dist[3]*c.sc[3]+dist[4]*c.sc[4]+dist[5]*c.sc[5],pt=dist[3]+dist[4]+dist[5],R0=ev+scEV;
  const conv=c.fs*pt<1,E=conv?c.fs/(1-c.fs*pt):Infinity,fg=conv?pt*E*R0*c.mult:Infinity;
  return{ev,scEV,pt,R0,E,fg,total:R0+fg,dist};
};
S.buildStrips=function(c,seed){
  const r=PF.rng(seed||20261007),L=c.L||S.lengths(c);
  return [0,1,2,3,4].map(reel=>{const n=L[reel],arr=new Array(n).fill(-1),nS=c.cnt[1][reel];
    for(let i=0;i<nS;i++)arr[Math.floor(i*n/nS)]=1;
    const rest=[];for(let i=0;i<S.NS;i++)if(i!==1)for(let k=0;k<c.cnt[i][reel];k++)rest.push(i);
    for(let i=rest.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}
    let k=0;for(let i=0;i<n;i++)if(arr[i]===-1)arr[i]=rest[k++];return arr;});
};
/* 建立一台機台：spin(rnd, stops?) 為單次轉動；play(rnd) 為一次付費遊戲（含免費遊戲）。贏分單位為點數，每線 1 點、總押注 20 點。 */
S.machine=function(c,seed){
  const strips=S.buildStrips(c,seed),W=[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],LB=[0,0,0,0,0];
  function spin(rnd,stops){
    for(let r=0;r<5;r++){const s=strips[r],L=s.length,st=stops?stops[r]:Math.floor(rnd()*L);W[r][0]=s[st];W[r][1]=s[(st+1)%L];W[r][2]=s[(st+2)%L];}
    let win=0,n=0;
    for(let l=0;l<S.NL;l++){const ln=S.LINES[l];for(let r=0;r<5;r++)LB[r]=W[r][ln[r]];win+=S.evalLine(LB,c.pay);}
    for(let r=0;r<5;r++)if(W[r][0]===1||W[r][1]===1||W[r][2]===1)n++;
    return{win:win+(c.sc[n]||0)*S.NL,n};
  }
  function play(rnd){
    const b=spin(rnd);let win=b.win,trig=0,fgSpins=0;
    if(b.n>=3){trig=1;let left=c.fs,guard=0;while(left>0&&guard<5000){left--;guard++;fgSpins++;const f=spin(rnd);win+=f.win*c.mult;if(f.n>=3){left+=c.fs;trig++;}}}
    return{win,base:b.win,trig,fgSpins};
  }
  return{strips,spin,play,cfg:c};
};
/* 分批執行長時間模擬，避免畫面卡住 */
S.chunked=function(total,size,step,onProgress,onDone){
  let i=0;const token={cancel:false};
  (function run(){if(token.cancel)return;const end=Math.min(total,i+size);for(;i<end;i++)step(i);if(onProgress)onProgress(i/total);if(i<total)setTimeout(run,0);else onDone();})();
  return token;
};

/* 章節導覽與配置說明 */
S.CH=[{f:'slot-par-sheet.html',n:'1',t:'設計',d:'PAR 表'},{f:'slot-verify.html',n:'2',t:'驗證',d:'RNG 與送審'},{f:'slot-player.html',n:'3',t:'玩家體驗',d:'破產與時長'},{f:'slot-monitor.html',n:'4',t:'上線監控',d:'例行報表'},{f:'slot-ops.html',n:'5',t:'營運分析',d:'A/B 與留存'}];
S.nav=function(el,cur){
  el.innerHTML=S.CH.map(c=>`<a href="${c.f}" class="${c.f===cur?'on':''}" ${c.f===cur?'aria-current="page"':''}><span class="n">${c.n}</span><span><b>${c.t}</b><small>${c.d}</small></span></a>`).join('');
};
S.banner=function(el,state,onReset){
  const a=S.analytic(state.cfg);
  el.innerHTML=state.custom
    ?`<span class="pill info">自訂配置</span><span>使用你在第 1 章調整後的輪帶與賠率，理論 RTP ${PF.pct(a.total,2)}。</span><button class="btn" type="button" id="cfg-reset">還原預設配置</button>`
    :`<span class="pill ok">預設配置</span><span>使用第 1 章的預設輪帶與賠率，理論 RTP ${PF.pct(a.total,2)}。在第 1 章修改後，這裡會自動套用。</span>`;
  const b=el.querySelector('#cfg-reset');if(b)b.addEventListener('click',()=>{S.clear();onReset();});
  return a;
};
window.SLOT=S;
})();
