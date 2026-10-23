/* Rippl — شاشة المحادثة */
/* ---------- chat ---------- */
const CH={};let chCur=null,chFrom=null;
const SEED={};
const chTime=(i,n)=>{const m=(60+((i-n)*2));const d=new Date(Date.now()-(n-i)*120000);return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
const chNow=()=>new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
function rowName(r){const n=r.querySelector('.n');if(!n)return'';const c=n.cloneNode(true);c.querySelectorAll('.tag').forEach(x=>x.remove());return c.textContent.trim()}
function chFind(name){const D=myItems();for(const t of ['p','g','s']){const f=D[t].find(x=>x.name===name);if(f)return f}return null}
function chMsgs(it){
 if(CH[it.name])return CH[it.name];
 let m=[];const sd=SEED[it.name],s=it.sub||'';
 if(sd)m=sd.map((a,i)=>({me:!!a[0],text:a[1],t:chTime(i,sd.length)}));
 else if(it.grp)m=[{sys:1,text:s||'Group created'}];
 else if(it.sq)m=[{sys:1,text:'Welcome to '+it.name}];
 else if(s&&s!=='No messages yet'){
  if(s.startsWith('You: '))m=[{me:true,text:s.slice(5),t:chNow()}];
  else{const i=s.indexOf(': ');m=[{me:false,text:i>-1?s.slice(i+2):s,t:chNow()}]}
 }
 return CH[it.name]=m}
function chRender(){
 const it=chCur,ms=chMsgs(it),b=$('chBody');b.replaceChildren();
 if(!ms.length){
  const e=document.createElement('div');e.className='chempty';
  e.innerHTML='<div class="av" data-img="'+(it.k||'')+'" data-fb=""></div><b></b>Say hi 👋';
  e.querySelector('b').textContent=it.name;e.querySelector('.av').dataset.fb=it.name[0];
  b.append(e);hydrate(e);return}
 const d=document.createElement('div');d.className='chdate';d.textContent='Today';b.append(d);
 ms.forEach((m,i)=>{
  if(m.sys){const s=document.createElement('div');s.className='chsys';s.textContent=m.text;b.append(s);return}
  const p=ms[i-1],g=document.createElement('div');
  g.className='mg '+(m.me?'me':'th')+((!p||p.sys||p.me!==m.me)?' first':'');
  const bb=document.createElement('div');bb.className='bb';
  if(m.img){const im=document.createElement('img');im.className='pic';im.src=m.img;im.alt='';bb.append(im)}
  const tx=document.createElement('div');tx.className='tx';tx.dir='auto';tx.textContent=m.text||'';
  const tm=document.createElement('span');tm.className='tm';tm.textContent=m.t||'';
   if(m.me&&m.src!=='ch'&&!it.chan&&!it.grp&&!it.sq&&/^[0-9a-f-]{36}$/i.test(it.k||'')){const ck=document.createElement('span');ck.className='ck'+(m.read?' rd':'');ck.textContent=m.pending?'🕓':m.read?'✓✓':'✓';ck.setAttribute('aria-label',m.pending?'Waiting to send':m.read?'Seen':'Sent');tm.append(ck)}
  if(m.pending&&!tm.querySelector('.ck')){const ck=document.createElement('span');ck.className='ck';ck.textContent='🕓';ck.setAttribute('aria-label','Waiting to send');tm.append(ck)}
  if(m.text)bb.append(tx);bb.append(tm);g.append(bb);b.append(g)});
 b.scrollTop=b.scrollHeight}
function openChat(name,k){
 const it=chFind(name)||(window.chPre&&chPre.name===name?chPre:null)||{name,k:k||'',st:'',sub:''};if(k&&!it.k)it.k=k;
 chFrom=$('newmsg').classList.contains('on')?'newmsg':null;
 chCur=it;closeAll();show('chat');$('chEmo').classList.remove('on');
 const w=$('chAvW');
 if(it.grp)w.innerHTML='<div class="av grpav"><i data-lucide="users"></i></div>';
 else{const d=document.createElement('div');d.className='av'+(it.sq?' sq':'');d.dataset.img=it.k;d.dataset.fb=it.fb||it.name[0];
  if(!it.sq){const s=document.createElement('i');s.className='st '+(it.st||'');d.append(s)}
  w.replaceChildren(d);hydrate(w)}
 $('chName').textContent=it.name;
 const sm=$('chSt');sm.className=it.st==='on'?'on':'';
 sm.textContent=it.grp?'Group':it.sq?'Server':it.st==='on'?'Online':it.st==='idle'?'Idle':'Offline';
 $('chInput').value='';$('chInput').placeholder='Message '+it.name;$('chSend').classList.add('off');
 chRender();lucide.createIcons()}
function chBump(it,text){
 if(it.chan)return;
 let row=[...chatList.querySelectorAll('.row')].find(r=>rowName(r)===it.name);
 if(!row){
  row=document.createElement('div');row.className='row';
  row.innerHTML='<div class="av" data-img="'+(it.k||'')+'" data-fb=""><i class="st"></i></div><div class="t"><div class="n"></div></div><time></time>';
  row.querySelector('.n').textContent=it.name;row.querySelector('.av').dataset.fb=it.name[0];
  const f=chatList.querySelector('.row');f?f.before(row):chatList.append(row);hydrate(row)}
 let m=row.querySelector('.m');if(!m){m=document.createElement('div');m.className='m';row.querySelector('.t').append(m)}
 m.textContent='You: '+text;row.querySelector('time').textContent='now';
 const f=chatList.querySelector('.row');if(f!==row)f.before(row)}
function chSend(){
 const v=$('chInput').value.trim();if(!v||!chCur)return;
 chMsgs(chCur).push({me:true,text:v,t:chNow()});
 $('chInput').value='';$('chSend').classList.add('off');
 chRender();chBump(chCur,v);$('chInput').focus()}
$('chSend').onclick=chSend;
(function(){const E='😀😂🥹😍🥰😎🤔😅😭😡👍👎🙏❤️🔥🎉✨💯👏🤝😴🤍☕⚽'.match(/\p{Extended_Pictographic}(\uFE0F)?/gu);
 const box=$('chEmo');E.forEach(x=>{const b=document.createElement('button');b.textContent=x;b.onclick=()=>{const i=$('chInput');i.value+=x;i.focus();$('chSend').classList.remove('off')};box.append(b)});
 $('chEmoB').onclick=e=>{e.stopPropagation();box.classList.toggle('on')};
 $('chInput').addEventListener('focus',()=>box.classList.remove('on'));
 $('chPlus').onclick=()=>$('chFile').click();$('chImgB').onclick=()=>$('chFile').click();
 $('chFile').onchange=e=>{const f=e.target.files[0];if(!f||!chCur)return;
  chMsgs(chCur).push({me:true,img:URL.createObjectURL(f),t:chNow()});e.target.value='';chRender();chBump(chCur,'📷 Photo')}})();
$('chInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();chSend()}});
$('chInput').addEventListener('input',e=>$('chSend').classList.toggle('off',!e.target.value.trim()));
$('chBack').onclick=()=>{chFrom==='srv'?show('srv'):chFrom==='newmsg'?show('newmsg'):hide()};
$('chCall').onclick=()=>aToast('Calling…');$('chVid').onclick=()=>aToast('Starting video call…');
$('chHd').onclick=()=>{if(chCur&&chCur.k&&USERS[chCur.k])openUser(chCur.k)};
chatList.addEventListener('click',e=>{
 const a=e.target.closest('.av[data-img]');if(a&&USERS[a.dataset.img])return;
 const r=e.target.closest('.row');if(!r)return;{const sa=r.querySelector('.av.sq');if(sa&&SRVS[sa.dataset.img]){openSrv(sa.dataset.img);return}}const n=rowName(r);if(n)openChat(n,r.querySelector('.av')&&r.querySelector('.av').dataset.img)});
