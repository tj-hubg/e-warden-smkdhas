(function(){
  "use strict";

  const A4_LANDSCAPE=[841.89,595.28];
  const C={
    midnight:"#061b3a",blue:"#1645a3",blue2:"#245bc5",gold:"#d7b449",ink:"#132238",
    steel:"#5c6b80",line:"#d8e0eb",ice:"#f1f5fa",green:"#0d8065",red:"#b73546",
    amber:"#a46a08",white:"#ffffff"
  };

  function colour(hex){
    const n=parseInt(hex.slice(1),16);
    return PDFLib.rgb(((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255);
  }

  function safe(value){
    return String(value??"").replace(/[\u2010-\u2015]/g,"-").replace(/[^\x20-\x7E\u00A0-\u00FF]/g," ");
  }

  function drawText(page,text,x,y,size,font,color=C.ink,options={}){
    page.drawText(safe(text),{x,y,size,font,color:colour(color),...options});
  }

  function fittedSize(font,text,maxWidth,start=7,min=3.7){
    let size=start;
    while(size>min&&font.widthOfTextAtSize(safe(text),size)>maxWidth) size-=.2;
    return size;
  }

  function centered(page,text,x,y,width,size,font,color=C.ink){
    const s=fittedSize(font,text,width-4,size,3.5);
    const tx=x+(width-font.widthOfTextAtSize(safe(text),s))/2;
    drawText(page,text,tx,y,s,font,color);
  }

  function rightText(page,text,right,y,size,font,color=C.ink){
    drawText(page,text,right-font.widthOfTextAtSize(safe(text),size),y,size,font,color);
  }

  async function logoPngBytes(source){
    const image=await new Promise((resolve,reject)=>{
      const el=new Image();el.crossOrigin="anonymous";el.onload=()=>resolve(el);el.onerror=()=>reject(new Error("Logo laporan gagal dimuatkan."));el.src=source;
    });
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,image.naturalWidth||image.width);canvas.height=Math.max(1,image.naturalHeight||image.height);
    canvas.getContext("2d").drawImage(image,0,0);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
    if(!blob) throw new Error("Logo laporan gagal diproses.");
    return new Uint8Array(await blob.arrayBuffer());
  }

  function statusOf(row){
    return row.reportStatus||row.status||"";
  }

  function durationMinutes(value){
    const text=String(value||"").toLowerCase();
    const h=Number((text.match(/(\d+)\s*(?:jam|j|h)/)||[])[1]||0);
    const m=Number((text.match(/(\d+)\s*(?:minit|m)/)||[])[1]||0);
    return h*60+m;
  }

  function durationLabel(minutes){
    return `${Math.floor(minutes/60)}j ${String(minutes%60).padStart(2,"0")}m`;
  }

  function coordinate(lat,lng){
    if(lat==null||lng==null||String(lat).trim()===""||String(lng).trim()==="") return "-";
    const a=Number(lat),b=Number(lng);
    return Number.isFinite(a)&&Number.isFinite(b)?`${a.toFixed(6)}\n${b.toFixed(6)}`:"-";
  }

  function metric(value){
    if(value==null||String(value).trim()==="") return "-";
    const n=Number(value);return Number.isFinite(n)?String(Math.round(n)):"-";
  }

  function header(page,ctx,pageNo,total){
    const {regular,bold,logo,meta}=ctx;
    page.drawRectangle({x:0,y:523.28,width:841.89,height:72,color:colour(C.midnight)});
    page.drawRectangle({x:612,y:523.28,width:230,height:72,color:colour(C.blue)});
    page.drawRectangle({x:760,y:523.28,width:82,height:72,color:colour(C.blue2)});
    page.drawRectangle({x:0,y:520.28,width:841.89,height:3,color:colour(C.gold)});

    page.drawImage(logo,{x:20,y:531,width:52,height:52});
    drawText(page,"INSTITUSI",83,578,5.2,bold,C.gold);
    drawText(page,meta.school,83,561,10.5,bold,C.white);
    drawText(page,`${meta.address}  |  Kod Sekolah ${meta.schoolCode}`,83,545,5.7,regular,"#c9d9ef");
    centered(page,"LAPORAN KEHADIRAN WARDEN",322,553,330,15,bold,C.white);
    rightText(page,meta.appName,823,562,12.5,bold,C.white);
    rightText(page,`SMKDHAS  |  ${meta.year}`,823,546,5.8,bold,"#ffe411");

    page.drawRectangle({x:0,y:479.28,width:841.89,height:41,color:colour(C.ice)});
    const items=[["NOMBOR RUJUKAN",meta.reference],["JENIS LAPORAN",meta.reportType],["TEMPOH",meta.period],["DIJANA PADA",meta.generated],["STATUS","Dokumen Sistem e-WARDEN"]];
    const cell=841.89/5;
    items.forEach((item,i)=>{
      const x=i*cell+18;
      if(i) page.drawLine({start:{x:i*cell,y:486},end:{x:i*cell,y:513},thickness:.5,color:colour(C.line)});
      drawText(page,item[0],x,505,5.1,bold,C.blue);
      drawText(page,item[1],x,490,5.7,regular,C.ink);
    });

    page.drawRectangle({x:0,y:0,width:841.89,height:28,color:colour(C.midnight)});
    page.drawRectangle({x:0,y:28,width:841.89,height:2.5,color:colour(C.gold)});
    drawText(page,meta.motto,22,11,5.4,bold,"#d9e4f2");
    centered(page,`${meta.appName}  |  LAPORAN KEHADIRAN`,285,11,270,5.4,regular,"#d9e4f2");
    rightText(page,`MUKA SURAT ${pageNo} / ${total}`,820,11,5.4,bold,C.white);

    page.drawImage(logo,{x:171,y:63,width:500,height:410,opacity:.035,rotate:PDFLib.degrees(-12)});
  }

  function title(page,ctx,heading,subtitle){
    drawText(page,heading,24,452,14,ctx.bold,C.midnight);
    drawText(page,subtitle,24,438,6.2,ctx.regular,C.steel);
    page.drawLine({start:{x:24,y:429},end:{x:817,y:429},thickness:.8,color:colour(C.line)});
    page.drawRectangle({x:24,y:427.5,width:42,height:2.5,color:colour(C.gold)});
  }

  function table(page,ctx,config){
    const {x,top,widths,headers,rows,rowHeight,fontSize=5.2,final=false}=config;
    const totalWidth=widths.reduce((a,b)=>a+b,0),headerHeight=27;
    page.drawRectangle({x,y:top-headerHeight,width:totalWidth,height:headerHeight,color:colour(C.midnight)});
    page.drawRectangle({x,y:top-2,width:totalWidth,height:2,color:colour(C.gold)});
    let cx=x;
    headers.forEach((head,i)=>{
      const lines=String(head).split("\n"),gap=6;
      lines.forEach((line,j)=>centered(page,line,cx,top-16+(lines.length-1-j)*gap,widths[i],5.3,ctx.bold,C.white));
      cx+=widths[i];
    });
    let y=top-headerHeight;
    rows.forEach((row,ri)=>{
      y-=rowHeight;
      page.drawRectangle({x,y,width:totalWidth,height:rowHeight,color:colour(ri%2?"#f0f5fa":"#ffffff"),opacity:.88});
      cx=x;
      row.forEach((value,i)=>{
        page.drawRectangle({x:cx,y,width:widths[i],height:rowHeight,borderColor:colour(C.line),borderWidth:.35});
        const lines=String(value??"-").split("\n"),status=i===row.length-1?String(value):"";
        const cellFont=status?ctx.bold:ctx.regular;
        const cellColor=status==="Selesai"?C.green:status==="Tidak Lengkap"?C.red:status==="Sedang Bertugas"?C.amber:C.ink;
        const fs=Math.min(...lines.map(line=>fittedSize(cellFont,line,widths[i]-4,fontSize,3.4)));
        const gap=fs+1;
        lines.forEach((line,j)=>centered(page,line,cx,y+rowHeight/2-fs/2+(lines.length-1-j)*gap/2,widths[i],fs,cellFont,cellColor));
        cx+=widths[i];
      });
    });
    return y;
  }

  function summaryPage(pdf,ctx,rows,totalPages){
    const page=pdf.addPage(A4_LANDSCAPE);header(page,ctx,1,totalPages);title(page,ctx,"RINGKASAN EKSEKUTIF","Prestasi kehadiran, status sesi dan kawalan pengurusan");
    const completed=rows.filter(r=>statusOf(r)==="Selesai").length,incomplete=rows.filter(r=>statusOf(r)==="Tidak Lengkap").length,active=rows.filter(r=>statusOf(r)==="Sedang Bertugas").length;
    const wardens=new Map();
    rows.forEach(r=>{
      const key=`${r.wardenCode}|${r.wardenName}`;
      if(!wardens.has(key)) wardens.set(key,{code:r.wardenCode,name:r.wardenName,total:0,done:0,bad:0,active:0,minutes:0});
      const w=wardens.get(key),s=statusOf(r);w.total++;w.minutes+=durationMinutes(r.duration);if(s==="Selesai")w.done++;if(s==="Tidak Lengkap")w.bad++;if(s==="Sedang Bertugas")w.active++;
    });
    const cards=[["Jumlah Warden",wardens.size,C.blue],["Jumlah Sesi",rows.length,C.green],["Sesi Selesai",completed,C.gold],["Sesi Tidak Lengkap",incomplete,C.red],["Sedang Bertugas",active,C.amber]];
    const gap=9,w=(841.89-48-gap*4)/5;
    cards.forEach((card,i)=>{
      const x=24+i*(w+gap);page.drawRectangle({x:x+2,y:343,width:w,height:58,color:colour("#dce3ed")});page.drawRectangle({x,y:345,width:w,height:58,color:colour(C.white)});page.drawRectangle({x,y:345,width:w,height:3,color:colour(card[2])});drawText(page,card[0].toUpperCase(),x+10,383,5.7,ctx.bold,C.steel);drawText(page,String(card[1]),x+10,357,16,ctx.bold,C.midnight);
    });
    drawText(page,"PRESTASI WARDEN",24,319,7.5,ctx.bold,C.midnight);
    const wRows=[...wardens.values()].map((w,i)=>[i+1,w.code,w.name,w.total,w.done,w.bad,w.active,durationLabel(w.minutes)]);
    if(!wRows.length) wRows.push(["-","-","Tiada rekod",0,0,0,0,"0j 00m"]);
    table(page,ctx,{x:24,top:309,widths:[20,60,165,55,55,60,65,60],headers:["Bil.","ID Warden","Nama Warden","Jumlah\nSesi","Sesi\nSelesai","Tidak\nLengkap","Sedang\nBertugas","Jumlah\nTempoh"],rows:wRows,rowHeight:25,fontSize:5.8});
    page.drawRectangle({x:584,y:208,width:233,height:101,color:colour(C.midnight),borderRadius:7});
    drawText(page,"PEMERHATIAN PENGURUSAN",599,283,6.2,ctx.bold,C.gold);
    const rate=rows.length?((completed/rows.length)*100).toFixed(1):"0.0";
    [`- Kadar sesi selesai keseluruhan: ${rate}%.`,`- ${incomplete} sesi tidak lengkap perlu semakan pentadbiran.`,`- ${active} sesi sedang berlangsung semasa laporan dijana.`,`- Geofence aktif: ${ctx.meta.radius||"-"} meter.`].forEach((text,i)=>drawText(page,text,599,265-i*15,5.8,ctx.regular,C.white));
  }

  function signatures(page,ctx){
    drawText(page,"PENGESAHAN LAPORAN",26,133,7.5,ctx.bold,C.midnight);
    const gap=9,w=(841.89-52-gap*2)/3;
    ["Disediakan oleh","Disemak oleh","Disahkan oleh"].forEach((heading,i)=>{
      const x=26+i*(w+gap);page.drawRectangle({x,y:43,width:w,height:78,color:colour(C.ice)});page.drawRectangle({x,y:118,width:w,height:3,color:colour(C.gold)});drawText(page,heading.toUpperCase(),x+12,101,6.1,ctx.bold,C.midnight);page.drawLine({start:{x:x+12,y:72},end:{x:x+w-12,y:72},thickness:.6,color:colour(C.steel)});drawText(page,"Nama:",x+12,58,5.4,ctx.regular);drawText(page,"Jawatan:",x+w/2,58,5.4,ctx.regular);drawText(page,"Tarikh: __________________",x+12,48,5.4,ctx.regular);
    });
  }

  function detailPage(pdf,ctx,rows,startNo,pageNo,totalPages,isFinal){
    const page=pdf.addPage(A4_LANDSCAPE);header(page,ctx,pageNo,totalPages);
    const endNo=rows.length?startNo+rows.length-1:0;title(page,ctx,"REKOD KEHADIRAN TERPERINCI",rows.length?`Sesi ${startNo} hingga ${endNo} | Masa, tempoh, status serta data GPS Punch-In dan Punch-Out`:"Tiada sesi dalam tempoh dipilih");
    const detailRows=rows.length?rows.map((r,i)=>[startNo+i,r.date,r.wardenCode,r.wardenName,r.punchIn||"-",coordinate(r.punchInLat,r.punchInLng),metric(r.punchInDistance),metric(r.punchInAccuracy),r.punchOut||"-",coordinate(r.punchOutLat,r.punchOutLng),metric(r.punchOutDistance),metric(r.punchOutAccuracy),r.duration||"-",statusOf(r)]):[["-","-","-","Tiada rekod","-","-","-","-","-","-","-","-","-","-"]];
    table(page,ctx,{x:26,top:407,widths:[22,46,60,120,48,88,38,38,48,88,38,38,48,70],headers:["Bil.","Tarikh","ID Warden","Nama Warden","Masa\nPunch-In","Koordinat\nPunch-In","Jarak\n(m)","Ketepatan\n(m)","Masa\nPunch-Out","Koordinat\nPunch-Out","Jarak\n(m)","Ketepatan\n(m)","Tempoh","Status"],rows:detailRows,rowHeight:isFinal?22:29,fontSize:5.1});
    const noteY=isFinal?146:48,noteH=isFinal?30:37;
    page.drawRectangle({x:26,y:noteY,width:789.89,height:noteH,color:colour(C.ice),borderRadius:5});
    drawText(page,"Catatan: Jarak diukur daripada pusat geofence. Ketepatan ialah anggaran GPS peranti semasa transaksi.",38,noteY+17,5.3,ctx.regular,C.steel);
    drawText(page,'"Tidak Lengkap" bermaksud Punch-Out tiada; "Sedang Bertugas" bermaksud sesi masih aktif semasa laporan dijana.',38,noteY+7,5.3,ctx.regular,C.steel);
    if(isFinal) signatures(page,ctx);
  }

  async function generate(options){
    if(!window.PDFLib) throw new Error("Modul PDF belum dimuatkan.");
    const pdf=await PDFLib.PDFDocument.create();
    pdf.setTitle(`Laporan Kehadiran Warden - ${safe(options.meta.school)}`);pdf.setAuthor(safe(options.meta.school));pdf.setCreator("e-WARDEN SMKDHAS");
    const regular=await pdf.embedFont(PDFLib.StandardFonts.Helvetica),bold=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const logo=await pdf.embedPng(options.logoBytes||await logoPngBytes(options.meta.logo));
    const rows=options.rows||[],chunks=[];
    if(rows.length){for(let i=0;i<rows.length;i+=9)chunks.push(rows.slice(i,i+9));}else chunks.push([]);
    const total=1+chunks.length,ctx={regular,bold,logo,meta:options.meta};
    summaryPage(pdf,ctx,rows,total);
    let start=1;chunks.forEach((chunk,i)=>{detailPage(pdf,ctx,chunk,start,i+2,total,i===chunks.length-1);start+=chunk.length;});
    return new Blob([await pdf.save()],{type:"application/pdf"});
  }

  window.ewardenReportPdf={generate};
})();
