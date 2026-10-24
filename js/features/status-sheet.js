/* Rippl — ورقة حالة الاتصال */
/* ---------- online status sheet ---------- */
const ST={online:['Online','#23a55a'],idle:['Idle','#f0b232'],dnd:['Do Not Disturb','#ed4245'],invisible:['Invisible','#80848e']};
let curSt='online';
function stSync(){
  document.querySelectorAll('#stSheet .scard:not(.scus) .sopt').forEach(o=>o.classList.toggle('on',o.dataset.s===curSt));
  const sm=document.querySelector('.me small');if(sm)sm.textContent=ST[curSt][0];
  const d=document.querySelector('.me .av .st');if(d)d.style.background=ST[curSt][1];
  const pd=document.querySelector('#prof .dst');if(pd)pd.dataset.st=curSt;
}
const stOpen=o=>{$('stBg').classList.toggle('on',o);$('stSheet').classList.toggle('on',o)};
$('stBg').onclick=()=>stOpen(false);
document.querySelectorAll('#stSheet .scard:not(.scus) .sopt').forEach(o=>o.onclick=()=>{curSt=o.dataset.s;stSync();setTimeout(()=>stOpen(false),180)});
$('stCustom').onclick=()=>stOpen(false);
stSync();
