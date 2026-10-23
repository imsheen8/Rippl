/* Rippl — يُظهر شاشة الدخول فورًا إن لم توجد جلسة محفوظة */
try{if(!Object.keys(localStorage).some(function(k){return /^sb-.*-auth-token$/.test(k)}))document.getElementById("ripplAuthGate").classList.add("on")}catch(e){document.getElementById("ripplAuthGate").classList.add("on")}
