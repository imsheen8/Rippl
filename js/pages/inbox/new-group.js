/* Rippl — إنشاء مجموعة */
/* ---------- create group chat ---------- */
const gSel=new Set();
const gToast=t=>{const e=$('gtoast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',1800)};
function gRender(){
  const q=$('gSearch').value.trim().toLowerCase();
  let ent=Object.entries(USERS);
  if(q)ent=ent.filter(([k,u])=>(u[0]+' '+u[1]).toLowerCase().includes(q));else ent=ent.slice(0,6);
  const rows=ent.map(([k,u])=>`<div class="gi ${gSel.has(k)?'sel':''}" data-k="${k}"><div class="av" data-img="${k}" data-fb="${u[0][0]}"></div><div class="tx" dir="auto"><b>${u[0]}</b><small>${u[1]}</small></div><span class="chk"><i data-lucide="check"></i></span></div>`).join('');
  $('gBody').innerHTML=(q?'':'<div class="gsec">Suggested</div>')+(rows||'<div class="nores">No results</div>')+(q?'':'<div class="gsr" id="gSr"><span class="ci"><i data-lucide="search"></i></span><b>Search by name or username</b><i data-lucide="chevron-right"></i></div>');
  hydrate($('gBody'));lucide.createIcons();
  const n=gSel.size;$('gCreate').textContent=n?'Create ('+n+')':'Create';$('gCreate').classList.toggle('off',!n);
}
function gOpen(){gSel.clear();$('gSearch').value='';gRender();$('grp').classList.add('on')}
$('gBack').onclick=()=>$('grp').classList.remove('on');
$('gSearch').oninput=gRender;
$('gBody').addEventListener('click',e=>{
  const r=e.target.closest('.gi');
  if(r){e.stopPropagation();const k=r.dataset.k;gSel.has(k)?gSel.delete(k):gSel.add(k);
    r.classList.toggle('sel',gSel.has(k));const n=gSel.size;$('gCreate').textContent=n?'Create ('+n+')':'Create';$('gCreate').classList.toggle('off',!n);return}
  if(e.target.closest('#gSr'))$('gSearch').focus();
},true);
$('gCreate').onclick=()=>{
  if(!gSel.size)return gToast('Select at least one friend');
  const names=[...gSel].map(k=>USERS[k][0]).join(', ');
  const row=document.createElement('div');row.className='row hl';
  row.innerHTML='<div class="av grpav"><i data-lucide="users"></i></div><div class="t" dir="auto"><div class="n"></div><div class="m">You created a group</div></div><time>now</time>';
  row.querySelector('.n').textContent=names;
  const first=chatList.querySelector('.row');first?first.before(row):chatList.append(row);
  lucide.createIcons();
  $('grp').classList.remove('on');show(null);chatList.scrollTo({top:0});
};
