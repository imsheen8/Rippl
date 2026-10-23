/* Sheen — Inbox والبحث وقائمة الرسالة الجديدة */
$('nmBack').onclick=hide;
document.querySelectorAll('.story:not(.mine)').forEach(x=>x.onclick=()=>x.classList.add('seen'));
(function(){const inp=$('mainSearch'),clr=$('spClear'),lbl=$('spLbl');
const emp=document.createElement('div');emp.className='spe';emp.textContent='No results found';chatList.append(emp);
function run(){const q=inp.value.trim().toLowerCase();let n=0;
 chatList.querySelectorAll('.row').forEach(r=>{const ok=!q||r.textContent.toLowerCase().includes(q);r.style.display=ok?'':'none';if(ok)n++});
 lbl.textContent=q?'Results':'Suggested';emp.style.display=(q&&!n)?'block':'none';clr.style.display=q?'block':'none'}
inp.oninput=run;clr.onclick=()=>{inp.value='';run();inp.focus()};})();
const toast=t=>{const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',1800)};
(function(){const b=$('nmPlus'),m=$('nmMenu');
 const close=()=>{m.classList.remove('on');b.classList.remove('on')};
 b.onclick=e=>{e.stopPropagation();const o=!m.classList.contains('on');m.classList.toggle('on',o);b.classList.toggle('on',o)};
 m.onclick=e=>{const i=e.target.closest('.nmi');if(!i)return;e.stopPropagation();close();i.dataset.a==='group'?gOpen():toast('New Server')};
 document.addEventListener('click',close);
})();
document.querySelectorAll('#acts .act').forEach(a=>a.onclick=()=>a.dataset.a==='group'?gOpen():toast('New Server'));
let sgK='p';
let sgQ='';
function myItems(){const out={p:[],g:[],s:[]};
 chatList.querySelectorAll('.row').forEach(r=>{const av=r.querySelector('.av');if(!av)return;
  const nEl=r.querySelector('.n');if(!nEl)return;const c=nEl.cloneNode(true);c.querySelectorAll('.tag').forEach(x=>x.remove());
  const name=c.textContent.trim();const k=av.dataset.img||'';
  const st=av.querySelector('.st');
  const mEl=r.querySelector('.m');const last=mEl?mEl.textContent.replace(/\s+/g,' ').trim():'';
  if(av.classList.contains('grpav'))out.g.push({k:'',name,sub:last||'Group',grp:1,fb:''});
  else if(av.classList.contains('sq')){const m=r.querySelector('.m');out.s.push({k,name,sub:m?m.textContent.trim():'Server',sq:1,fb:av.dataset.fb||name[0]})}
  else out.p.push({k,name,sub:last||'No messages yet',st:st?(st.classList.contains('on')?'on':st.classList.contains('idle')?'idle':''):'',fb:av.dataset.fb||name[0],user:!!USERS[k]})});
 return out}
function rSGN(){const D=myItems(),q=sgQ.trim().toLowerCase();
 const row=g=>`<div class="sgr ${g.user?'go':''}" data-k="${g.k}"><div class="av ${g.sq?'sq':''} ${g.grp?'grpav':''}" ${g.grp?'':`data-img="${g.k}" data-fb="${g.fb}"`}>${g.grp?'<i data-lucide="users"></i>':''}${g.st!==undefined?`<i class="st ${g.st}"></i>`:''}</div><div class="t"><b dir="auto"></b><span class="lm"></span></div></div>`;
 let list=q?[...D.p,...D.g,...D.s].filter(g=>g.name.toLowerCase().includes(q)):D[sgK];
 $('sgChips').style.display=q?'none':'';
 $('sgBody').innerHTML=list.length?list.map(row).join(''):`<div class="nores" style="padding:40px 16px;text-align:center;color:var(--mut)">${q?'No results':sgK==='g'?'You are not in any groups yet':'Nothing here yet'}</div>`;
 $('sgBody').querySelectorAll('.sgr .t b').forEach((b,i)=>{if(list[i])b.textContent=list[i].name});
 $('sgBody').querySelectorAll('.sgr .t .lm').forEach((b,i)=>{if(list[i])b.textContent=list[i].sub});
 hydrate($('sgBody'));lucide.createIcons()}
$('sgChips').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;sgK=c.dataset.k;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===c));rSGN()};
$('sgBody').onclick=e=>{const r=e.target.closest('.sgr');if(!r)return;{const a=e.target.closest('.av[data-img]');if(a&&USERS[a.dataset.img])return;if(r.querySelector('.av.sq')&&SRVS[r.dataset.k]){openSrv(r.dataset.k);return}openChat(r.querySelector('.t b').textContent,r.dataset.k);return}const b=e.target.closest('.sgf2');
 if(b){b.textContent=sgK==='p'?'Sent':'Joined';b.classList.remove('pr');b.classList.add('done')}else if(e.target.closest('.sgx'))r.remove()};
rSGN();
function filt(q){sgQ=q||'';rSGN()}
$('nmSearch').oninput=e=>filt(e.target.value);
