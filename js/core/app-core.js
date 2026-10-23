/* Sheen — النواة: دوال مساعدة، التنقل بين الشاشات */
const $=id=>document.getElementById(id);
/* image sources: pravatar.cc (people photos) + picsum.photos (server images) */
const P=n=>`https://i.pravatar.cc/160?img=${n}`, S_=s=>`https://picsum.photos/seed/${s}/160`;
const IMG={me:P(3)};
function hydrate(root){
  (root||document).querySelectorAll('[data-img]:not([data-ok])').forEach(el=>{
    el.dataset.ok=1;
    const im=new Image();im.alt='';im.loading='lazy';im.referrerPolicy='no-referrer';
    im.onerror=()=>{const f=document.createElement('span');f.textContent=el.dataset.fb||'';im.replaceWith(f)};
    im.src=el.dataset.src||IMG[el.dataset.img];
    el.prepend(im);
  });
}
const show=id=>{if($('nmMenu')){$('nmMenu').classList.remove('on');$('nmPlus').classList.remove('on')}if(id==='newmsg'&&typeof rSGN==='function')rSGN();['notif','prof','newmsg','compose','chat','srv','pedit'].forEach(s=>$(s).classList.toggle('on',s===id));syncBar()};
const hide=()=>show(null);
const anyScr=()=>!!document.querySelector('.screen.on');
function closeAll(){['grp','uprof'].forEach(k=>$(k).classList.remove('on'));show(null)}
function syncBar(){const sc=anyScr(),on=id=>$(id).classList.contains('on'),home=document.querySelector('.panel').classList.contains('home');
 $('mtHome').classList.toggle('on',!sc&&home);$('mtInbox').classList.toggle('on',!sc&&!home);
 $('mtFriends').classList.toggle('on',on('newmsg')||on('grp'));$('bellBtn').classList.toggle('on',on('notif'))}
new MutationObserver(syncBar).observe(document.querySelector('.app'),{subtree:true,attributes:true,attributeFilter:['class']});
$('bellBtn').onclick=e=>{e.stopPropagation();closeAll();show('notif')};
$('meBtn').onclick=()=>{closeAll();show('prof')};
$('nBack').onclick=hide;$('pClose').onclick=hide;
$('plusBtn').onclick=()=>{$('nmSearch').value='';filt('');show('newmsg')};

const chatList=$('chatList'),panelEl=document.querySelector('.panel');
$('mtFriends').onclick=e=>{e.stopPropagation();closeAll();$('nmSearch').value='';filt('');show('newmsg')};
let lastY=0;const fabEl=$('plusBtn');
chatList.addEventListener('scroll',()=>{const y=chatList.scrollTop;panelEl.classList.toggle('scrolled',y>60);if(Math.abs(y-lastY)>4){fabEl.classList.toggle('hide',y>lastY&&y>40);lastY=y}},{passive:true});
document.querySelectorAll('.sug').forEach(b=>b.onclick=e=>{e.stopPropagation();b.classList.toggle('done');b.innerHTML=b.classList.contains('done')?'<i data-lucide="check"></i>':'<i data-lucide="user-plus"></i>';lucide.createIcons();});
