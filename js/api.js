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

    const response = await fetch(apiUrl(), {
      method: "POST",
      redirect: "follow",
      body
    });

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
