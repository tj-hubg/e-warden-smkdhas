  const $ = id => document.getElementById(id);

  function applyAdaptiveScale(){
    const w = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 320);
    const h = Math.max(480, window.innerHeight || document.documentElement.clientHeight || 480);

    // Detect actual viewport first, then derive readable scale.
    // 390 x 844 is used only as a reference point, not as a fixed breakpoint.
    const widthRatio = 390 / w;
    const heightRatio = 844 / h;

    // UI geometry grows gently.
    let uiScale = 1.10 + ((widthRatio - 1) * 0.22) + ((heightRatio - 1) * 0.08);

    // Text is intentionally larger for senior-friendly use.
    let fontScale = 1.28 + ((widthRatio - 1) * 0.30) + ((heightRatio - 1) * 0.10);

    // Spacing also increases slightly so larger text does not feel cramped.
    let spaceScale = 1.08 + ((widthRatio - 1) * 0.16);

    uiScale = Math.max(1.06, Math.min(1.38, uiScale));
    fontScale = Math.max(1.22, Math.min(1.62, fontScale));
    spaceScale = Math.max(1.04, Math.min(1.28, spaceScale));

    document.documentElement.style.setProperty("--ui-scale", uiScale.toFixed(3));
    document.documentElement.style.setProperty("--font-scale", fontScale.toFixed(3));
    document.documentElement.style.setProperty("--space-scale", spaceScale.toFixed(3));
  }


  function applyViewportPresentation(){
    const w = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 320);
    const h = Math.max(480, window.innerHeight || document.documentElement.clientHeight || 480);

    // Actual viewport-based presentation.
    // Mobile portrait layout activates only when the browser viewport is narrow and taller than wide.
    const isPortrait = h >= w;
    const useMobilePortrait = isPortrait && w <= 700;

    document.body.classList.toggle("mobile-portrait", useMobilePortrait);

    // Scale continuously from actual viewport width.
    // 390 CSS px is the reference width for the approved phone composition.
    const rawScale = w / 390;
    const mobileScale = Math.max(0.90, Math.min(1.18, rawScale));
    const mobileFont = Math.max(0.98, Math.min(1.18, 1 + ((390 - w) / 390) * 0.10));

    document.documentElement.style.setProperty("--mobile-w", String(w));
    document.documentElement.style.setProperty("--mobile-scale", mobileScale.toFixed(3));
    document.documentElement.style.setProperty("--mobile-font", mobileFont.toFixed(3));
  }


  let adaptiveScaleTimer=null;

  function scheduleAdaptiveScale(){
    clearTimeout(adaptiveScaleTimer);
    adaptiveScaleTimer=setTimeout(()=>{applyAdaptiveScale();applyViewportPresentation();},80);
  }

  window.addEventListener("resize",scheduleAdaptiveScale);
  window.addEventListener("orientationchange",()=>{
    setTimeout(()=>{applyAdaptiveScale();applyViewportPresentation();},180);
  });


  let settings = {};
  let radiusOptions = [];
  let wardens = [];
  let allWardens = [];
  let reportOptions = [];
  let records = [];
  let selectedWarden = null;
  let position = null;
  let isAdmin = false;
  let adminRole = null;
  let adminToken = null;
  let pendingLogo = null;
  let currentReportRows = [];

  function gas(fn, ...args){
    return window.ewardenApi.call(fn, ...args);
  }

  function toast(message){
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(()=>el.classList.remove("show"), 3400);
  }

  function esc(v){
    return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function parseDMY(s){
    if(!s) return null;
    const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(!m) return null;
    return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), 12,0,0);
  }

  function ymd(d){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function fmtDate(d){
    return new Intl.DateTimeFormat("ms-MY",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d);
  }

  function fmtDistance(m){
    m = Number(m);
    if(!Number.isFinite(m)) return "—";
    return m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(m >= 10000 ? 1 : 2)} km`;
  }

  function hasGeofence(){
    const lat=Number(settings.GEOFENCE_LAT), lng=Number(settings.GEOFENCE_LNG), radius=Number(settings.GEOFENCE_RADIUS);
    return Number.isFinite(lat)&&Number.isFinite(lng)&&Number.isFinite(radius)&&radius>0;
  }

  function distance(lat1,lng1,lat2,lng2){
    const R=6371000, rad=n=>n*Math.PI/180;
    const x=rad(lat2-lat1), y=rad(lng2-lng1);
    const a=Math.sin(x/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(y/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function updateClock(){
    const now=new Date();
    $("current-date").textContent=new Intl.DateTimeFormat("ms-MY",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(now);
    $("current-time").textContent=new Intl.DateTimeFormat("ms-MY",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}).format(now);
  }

  function applySettings(){
    $("school-name").textContent = settings.SCHOOL_NAME || "SMK DATUK HAJI AHMAD SAID";
    $("app-title").textContent = settings.APP_NAME || "e-WARDEN";
    $("app-subtitle").textContent = settings.APP_SUBTITLE || "Sistem Kehadiran Warden";
    document.title = `${settings.APP_NAME || "e-WARDEN"} ${settings.SCHOOL_NAME || ""}`.trim();

    $("setting-app-name").value = settings.APP_NAME || "";
    $("setting-app-subtitle").value = settings.APP_SUBTITLE || "";
    $("setting-school-name").value = settings.SCHOOL_NAME || "";

    $("geofence-name").value = settings.LOCATION_NAME || "";
    $("geofence-lat").value = settings.GEOFENCE_LAT || "";
    $("geofence-lng").value = settings.GEOFENCE_LNG || "";
    $("geofence-radius").value = settings.GEOFENCE_RADIUS || "";

    $("active-location-name").textContent = settings.LOCATION_NAME || "Lokasi belum ditetapkan.";
    $("radius-value").textContent = settings.GEOFENCE_RADIUS ? `${settings.GEOFENCE_RADIUS} m` : "—";

    const logo = settings.APP_LOGO || "";
    if(logo){
      $("school-logo").src=logo;
      $("school-logo").classList.remove("hidden");
      $("logo-placeholder").classList.add("hidden");
      $("school-watermark").src=logo;
      $("logo-preview").src=logo;
      $("logo-preview-wrap").classList.remove("hidden");
      $("report-logo").src=logo;
      $("report-logo").classList.remove("hidden");
    }else{
      $("school-logo").classList.add("hidden");
      $("logo-placeholder").classList.remove("hidden");
      $("school-watermark").removeAttribute("src");
      $("logo-preview-wrap").classList.add("hidden");
      $("report-logo").classList.add("hidden");
    }
  }

  function populateRadius(){
    const sel=$("geofence-radius");
    const current=String(settings.GEOFENCE_RADIUS || "");
    sel.innerHTML='<option value="">Pilih radius</option>'+radiusOptions.map(v=>`<option value="${v}">${v} m</option>`).join("");
    sel.value=current;
  }

  function populateAdminWardenFilter(){
    const sel=$("admin-warden-filter");
    if(!sel) return;

    const unique=new Map();
    allWardens.forEach(w=>unique.set(`${w.code}|${w.name}`,w));

    sel.innerHTML='<option value="all">Semua Warden</option>';
    [...unique.values()].forEach(w=>{
      sel.insertAdjacentHTML(
        "beforeend",
        `<option value="${esc(w.code)}|${esc(w.name)}">${esc(w.name)} — ${esc(w.code)}</option>`
      );
    });
  }

  function populateWardens(){
    const sel=$("warden-select");
    sel.innerHTML='<option value="">Pilih Nama Warden</option>'+wardens.map(w=>`<option value="${esc(w.code)}">${esc(w.name)} — ${esc(w.code)}</option>`).join("");

    const rw=$("report-warden");
    rw.innerHTML='<option value="all">Semua Warden</option>';
    const unique=new Map();
    allWardens.forEach(w=>unique.set(`${w.code}|${w.name}`,w));
    [...unique.values()].forEach(w=>{
      rw.insertAdjacentHTML("beforeend",`<option value="${esc(w.code)}|${esc(w.name)}">${esc(w.name)} — ${esc(w.code)}</option>`);
    });
  }

  function populateReportOptions(){
    $("report-mode").innerHTML=reportOptions.map(r=>`<option value="${esc(r.mode)}">${esc(r.label)}</option>`).join("");
    $("report-mode").value=settings.REPORT_DEFAULT_MODE || "DATE_RANGE";
    updateReportModeUI();
  }

  function latestTodayRecord(){
    if(!selectedWarden) return null;
    const today=fmtDate(new Date());

    return records.find(r=>
      r.wardenCode===selectedWarden.code &&
      r.wardenName===selectedWarden.name &&
      r.date===today
    ) || null;
  }

  function currentOpenRecord(){
    if(!selectedWarden) return null;

    return records.find(r=>
      r.wardenCode===selectedWarden.code &&
      r.wardenName===selectedWarden.name &&
      r.status==="Bertugas" &&
      !r.punchOut
    ) || null;
  }

  function badge(status){
    const cls=status==="Lengkap"?"bg-emerald-100 text-emerald-800":status==="Bertugas"?"bg-amber-100 text-amber-800":"bg-slate-100 text-slate-700";
    return `<span class="rounded-full px-2 py-1 text-xs font-bold ${cls}">${esc(status||"—")}</span>`;
  }

  function renderDuty(){
    const openRec=currentOpenRecord();
    const latestRec=latestTodayRecord();
    const logged=!!selectedWarden;
    const validPos=!!(position && position.inside);

    $("welcome-panel").classList.toggle("hidden",!logged);

    if(logged){
      $("welcome-name").textContent=selectedWarden.name;

      if(openRec){
        $("duty-status").textContent="🟢 Sedang Bertugas";
      }else if(latestRec && latestRec.status==="Lengkap"){
        $("duty-status").textContent="✅ Sesi Selesai — Sedia Punch-In Semula";
      }else{
        $("duty-status").textContent="Belum Punch-In";
      }
    }

    $("punch-in").disabled=!(logged && validPos && !openRec);
    $("punch-out").disabled=!(logged && validPos && !!openRec);

    ["punch-in","punch-out"].forEach(id=>{
      $(id).classList.toggle("opacity-50",$(id).disabled);
    });
  }

  function renderMine(){
    if(!selectedWarden){
      $("my-records").innerHTML='<tr><td colspan="5" class="p-8 text-center text-slate-500">Pilih profil warden untuk melihat rekod.</td></tr>';
      return;
    }
    const mode=$("my-filter").value, now=new Date();
    const startWeek=new Date(now); startWeek.setHours(0,0,0,0); startWeek.setDate(now.getDate()-((now.getDay()+6)%7));
    let rows=records.filter(r=>r.wardenCode===selectedWarden.code && r.wardenName===selectedWarden.name);
    rows=rows.filter(r=>{
      const d=parseDMY(r.date); if(!d) return mode==="all";
      if(mode==="today") return ymd(d)===ymd(now);
      if(mode==="week") return d>=startWeek && d<=now;
      if(mode==="month") return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
      return true;
    });
    $("my-records").innerHTML=rows.length?rows.map(r=>`<tr class="border-t border-blue-50">
      <td class="p-4">${esc(r.date)}</td><td class="p-4">${esc(r.punchIn||"—")}</td><td class="p-4">${esc(r.punchOut||"—")}</td>
      <td class="p-4">${esc(r.duration||"—")}</td><td class="p-4">${badge(r.status)}</td></tr>`).join("")
      :'<tr><td colspan="5" class="p-8 text-center text-slate-500">Tiada rekod ditemui.</td></tr>';
  }

  function renderAdminRecords(){
    const selected=$("admin-warden-filter").value;
    const status=$("admin-status-filter").value;
    const dateIso=$("admin-date-filter").value;

    const rows=records.filter(r=>{
      let matchWarden=true;

      if(selected!=="all"){
        const [code,...nameParts]=selected.split("|");
        const name=nameParts.join("|");
        matchWarden=(r.wardenCode===code && r.wardenName===name);
      }

      const matchS=status==="all" || r.status===status;
      const d=parseDMY(r.date);
      const matchD=!dateIso || (d && ymd(d)===dateIso);

      return matchWarden && matchS && matchD;
    });
    $("admin-records").innerHTML=rows.length?rows.map((r,i)=>`<tr class="border-t border-blue-50">
      <td class="p-4">${i+1}</td><td class="p-4">${esc(r.date)}</td><td class="p-4">${esc(r.wardenCode)}</td>
      <td class="p-4 font-semibold">${esc(r.wardenName)}</td><td class="p-4">${esc(r.punchIn||"—")}</td>
      <td class="p-4">${esc(r.punchOut||"—")}</td><td class="p-4">${esc(r.duration||"—")}</td><td class="p-4">${badge(r.status)}</td></tr>`).join("")
      :'<tr><td colspan="8" class="p-8 text-center text-slate-500">Tiada rekod ditemui.</td></tr>';
  }

  function renderWardenAdmin(){
    $("warden-admin-list").innerHTML=wardens.length?wardens.map(w=>`<div class="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p class="font-extrabold text-blue-950">${esc(w.code)}</p><p class="font-semibold">${esc(w.name)}</p><p class="text-xs text-slate-500">Daftar: ${esc(w.registerDate)}</p></div>
      <button data-end-warden="${esc(w.code)}" class="action-button rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">TAMATKAN</button>
    </div>`).join(""):'<p class="text-sm text-slate-500">Tiada warden aktif.</p>';

    document.querySelectorAll("[data-end-warden]").forEach(btn=>btn.addEventListener("click",async()=>{
      if(!confirm(`Tamatkan ${btn.dataset.endWarden}?`)) return;
      try{
        await gas("endWarden",btn.dataset.endWarden,adminToken);
        toast("Warden berjaya ditamatkan.");
        await refreshData();
      }catch(e){toast(e.message)}
    }));
  }

  async function renderStats(){
    if(!adminToken) return;
    try{
      const s=await gas("getDashboardStats",adminToken);
      const items=[
        ["JUMLAH WARDEN",s.totalWarden,"#1645a3"],
        ["PUNCH-IN",s.punchIn,"#059669"],
        ["PUNCH-OUT",s.punchOut,"#0f766e"],
        ["BERTUGAS",s.bertugas,"#d97706"],
        ["BELUM HADIR",s.belumHadir,"#dc2626"]
      ];
      $("stats-grid").innerHTML=items.map(x=>`<div class="raised-card rounded-2xl bg-white p-4"><p class="text-[10px] font-bold tracking-wide text-slate-500">${x[0]}</p><p class="mt-2 text-2xl font-extrabold" style="color:${x[2]}">${x[1]}</p></div>`).join("");
    }catch(e){console.error(e)}
  }

  function updateLocationUI(pos){
    $("gps-details").classList.remove("hidden");
    $("latitude-value").textContent=pos.lat.toFixed(6);
    $("longitude-value").textContent=pos.lng.toFixed(6);
    $("checked-at").textContent=new Intl.DateTimeFormat("ms-MY",{hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}).format(new Date());
    $("radius-value").textContent=`${settings.GEOFENCE_RADIUS} m`;
    $("distance-value").textContent=fmtDistance(pos.distance);
    $("accuracy-value").textContent=`±${Math.round(pos.accuracy)} m`;
    $("location-message").textContent=pos.inside?"ANDA BERADA DALAM KAWASAN DIBENARKAN":"ANDA DI LUAR KAWASAN DIBENARKAN";
    $("location-message").className="mt-1 text-sm font-bold "+(pos.inside?"text-emerald-700":"text-red-700");
    $("location-dot").className="status-dot pulse mt-2 "+(pos.inside?"bg-emerald-500":"bg-red-500");
  }

  function geoErrorMessage(err){
    if(err && err.code===1) return "AKSES LOKASI DITOLAK. Benarkan Location untuk laman ini.";
    if(err && err.code===2) return "LOKASI TIDAK DAPAT DIKESAN. Pastikan GPS/Location diaktifkan.";
    if(err && err.code===3) return "PENGESANAN LOKASI TAMAT MASA. Cuba semula.";
    return "LOKASI TIDAK DAPAT DIKESAN.";
  }

  function freshLocation(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation) return reject(new Error("Browser tidak menyokong geolocation."));
      navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:0,timeout:20000});
    });
  }

  async function getVerifiedPosition(){
    if(!hasGeofence()) throw new Error("Tetapan kawasan belum lengkap. Sila minta pentadbir tetapkan lokasi.");
    const result=await freshLocation();
    const accuracy=Number(result.coords.accuracy);
    if(!Number.isFinite(accuracy)||accuracy>100) throw new Error("KETEPATAN GPS TIDAK MENCUKUPI. Pergi ke kawasan terbuka dan cuba semula.");
    const lat=result.coords.latitude,lng=result.coords.longitude;
    const meters=distance(Number(settings.GEOFENCE_LAT),Number(settings.GEOFENCE_LNG),lat,lng);
    return {lat,lng,accuracy,distance:meters,inside:meters<=Number(settings.GEOFENCE_RADIUS)};
  }

  async function checkLocation(){
    $("check-location").disabled=true;
    $("location-message").textContent="📍 Mengesan lokasi semasa...";
    try{
      position=await getVerifiedPosition();
      updateLocationUI(position);
    }catch(e){
      position=null;
      $("location-message").textContent=e.message||geoErrorMessage(e);
      $("location-message").className="mt-1 text-sm font-bold text-amber-700";
      $("location-dot").className="status-dot mt-2 bg-amber-500";
    }finally{
      $("check-location").disabled=false;
      renderDuty();
    }
  }

  async function punch(type){
    if(!selectedWarden){toast("Sila pilih profil warden dahulu.");return}
    const button=$(type==="in"?"punch-in":"punch-out");
    button.disabled=true;
    try{
      position=await getVerifiedPosition();
      updateLocationUI(position);
      if(!position.inside){
        toast(type==="in"?"Punch-In ditolak: anda di luar kawasan dibenarkan.":"Punch-Out ditolak: anda di luar kawasan dibenarkan.");
        return;
      }
      const payload={wardenCode:selectedWarden.code,lat:position.lat,lng:position.lng,accuracy:Math.round(position.accuracy),distance:Math.round(position.distance)};
      const result=await gas(type==="in"?"punchIn":"punchOut",payload);
      $("transaction-result").className=`mt-4 rounded-2xl p-4 ${type==="in"?"bg-emerald-50 text-emerald-900":"bg-blue-50 text-blue-900"}`;
      $("transaction-result").innerHTML=`<p class="font-extrabold">${type==="in"?"✅ PUNCH-IN BERJAYA":"✅ PUNCH-OUT BERJAYA"}</p><p class="mt-1 text-sm">${esc(result.time||"")}${result.duration?` • ${esc(result.duration)}`:""}</p>`;
      $("transaction-result").classList.remove("hidden");
      toast(result.message);
      await refreshRecords();
    }catch(e){
      toast(e.message||geoErrorMessage(e));
    }finally{
      renderDuty();
    }
  }

  async function imageToCompactDataUrl(file){
    const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=data});
    const size=220, canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext("2d");ctx.clearRect(0,0,size,size);
    const scale=Math.min(size/img.width,size/img.height), w=img.width*scale,h=img.height*scale;
    ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
    let out=canvas.toDataURL("image/webp",0.72);
    if(out.length>48000) out=canvas.toDataURL("image/jpeg",0.55);
    if(out.length>49000) throw new Error("Logo masih terlalu besar. Gunakan imej logo yang lebih kecil.");
    return out;
  }

  function updateReportModeUI(){
    const mode=$("report-mode").value;
    $("report-date-range").classList.toggle("hidden",mode!=="DATE_RANGE");
    $("report-week-range").classList.toggle("hidden",mode!=="WEEK_RANGE");
    $("report-month-range").classList.toggle("hidden",mode!=="MONTH_RANGE");
  }

  function isoWeekStart(weekString){
    if(!weekString) return null;
    const [year,w]=weekString.split("-W").map(Number);
    const jan4=new Date(year,0,4,12);
    const jan4Mon=new Date(jan4);jan4Mon.setDate(jan4.getDate()-((jan4.getDay()+6)%7));
    const d=new Date(jan4Mon);d.setDate(jan4Mon.getDate()+(w-1)*7);d.setHours(0,0,0,0);return d;
  }

  function reportBounds(){
    const mode=$("report-mode").value;
    if(mode==="DATE_RANGE"){
      const a=$("report-date-from").value,b=$("report-date-to").value;
      if(!a||!b) throw new Error("Pilih tarikh mula dan tarikh akhir.");
      const start=new Date(a+"T00:00:00"),end=new Date(b+"T23:59:59");
      return {start,end,label:`${fmtDate(start)} hingga ${fmtDate(end)}`};
    }
    if(mode==="WEEK_RANGE"){
      const a=$("report-week-from").value,b=$("report-week-to").value;
      if(!a||!b) throw new Error("Pilih minggu mula dan minggu akhir.");
      const start=isoWeekStart(a),end=isoWeekStart(b);end.setDate(end.getDate()+6);end.setHours(23,59,59,999);
      return {start,end,label:`${a.replace("-W"," Minggu ")} hingga ${b.replace("-W"," Minggu ")}`};
    }
    const a=$("report-month-from").value,b=$("report-month-to").value;
    if(!a||!b) throw new Error("Pilih bulan mula dan bulan akhir.");
    const [ay,am]=a.split("-").map(Number),[by,bm]=b.split("-").map(Number);
    const start=new Date(ay,am-1,1),end=new Date(by,bm,0,23,59,59,999);
    const f=new Intl.DateTimeFormat("ms-MY",{month:"long",year:"numeric"});
    return {start,end,label:`${f.format(start)} hingga ${f.format(end)}`};
  }

  function previewReport(){
  try{
    const {start,end,label}=reportBounds();
    const w=$("report-warden").value;

    currentReportRows=records.filter(r=>{
      const d=parseDMY(r.date);
      if(!d||d<start||d>end) return false;

      if(w==="all") return true;

      const [code,...nameParts]=w.split("|");
      return r.wardenCode===code && r.wardenName===nameParts.join("|");
    });

    $("printable-report").classList.remove("hidden");
    $("report-school").textContent=settings.SCHOOL_NAME||"";
    $("report-period-title").textContent=label;

    $("report-generated").textContent=
      `Dijana: ${
        new Intl.DateTimeFormat(
          "ms-MY",
          {dateStyle:"medium",timeStyle:"short"}
        ).format(new Date())
      }`;

    $("report-summary").innerHTML=[
      ["Jumlah Rekod",currentReportRows.length],
      ["Lengkap",currentReportRows.filter(r=>r.status==="Lengkap").length],
      ["Bertugas",currentReportRows.filter(r=>r.status==="Bertugas").length],
      ["Warden Terlibat",
        new Set(
          currentReportRows.map(
            r=>`${r.wardenCode}|${r.wardenName}`
          )
        ).size
      ]
    ].map(x=>
      `<div class="rounded-2xl bg-blue-50 p-3">
        <p class="text-xs font-bold text-slate-500">${x[0]}</p>
        <p class="mt-1 text-xl font-extrabold text-blue-950">${x[1]}</p>
      </div>`
    ).join("");

    $("report-records").innerHTML=currentReportRows.length
      ? currentReportRows.map((r,i)=>`
        <tr class="border-t">
          <td class="p-3">${i+1}</td>
          <td class="p-3">${esc(r.date)}</td>
          <td class="p-3">${esc(r.wardenCode)}</td>
          <td class="p-3">${esc(r.wardenName)}</td>
          <td class="p-3">${esc(r.punchIn||"—")}</td>
          <td class="p-3">${esc(r.punchOut||"—")}</td>
          <td class="p-3">${esc(r.duration||"—")}</td>
          <td class="p-3">${esc(r.status)}</td>
        </tr>
      `).join("")
      : `
        <tr>
          <td colspan="8" class="p-8 text-center text-slate-500">
            Tiada rekod dalam tempoh dipilih.
          </td>
        </tr>
      `;

    toast(`${currentReportRows.length} rekod dipaparkan.`);

  }catch(e){
    toast(e.message);
  }
}

  function exportExcel(){
    if(!currentReportRows.length){toast("Tiada rekod untuk dieksport.");return}
    const {label}=reportBounds();
    const summary=[
      ["LAPORAN KEHADIRAN WARDEN"],
      ["Sekolah",settings.SCHOOL_NAME||""],
      ["Tempoh",label],
      ["Tarikh Dijana",new Date().toLocaleString("ms-MY")],
      [],
      ["Jumlah Rekod",currentReportRows.length],
      ["Rekod Lengkap",currentReportRows.filter(r=>r.status==="Lengkap").length],
      ["Masih Bertugas",currentReportRows.filter(r=>r.status==="Bertugas").length]
    ];
    const detail=currentReportRows.map((r,i)=>({
      "Bil":i+1,"Tarikh":r.date,"Kod Warden":r.wardenCode,"Nama Warden":r.wardenName,
      "Punch-In":r.punchIn,"Lat Punch-In":r.punchInLat,"Lng Punch-In":r.punchInLng,
      "Ketepatan Punch-In (m)":r.punchInAccuracy,"Jarak Punch-In (m)":r.punchInDistance,
      "Punch-Out":r.punchOut,"Lat Punch-Out":r.punchOutLat,"Lng Punch-Out":r.punchOutLng,
      "Ketepatan Punch-Out (m)":r.punchOutAccuracy,"Jarak Punch-Out (m)":r.punchOutDistance,
      "Tempoh":r.duration,"Status":r.status
    }));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),"RINGKASAN");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(detail),"REKOD KEHADIRAN");
    const safe=(settings.SCHOOL_NAME||"SMKDHAS").replace(/[\\/:*?"<>|]/g,"").slice(0,30);
    XLSX.writeFile(wb,`Laporan_e-WARDEN_${safe}_${ymd(new Date())}.xlsx`);
  }

  async function refreshRecords(){
    if(isAdmin && adminToken){
      records=await gas("getAttendanceRecords",adminToken);
    }else if(selectedWarden){
      records=await gas("getWardenAttendance",selectedWarden.code,selectedWarden.name);
    }else{
      records=[];
    }
    renderDuty();renderMine();renderAdminRecords();await renderStats();
  }

  async function refreshData(){
    const init=await gas("getInitialAppData");
    settings=init.settings||{};radiusOptions=init.radiusOptions||[];wardens=init.wardens||[];reportOptions=init.reportOptions||[];
    allWardens=adminToken?await gas("getAllWardens",adminToken):[];
    applySettings();populateRadius();populateWardens();populateAdminWardenFilter();populateReportOptions();renderWardenAdmin();
    await refreshRecords();
  }

  function switchAdminPanel(panel){
    document.querySelectorAll(".admin-panel").forEach(x=>x.classList.remove("active"));
    $(`admin-${panel}-panel`).classList.add("active");
    document.querySelectorAll("[data-admin]").forEach(x=>x.classList.toggle("active",x.dataset.admin===panel));
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function init(){
    applyAdaptiveScale();
    applyViewportPresentation();
    updateClock();setInterval(updateClock,1000);
    try{
      await refreshData();
      lucide.createIcons();
    }catch(e){
      console.error(e);toast("Ralat memuatkan data: "+e.message);
    }finally{
      $("loading-overlay").style.display="none";
    }
  }

  async function loadPartial(slotId,path){
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok) throw new Error(`Gagal memuatkan ${path}.`);
    $(slotId).innerHTML=await response.text();
  }

  function bindEvents(){
    $("check-location").addEventListener("click",checkLocation);
    $("punch-in").addEventListener("click",()=>punch("in"));
    $("punch-out").addEventListener("click",()=>punch("out"));

    $("warden-form").addEventListener("submit",async e=>{
      e.preventDefault();
      const code=$("warden-select").value;
      selectedWarden=wardens.find(w=>w.code===code)||null;
      $("transaction-result").classList.add("hidden");
      await refreshRecords();
      if(selectedWarden) toast("Profil warden telah dipilih.");
    });

    $("my-filter").addEventListener("change",renderMine);
    ["admin-warden-filter","admin-status-filter","admin-date-filter"].forEach(id=>$(id).addEventListener("change",renderAdminRecords));

    $("mode-button").addEventListener("click",async()=>{
      if(isAdmin){
        isAdmin=false;adminRole=null;adminToken=null;allWardens=[];records=[];
        $("system-settings-section").classList.add("hidden");
        $("admin-view").classList.remove("active");$("warden-view").classList.add("active");
        $("admin-nav").classList.add("hidden");$("admin-nav").classList.remove("flex");
        $("warden-nav").classList.remove("hidden");
        $("mode-button").textContent="PENTADBIR";
        $("admin-access-form").classList.add("hidden");$("admin-access-form").classList.remove("flex");
        await refreshRecords();
      }else{
        $("admin-access-form").classList.toggle("hidden");
        $("admin-access-form").classList.toggle("flex");
        $("admin-code").focus();
      }
    });

    $("admin-access-form").addEventListener("submit",async e=>{
      e.preventDefault();
      try{
        const auth=await gas("verifyAdminPin",$("admin-code").value);
        if(!auth?.success){toast("Kod akses tidak sah.");return}
        isAdmin=true;adminRole=auth.role;adminToken=auth.token;
        $("admin-code").value="";
        $("system-settings-section").classList.toggle("hidden",adminRole!=="MASTER");
        $("warden-view").classList.remove("active");$("admin-view").classList.add("active");
        $("warden-nav").classList.add("hidden");
        $("admin-nav").classList.remove("hidden");$("admin-nav").classList.add("flex");
        $("admin-access-form").classList.add("hidden");$("admin-access-form").classList.remove("flex");
        $("mode-button").textContent="KEMBALI";
        switchAdminPanel("dashboard");
        await refreshData();
      }catch(err){toast(err.message)}
    });

    document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>{
      document.querySelectorAll("[data-view]").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
      const v=btn.dataset.view;
      if(v==="records") $("my-records-section").scrollIntoView({behavior:"smooth"});
      else if(v==="profile") $("profile-card").scrollIntoView({behavior:"smooth"});
      else window.scrollTo({top:0,behavior:"smooth"});
    }));

    document.querySelectorAll("[data-admin]").forEach(btn=>btn.addEventListener("click",()=>switchAdminPanel(btn.dataset.admin)));

    $("setting-logo-file").addEventListener("change",async e=>{
      const file=e.target.files[0];if(!file)return;
      try{
        pendingLogo=await imageToCompactDataUrl(file);
        $("logo-preview").src=pendingLogo;$("logo-preview-wrap").classList.remove("hidden");
      }catch(err){toast(err.message);e.target.value=""}
    });

    $("remove-logo").addEventListener("click",()=>{
      pendingLogo="";$("setting-logo-file").value="";$("logo-preview-wrap").classList.add("hidden");
    });

    $("save-system-settings").addEventListener("click",async()=>{
      if(adminRole!=="MASTER"||!adminToken){toast("Akses MASTER diperlukan.");return}
      try{
        const payload={appName:$("setting-app-name").value,appSubtitle:$("setting-app-subtitle").value,schoolName:$("setting-school-name").value};
        if(pendingLogo!==null) payload.appLogo=pendingLogo;
        const res=await gas("saveSystemSettings",payload,adminToken);
        toast(res.message);pendingLogo=null;await refreshData();
      }catch(e){toast(e.message)}
    });

    $("use-current-location").addEventListener("click",async()=>{
      try{
        const r=await freshLocation();
        $("geofence-lat").value=r.coords.latitude.toFixed(6);$("geofence-lng").value=r.coords.longitude.toFixed(6);
        toast(`Lokasi semasa diperoleh. Ketepatan ±${Math.round(r.coords.accuracy)} m.`);
      }catch(e){toast(geoErrorMessage(e))}
    });

    $("save-geofence").addEventListener("click",async()=>{
      try{
        const payload={locationName:$("geofence-name").value,lat:$("geofence-lat").value,lng:$("geofence-lng").value,radius:$("geofence-radius").value};
        const res=await gas("saveGeofenceSettings",payload,adminToken);
        toast(res.message);position=null;await refreshData();
      }catch(e){toast(e.message)}
    });

    $("warden-admin-form").addEventListener("submit",async e=>{
      e.preventDefault();
      const code=$("warden-admin-code").value,name=$("warden-admin-name").value;
      if(!confirm(`Daftar/ganti ${code} dengan ${name.toUpperCase()}? Assignment aktif bagi slot sama akan ditamatkan.`)) return;
      try{
        const res=await gas("registerWarden",{code,name},adminToken);
        toast(res.message);$("warden-admin-form").reset();await refreshData();
      }catch(err){toast(err.message)}
    });

    $("report-mode").addEventListener("change",updateReportModeUI);
    $("preview-report").addEventListener("click",previewReport);
    $("export-excel").addEventListener("click",exportExcel);
    $("print-report").addEventListener("click",()=>window.print());
  }

  async function bootstrap(){
    try{
      await Promise.all([
        loadPartial("warden-slot","pages/warden.html"),
        loadPartial("admin-slot","pages/admin.html"),
        loadPartial("report-slot","pages/report.html")
      ]);
      bindEvents();
      await init();
    }catch(error){
      console.error(error);
      $("loading-overlay").style.display="none";
      toast(error.message||"Aplikasi gagal dimulakan.");
    }
  }

  bootstrap();
