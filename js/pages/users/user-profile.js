/* Sheen — ملفات المستخدمين الآخرين */
/* ---------- other users' profiles ---------- */
const USERS={};
const BAN={}; /* optional banner color per user, e.g. BAN.saif='#2b5d9b' (default: red) */
const VIEWS=['121.5K','347.4K','258.4K','2,340','443','262K','18.9K','5,120','76.3K'];
function openUser(k,seenEl){
  const u=USERS[k];if(!u)return;
  const ps=userPosts(k).map(pcard).join('')||'<div class="pempty2">No posts yet</div>';
  const st=['online','idle','dnd','invisible'][[...k].reduce((n,c)=>n+c.charCodeAt(0),0)%4];
  $('upScroll').innerHTML=`<div class="dtop">
    <div class="dban" data-img="b_${k}" data-src="https://picsum.photos/seed/${k}banner/900/420" style="background:${BAN[k]||'#b03530'}"></div>
    <button class="dx" id="upBack" aria-label="Back"><i data-lucide="arrow-left"></i></button>
    <div class="dav"><div class="av" data-img="${k}" data-fb="${u[0][0]}"></div><span class="dst" data-st="${st}"></span></div>
  </div>
  <div class="dinfo">
    <div class="pname" dir="ltr"><bdi>${u[0]}</bdi></div>
    <div class="dun">@${u[1]}</div>
    <div class="pstats"><div><b>${u[2]}</b><span>Following</span></div><div><b>${u[3]}</b><span>Followers</span></div><div><b>${u[4]}</b><span>Likes</span></div></div>
  </div>
  <div class="pacts"><button class="fol" id="upFol">Follow</button><button class="msg" id="upMsg">Message</button><button class="addf" aria-label="Add friend"><i data-lucide="user-plus"></i></button></div>
  <div class="pbio" dir="auto">${u[5].map(x=>x).join('<br>')}${u[6]?`<br><a href="${u[6]}" target="_blank" rel="noopener">${u[6]}</a>`:''}</div>
  <div class="ptabs two"><div class="on"><i data-lucide="newspaper"></i></div><div><i data-lucide="repeat-2"></i></div></div>
  <div class="pfeed" id="upPosts">${ps}</div>`;
  hydrate($('upScroll'));lucide.createIcons();
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
