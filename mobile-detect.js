(()=>{
  const ua=navigator.userAgent||'';
  const mobile=(navigator.userAgentData&&navigator.userAgentData.mobile)||/Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  if(mobile){
    document.documentElement.classList.add('fer-mobile');
  }
})();
