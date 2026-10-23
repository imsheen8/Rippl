/* Rippl — الإشعارات والمتابعون والاقتراحات */
const N=[];
const typ=n=>/replied/.test(n[2])?'r':/mentioned/.test(n[2])?'m':'x';
const nRow=n=>`<div class="ni" data-ty="${typ(n)}"><div class="av" data-img="${n[0]}" data-fb="${n[1]}"></div><div class="b">${n[2]}<div class="q ${n[5]?'m':''}" dir="auto">${n[3]}</div></div><time>${n[4]}</time></div>`;
let nF='all',nAll=false,fAll=false;
function rNA(){const L=N.filter(n=>nF==='all'||typ(n)===nF);$('nlist').innerHTML=(nAll?L:L.slice(0,4)).map(nRow).join('')||'<div class="vall">No notifications</div>';$('vaAct').style.display=(nAll||L.length<=4)?'none':'';hydrate($('nlist'));lucide.createIcons()}
const FO=[];
function rFO(){const L=fAll?FO:FO.slice(0,3);$('flist').innerHTML=L.map((f,i)=>`<div class="fr"><div class="av" data-img="${f[0]}" data-fb="${f[1]}"></div><div class="t"><b>${f[2]}</b><small>started following you · ${f[3]}</small></div><button class="btn ${f[4]?'':'pr'} fbk">${f[4]?'Message':'Follow back'}</button></div>`).join('');$('vaFol').style.display=fAll?'none':'';hydrate($('flist'));lucide.createIcons()}
const SG=[];
function rSG(){const card=$('pgFol').style.display!=='none';
 $('sglist').innerHTML=SG.map((g,i)=>card?`<div class="sgc" data-i="${i}"><div class="hd"><div class="av" data-img="${g[0]}" data-fb="${g[1]}"></div><div class="t" style="flex:1"><b style="font-size:15px">${g[2]}</b><div style="color:var(--mut);font-size:13px;margin-top:2px">${g[3]}</div></div></div><div class="th">${[1,2,3,4].map(k=>`<div style="background-image:url(https://picsum.photos/seed/${g[0]}${k}/200/280)"><em>New</em></div>`).join('')}</div><div class="ac"><button class="btn sgx2">Remove</button><button class="btn pr sgf">Add friend</button></div></div>`:`<div class="sgr" data-i="${i}"><div class="av" data-img="${g[0]}" data-fb="${g[1]}"></div><div class="t"><b>${g[2]}</b><span>${g[3]}</span></div><button class="btn pr sgf">Add friend</button><button class="sgx" aria-label="Dismiss"><i data-lucide="x"></i></button></div>`).join('');hydrate($('sglist'));lucide.createIcons()}
function nTab(fol){$('pgAct').style.display=fol?'none':'';$('pgFol').style.display=fol?'':'none';$('ntAct').classList.toggle('on',!fol);$('ntFol').classList.toggle('on',fol);closeDD();rSG()}
function closeDD(){$('ndd').classList.remove('on');$('ndim').classList.remove('on');$('ntAct').classList.remove('open')}
$('ntAct').onclick=()=>{if(!$('ntAct').classList.contains('on'))return nTab(false);const o=!$('ndd').classList.contains('on');$('ndd').classList.toggle('on',o);$('ndim').classList.toggle('on',o);$('ntAct').classList.toggle('open',o)};
$('ntFol').onclick=()=>nTab(true);$('ndim').onclick=closeDD;
$('ndd').onclick=e=>{const o=e.target.closest('.ddo');if(!o)return;document.querySelectorAll('.ddo').forEach(x=>x.classList.toggle('on',x===o));nF=o.dataset.f;$('ntActL').textContent=o.querySelector('b').textContent;nAll=false;rNA();closeDD()};
$('vaAct').onclick=()=>{nAll=true;rNA()};$('vaFol').onclick=()=>{fAll=true;rFO()};
$('flist').onclick=e=>{const b=e.target.closest('.fbk');if(b&&b.classList.contains('pr')){b.textContent='Message';b.classList.remove('pr')}};
$('sglist').onclick=e=>{const r=e.target.closest('[data-i]');if(!r)return;
 if(e.target.closest('.sgf')){const b=e.target.closest('.sgf');b.textContent='Sent';b.classList.remove('pr');b.classList.add('done')}
 else if(e.target.closest('.sgx,.sgx2'))r.remove()};
rNA();rFO();rSG();
