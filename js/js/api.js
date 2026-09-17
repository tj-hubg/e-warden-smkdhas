(function(){
  "use strict";

  function apiUrl(){
    const value = String(window.EWARDEN_CONFIG?.API_URL || "").trim();
    if(!value || value.includes("PASTE_APPS_SCRIPT")){
      throw new Error("URL API Apps Script belum ditetapkan dalam js/config.js.");
    }
    return value;
  }

  async function apiCall(action, ...args){
    const body = new URLSearchParams();
    body.set("action", action);
    body.set("args", JSON.stringify(args));

    const controller = new AbortController();
    const timeoutId = setTimeout(()=>controller.abort(), 30000);

    let response;
    try{
      response = await fetch(apiUrl(), {
        method: "POST",
        redirect: "follow",
        body,
        signal: controller.signal
      });
    }catch(error){
      if(error?.name === "AbortError"){
        throw new Error("Sambungan mengambil masa terlalu lama. Sila cuba semula.");
      }
      throw error;
    }finally{
      clearTimeout(timeoutId);
    }

    if(!response.ok){
      throw new Error(`API tidak dapat dihubungi (${response.status}).`);
    }

    const payload = await response.json();
    if(!payload || payload.success !== true){
      throw new Error(payload?.error || "Ralat backend yang tidak diketahui.");
    }
    return payload.data;
  }

  window.ewardenApi = { call: apiCall };
})();
