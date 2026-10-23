/* Rippl — الصفحة الرئيسية وبطاقات المنشورات */
/* ---------- home feed + tab switching ---------- */
const POSTS_START=1;
const fmtN=n=>n>=1000?(n/1000).toFixed(1).replace('.0','')+'K':String(n);
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pic=x=>`https://picsum.photos/seed/${x}/600/400`;
const POSTS=[];
const MYPOSTS=[];
const nameOf=k=>k==='me'?'شين':USERS[k][0];
function pcard(o){
 const nm=nameOf(o.k);
 const d=o.dest?`<span class="fd"><i data-lucide="${o.title?'messages-square':'hash'}"></i><bdi>${esc(o.dest.srv)}</bdi> › <bdi>${esc(o.dest.ch)}</bdi></span>`:'';
 const tg=(o.tags||[]).map(t=>`<em class="ftag">${esc(t)}</em>`).join('');
 return `<div class="fpost" data-n="${o.likes||0}">
 <div class="fh"><div class="av" data-img="${o.k}" data-fb="${esc(nm[0])}"></div><div class="fm"><b class="fn" data-k="${o.k}" dir="auto">${esc(nm)}</b><span>${esc(o.t)} · <i data-lucide="globe"></i></span>${d}</div><button class="fx" aria-label="More"><i data-lucide="ellipsis"></i></button></div>
 ${o.title?`<div class="ftitle" dir="auto">${esc(o.title)}</div>`:''}
 ${o.text?`<div class="ft" dir="auto">${esc(o.text)}</div>`:''}
 ${o.img?`<div class="fimg" data-img="fp" data-src="${o.img}">${tg?`<div class="ftags">${tg}</div>`:''}</div>`:(tg?`<div class="ftags in">${tg}</div>`:'')}
 <div class="fc"><span class="fr"><u class="r1"><i data-lucide="thumbs-up"></i></u><u class="r2"><i data-lucide="heart"></i></u><em class="lc">${fmtN(o.likes||0)}</em></span><span><span class="cc">${o.cm||0}</span> comments · ${o.sh||0} shares</span></div>
 <div class="fa"><button class="fl"><i data-lucide="thumbs-up"></i>Like</button><button class="fcb"><i data-lucide="message-circle"></i>Comment</button><button class="fsh"><i data-lucide="share-2"></i>Share</button></div>
 <div class="cmlist"></div>
 <div class="fcmt"><div class="av" data-img="me" data-fb="ش"></div><input placeholder="Write a comment…" dir="auto"></div>
</div>`}
function userPosts(k){const u=USERS[k];const L=POSTS.filter(p=>p.k===k);
 const txt=[u[5][0],'🤍','☕ صباح الخير'];
 for(let i=L.length;i<3;i++)L.push({k,t:(i+1)+'w',text:txt[i],img:i!==1?pic(k+'post'+i):'',likes:100+i*70,cm:5+i,sh:i+1});
 return L}
const COMP=`<div class="fcomp"><div class="av" data-img="me" data-fb="ش"></div><div class="fpill" dir="auto">What’s on your mind?</div><button aria-label="Photo"><i data-lucide="image"></i></button></div>`;
function renderFeed(){$('feed').innerHTML=COMP+POSTS.map(pcard).join('');hydrate($('feed'));lucide.createIcons()}
