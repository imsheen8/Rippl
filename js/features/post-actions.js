/* Sheen — إجراءات المنشورات (إعجاب، تعليق...) */
/* post actions (feed + profiles) */
const aToast=t=>{const e=$('aToast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',1800)};
function postClick(e){
 if(e.target.closest('.fcomp')){cpOpen('me');return}
 const f=e.target.closest('.fn,.fh .av');
 if(f){const k=f.dataset.k||f.dataset.img;
  if(k==='me'){closeAll();show('prof')}else if(f.classList.contains('fn'))openUser(k);
  return}
 const post=e.target.closest('.fpost');if(!post)return;
 if(e.target.closest('.fl')){const b=e.target.closest('.fl'),on=b.classList.toggle('on');post.querySelector('.lc').textContent=fmtN(+post.dataset.n+(on?1:0))}
 else if(e.target.closest('.fcb')){const c=post.querySelector('.fcmt');c.classList.toggle('on');if(c.classList.contains('on'))c.querySelector('input').focus()}
 else if(e.target.closest('.fsh'))aToast('Link copied');
}
['feed','upScroll','myPosts'].forEach(id=>$(id).addEventListener('click',postClick));
document.addEventListener('keydown',e=>{
 if(e.key!=='Enter')return;const i=e.target.closest&&e.target.closest('.fcmt input');if(!i)return;
 const v=i.value.trim();if(!v)return;
 const post=i.closest('.fpost'),c=document.createElement('div');c.className='cmt';c.dir='auto';
 const b=document.createElement('b');b.textContent='شين';c.append(b,v);
 post.querySelector('.cmlist').append(c);i.value='';
 const cc=post.querySelector('.cc');cc.textContent=(+cc.textContent||0)+1});
