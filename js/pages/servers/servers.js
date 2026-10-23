/* Rippl — الخوادم والقنوات */
/* ---------- servers (Discord-style rail + channel list) ---------- */
const SRVS={};
const SRV_ORDER=[];
const FI='<svg class="vfi" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 2.5a7.5 7.5 0 0 0-6.4 11.4L2 18.5l4.7-1.2A7.5 7.5 0 1 0 9.5 2.5z"/><path style="stroke:var(--bg)" stroke-width="2" d="M16 10.5a5.5 5.5 0 0 1 3.8 9.5l.9 2.5-3.5-.9A5.5 5.5 0 1 1 16 10.5z"/></svg>';const srvCh={};let curSrv='';
function openSrv(k){
 if(!SRVS[k])return;curSrv=k;const d=SRVS[k];
 $('srAv').innerHTML=`<div class="av sq" data-img="${k}" data-fb="${d.fb}"></div>`;
 $('srName').textContent=d.n;$('srSub').textContent=d.m+' \u2022 '+d.t;
 const ic={h:'hash',r:'square-check-big'};
 $('srBody').innerHTML=d.cats.map(c=>`<div class="scat"><span>${c[0]}</span><i data-lucide="chevron-down"></i></div><div class="scl">`+c[1].map(h=>`<div class="sch" data-en="${h[2]}" data-ar="${h[3]}">${h[0]==='f'?FI:`<i class="vci" data-lucide="${ic[h[0]]}"></i>`}<span class="ce">${h[1]}</span><span class="vbar"></span><bdi>${h[2]} \u2022 ${h[3]}</bdi></div>`).join('')+'</div>').join('');
 hydrate($('srAv'));lucide.createIcons();show('srv');$('srv').scrollTop=0;
}
$('srBack').onclick=hide;
$('srBody').onclick=e=>{
 const c=e.target.closest('.scat');if(c){c.classList.toggle('c');return}
 const h=e.target.closest('.sch');if(!h)return;
 srvCh[curSrv]=h.dataset.en;
 const d=SRVS[curSrv],i=SRV_ORDER.indexOf(curSrv),nm='# '+h.dataset.en+' \u2022 '+h.dataset.ar+'\u200b'.repeat(i+1);
 CH[nm]=CH[nm]||[{sys:1,text:'Welcome to #'+h.dataset.en}];
 window.chPre={name:nm,k:curSrv,sq:1,chan:1,fb:d.fb,sub:'',st:''};
 openChat(nm,curSrv);chFrom='srv';$('chSt').textContent=d.n;
};
hydrate();
lucide.createIcons();
