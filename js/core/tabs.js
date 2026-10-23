/* Sheen — تبديل التبويبات الرئيسية */
function setTab(t){
  const home=t==='home';
  panelEl.classList.toggle('home',home);
  syncBar();
  if(!home&&!anyScr())setTimeout(()=>$('mainSearch').focus(),60);
  panelEl.classList.toggle('scrolled',!home&&chatList.scrollTop>60);
}
$('mtHome').onclick=e=>{e.stopPropagation();if(anyScr()){closeAll();setTab('home');return}if(panelEl.classList.contains('home'))$('feed').scrollTo({top:0,behavior:'smooth'});else setTab('home')};
$('mtInbox').onclick=e=>{e.stopPropagation();if(anyScr()){closeAll();setTab('inbox');return}if(!panelEl.classList.contains('home'))chatList.scrollTo({top:0,behavior:'smooth'});else setTab('inbox')};
