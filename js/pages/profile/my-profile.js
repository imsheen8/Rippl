/* Rippl — الملف الشخصي الخاص */
/* own profile */
const PT=[['images','Share your first post','Create post'],['lock','Only you can see your private posts','Add private post'],['repeat-2','Posts you reposted will appear here','Browse posts'],['bookmark','Save posts to find them later','Browse posts'],['heart','Posts you liked will appear here','Browse posts']];
let pTab=0;
function renderMy(){
 const mp=$('myPosts'),e=document.querySelector('#prof .pempty'),d=PT[pTab];
 if(pTab===0){mp.innerHTML=COMP+MYPOSTS.map(pcard).join('');mp.style.display=''}else{mp.innerHTML='';mp.style.display='none'}
 e.style.display=(pTab!==0||!MYPOSTS.length)?'':'none';
 const ic=e.querySelector('svg,i');if(ic)ic.outerHTML='<i data-lucide="'+d[0]+'"></i>';
 $('pemptyTxt').textContent=d[1];$('pemptyBtn').textContent=d[2];
 hydrate(mp);lucide.createIcons()}
document.querySelectorAll('#prof .ptabs div').forEach(t=>t.onclick=()=>{
 document.querySelectorAll('#prof .ptabs div').forEach(x=>x.classList.toggle('on',x===t));pTab=+t.dataset.t;renderMy()});
$('pemptyBtn').onclick=()=>{if(pTab===0)cpOpen('me')};
