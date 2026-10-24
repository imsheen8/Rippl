/* Rippl — ملفات المستخدمين الآخرين */
/* ---------- other users' profiles ---------- */
const USERS={};
const BAN={}; /* optional banner color per user, e.g. BAN.saif='#2b5d9b' (default: red) */
const BANIMG={}; /* banner_url per user id (cache): shown on that user's profile when they set a banner */
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function paintBan(k,url){
  const el=document.querySelector('#upScroll .dban[data-k="'+k+'"]');if(!el)return;
  el.style.backgroundImage=url?'url("'+String(url).replace(/"/g,'%22')+'")':'';
  el.style.backgroundSize='cover';el.style.backgroundPosition='center';
}
function loadBan(k){
  if(BANIMG[k])paintBan(k,BANIMG[k]);              /* instant from cache */
  const c=window.ripplClient;if(!c||!UUID_RE.test(k))return;
  c.from('profiles').select('banner_url').eq('id',k).maybeSingle().then(r=>{
    if(!r||r.error||!r.data)return;                /* offline / column missing: keep what we have */
    BANIMG[k]=r.data.banner_url||'';paintBan(k,BANIMG[k]);
  },()=>{});
}
function openUser(k,seenEl){
  const u=USERS[k];if(!u)return;
  const ps=userPosts(k).map(pcard).join('')||'<div class="pempty2">No posts yet</div>';
  const pv=window.__present&&window.__present.get?window.__present.get(k):null,st=pv?(typeof pv==='string'&&/^(online|idle|dnd|invisible)$/.test(pv)?pv:'online'):'invisible';
  $('upScroll').innerHTML=`<div class="dtop">
    <div class="dban" data-k="${k}" style="background:${BAN[k]||'#b03530'}"></div>
    <button class="dx" id="upBack" aria-label="Back"><i data-lucide="arrow-left"></i></button>
    <div class="dav"><div class="av" data-img="${k}" data-fb="${u[0][0]}"></div><span class="dst" data-st="${st}"></span></div>
  </div>
  <div class="dinfo">
    <div class="pname" dir="ltr" data-vid="${k}"><bdi>${esc(u[0])}</bdi></div>
    <div class="dun">@${esc(u[1])}</div>
    <div class="pstats"><div><b>${u[2]}</b><span>Following</span></div><div><b>${u[3]}</b><span>Followers</span></div><div><b>${u[4]}</b><span>Likes</span></div></div>
  </div>
  <div class="pacts"><button class="fol" id="upFol">Follow</button><button class="msg" id="upMsg">Message</button><button class="addf" aria-label="Add friend"><i data-lucide="user-plus"></i></button></div>
  <div class="pbio" dir="auto">${u[5].map(x=>esc(x)).join('<br>')}${u[6]?`<br><a href="${u[6]}" target="_blank" rel="noopener">${u[6]}</a>`:''}</div>
  <div class="ptabs two"><div class="on"><i data-lucide="newspaper"></i></div><div><i data-lucide="repeat-2"></i></div></div>
  <div class="pfeed" id="upPosts">${ps}</div>`;
  hydrate($('upScroll'));lucide.createIcons();loadBan(k);
  $('upScroll').scrollTop=0;
  $('uprof').classList.add('on');
  $('upBack').onclick=()=>$('uprof').classList.remove('on');
  $('upMsg').onclick=()=>openChat(u[0],k);
  $('upFol').onclick=e=>{const b=e.currentTarget,on=b.classList.toggle('on');b.textContent=on?'Following':'Follow'};
  (function(){const tb=[...document.querySelectorAll('#upScroll .ptabs div')];
    tb.forEach((t,i)=>t.onclick=()=>{tb.forEach(x=>x.classList.toggle('on',x===t));
      $('upPosts').innerHTML=i?'<div class="pempty2">No reposts yet</div>':ps;hydrate($('upPosts'));lucide.createIcons()})})();
}
document.addEventListener('click',e=>{
  let av=e.target.closest('.av[data-img]');
  const fi=e.target.closest('.fi');
  if(!av&&fi)av=fi.querySelector('.av[data-img]');
  if(!av||!USERS[av.dataset.img])return;
  const st=av.closest('.story');if(st)st.classList.add('seen');
  openUser(av.dataset.img);
});
