/* Rippl — كتابة منشور */
/* composer */
const DESTS=[{id:'me'}];
let cpDest='me',cpImg=null;
function cpUpd(){$('cpPost').classList.toggle('off',!($('cpText').value.trim()||cpImg))}
function cpRender(){
 $('cpDest').innerHTML=DESTS.map(d=>`<button class="chip ${d.id===cpDest?'on':''}" data-id="${d.id}">${d.srv?`<bdi>${d.srv}</bdi> › <bdi>${d.ch}</bdi>`:'<i data-lucide="user"></i> My profile'}</button>`).join('');
 const fr=!!DESTS.find(d=>d.id===cpDest).forum;
 $('cpTitle').classList.toggle('hid',!fr);$('cpTags').classList.toggle('hid',!fr);
 $('cpText').placeholder=fr?'Write the post…':'What’s on your mind?';
 lucide.createIcons();cpUpd()}
function cpOpen(id){
 cpDest=id||'me';if(cpImg)URL.revokeObjectURL(cpImg);cpImg=null;
 $('cpText').value='';$('cpTitle').value='';$('cpTags').value='';$('cpImg').classList.add('hid');
 cpRender();closeAll();show('compose');setTimeout(()=>$('cpText').focus(),80)}
$('cpDest').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;cpDest=c.dataset.id;cpRender()};
$('cpBack').onclick=hide;
$('cpText').oninput=cpUpd;
$('cpFile').onchange=e=>{const fl=e.target.files[0];if(!fl)return;if(cpImg)URL.revokeObjectURL(cpImg);
 cpImg=URL.createObjectURL(fl);$('cpImgEl').src=cpImg;$('cpImg').classList.remove('hid');e.target.value='';cpUpd()};
$('cpImgX').onclick=()=>{if(cpImg)URL.revokeObjectURL(cpImg);cpImg=null;$('cpImg').classList.add('hid');cpUpd()};
$('cpPost').onclick=()=>{
 const text=$('cpText').value.trim(),dd=DESTS.find(d=>d.id===cpDest);
 if(!text&&!cpImg)return aToast('Write something or add a photo');
 const title=dd.forum?$('cpTitle').value.trim():'';
 if(dd.forum&&!title)return aToast('Add a title for the forum post');
 const tags=dd.forum?$('cpTags').value.split(/[,،#\s]+/).filter(Boolean).slice(0,5):[];
 const o={k:'me',t:'Just now',text,img:cpImg,title,tags,likes:0,cm:0,sh:0,dest:dd.srv?{srv:dd.srv,ch:dd.ch}:null};
 MYPOSTS.unshift(o);POSTS.unshift(o);cpImg=null;
 renderFeed();renderMy();hide();setTab('home');$('feed').scrollTo({top:0});aToast('Posted')};
renderFeed();renderMy();
