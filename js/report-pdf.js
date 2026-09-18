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

  function centered(page,text,x,y,width,size,font,color=C.ink){
    const tx=x+(width-font.widthOfTextAtSize(safe(text),size))/2;
    drawText(page,text,tx,y,size,font,color);
  }

  function rightText(page,text,right,y,size,font,color=C.ink){
    drawText(page,text,right-font.widthOfTextAtSize(safe(text),size),y,size,font,color);
  }

  function wrapText(font,value,maxWidth,size=11){
    const source=String(value??"-").split("\n"),lines=[];
    source.forEach(part=>{
      const words=part.trim().split(/\s+/).filter(Boolean);
      if(!words.length){lines.push("");return;}
      let line="";
      words.forEach(word=>{
        const next=line?`${line} ${word}`:word;
        if(line&&font.widthOfTextAtSize(safe(next),size)>maxWidth){lines.push(line);line=word;}
        else line=next;
      });
      if(line) lines.push(line);
    });
    return lines.length?lines:["-"];
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
    page.drawRectangle({x:0,y:505.28,width:841.89,height:90,color:colour(C.midnight)});
    page.drawRectangle({x:610,y:505.28,width:232,height:90,color:colour(C.blue)});
    page.drawRectangle({x:758,y:505.28,width:84,height:90,color:colour(C.blue2)});
    page.drawRectangle({x:0,y:502.28,width:841.89,height:3,color:colour(C.gold)});

    page.drawImage(logo,{x:18,y:517,width:66,height:66});
    drawText(page,"INSTITUSI",96,575,11,bold,C.gold);
    drawText(page,meta.school,96,552,14,bold,C.white);
    drawText(page,`${meta.address} | Kod Sekolah ${meta.schoolCode}`,96,530,11,regular,"#c9d9ef");
    centered(page,"LAPORAN KEHADIRAN WARDEN",330,548,280,18,bold,C.white);
    rightText(page,meta.appName,825,556,14,bold,C.white);
    rightText(page,`SMKDHAS | ${meta.year}`,825,529,11,bold,"#ffe411");

    page.drawRectangle({x:0,y:442.28,width:841.89,height:60,color:colour(C.ice)});
    const items=[["NOMBOR RUJUKAN",meta.reference],["JENIS LAPORAN",meta.reportType],["TEMPOH",meta.period],["DIJANA PADA",meta.generated],["STATUS","Dokumen Sistem e-WARDEN"]];
    const cell=841.89/5;
    items.forEach((item,i)=>{
      const x=i*cell+13;
      if(i) page.drawLine({start:{x:i*cell,y:451},end:{x:i*cell,y:493},thickness:.7,color:colour(C.line)});
      drawText(page,item[0],x,482,11,bold,C.blue);
      const lines=wrapText(regular,item[1],cell-24,11).slice(0,2);
      lines.forEach((line,j)=>drawText(page,line,x,459-j*12,11,regular,C.ink));
    });

    page.drawRectangle({x:0,y:0,width:841.89,height:34,color:colour(C.midnight)});
    page.drawRectangle({x:0,y:34,width:841.89,height:3,color:colour(C.gold)});
    drawText(page,meta.motto,20,11,11,bold,"#d9e4f2");
    centered(page,`${meta.appName} | LAPORAN KEHADIRAN`,286,11,270,11,regular,"#d9e4f2");
    rightText(page,`MUKA SURAT ${pageNo} / ${total}`,822,11,11,bold,C.white);

    page.drawImage(logo,{x:175,y:54,width:500,height:400,opacity:.035,rotate:PDFLib.degrees(-12)});
  }

  function title(page,ctx,heading,subtitle){
    drawText(page,heading,24,414,18,ctx.bold,C.midnight);
    drawText(page,subtitle,24,392,11,ctx.regular,C.steel);
    page.drawLine({start:{x:24,y:382},end:{x:817,y:382},thickness:.8,color:colour(C.line)});
    page.drawRectangle({x:24,y:380.5,width:48,height:3,color:colour(C.gold)});
  }

  function table(page,ctx,config){
    const {x,top,widths,headers,rows,rowHeight,fontSize=11,headerHeight=38}=config;
    const totalWidth=widths.reduce((a,b)=>a+b,0);
    page.drawRectangle({x,y:top-headerHeight,width:totalWidth,height:headerHeight,color:colour(C.midnight)});
    page.drawRectangle({x,y:top-2,width:totalWidth,height:2,color:colour(C.gold)});
    let cx=x;
    headers.forEach((head,i)=>{
      const lines=wrapText(ctx.bold,head,widths[i]-8,11).slice(0,3),gap=12;
      const firstY=top-headerHeight/2-5+(lines.length-1)*gap/2;
      lines.forEach((line,j)=>centered(page,line,cx,firstY-j*gap,widths[i],11,ctx.bold,C.white));
      cx+=widths[i];
    });
    let y=top-headerHeight;
    rows.forEach((row,ri)=>{
      y-=rowHeight;
      page.drawRectangle({x,y,width:totalWidth,height:rowHeight,color:colour(ri%2?"#f0f5fa":"#ffffff"),opacity:.88});
      cx=x;
      row.forEach((value,i)=>{
        page.drawRectangle({x:cx,y,width:widths[i],height:rowHeight,borderColor:colour(C.line),borderWidth:.35});
        const status=i===row.length-1?String(value):"";
        const cellFont=status?ctx.bold:ctx.regular;
        const cellColor=status==="Selesai"?C.green:status==="Tidak Lengkap"?C.red:status==="Sedang Bertugas"?C.amber:C.ink;
        const lines=wrapText(cellFont,value,widths[i]-10,fontSize).slice(0,Math.max(1,Math.floor((rowHeight-6)/13)));
        const gap=13;
        const firstY=y+rowHeight/2-4+(lines.length-1)*gap/2;
        lines.forEach((line,j)=>centered(page,line,cx,firstY-j*gap,widths[i],fontSize,cellFont,cellColor));
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
    const cards=[["JUMLAH\nWARDEN",wardens.size,C.blue],["JUMLAH\nSESI",rows.length,C.green],["SESI\nSELESAI",completed,C.gold],["SESI TIDAK\nLENGKAP",incomplete,C.red],["SEDANG\nBERTUGAS",active,C.amber]];
    const gap=9,w=(841.89-48-gap*4)/5;
    cards.forEach((card,i)=>{
      const x=24+i*(w+gap);page.drawRectangle({x:x+2,y:308,width:w,height:59,color:colour("#dce3ed")});page.drawRectangle({x,y:311,width:w,height:59,color:colour(C.white)});page.drawRectangle({x,y:311,width:w,height:3,color:colour(card[2])});
      card[0].split("\n").forEach((line,j)=>drawText(page,line,x+9,349-j*12,11,ctx.bold,C.steel));
      rightText(page,String(card[1]),x+w-10,320,20,ctx.bold,C.midnight);
    });
    drawText(page,"PRESTASI WARDEN",24,291,13,ctx.bold,C.midnight);
    const wRows=[...wardens.values()].map((w,i)=>[i+1,w.code,w.name,w.total,w.done,w.bad,w.active,durationLabel(w.minutes)]);
    if(!wRows.length) wRows.push(["-","-","Tiada rekod",0,0,0,0,"0j 00m"]);
    table(page,ctx,{x:24,top:278,widths:[30,65,175,55,55,60,60,60],headers:["Bil.","ID Warden","Nama Warden","Jumlah Sesi","Sesi Selesai","Tidak Lengkap","Sedang Bertugas","Jumlah Tempoh"],rows:wRows,rowHeight:38,fontSize:11,headerHeight:42});
    page.drawRectangle({x:600,y:112,width:217,height:166,color:colour(C.midnight),borderRadius:7});
    drawText(page,"PEMERHATIAN PENGURUSAN",613,251,11,ctx.bold,C.gold);
    const rate=rows.length?((completed/rows.length)*100).toFixed(1):"0.0";
    [`Kadar sesi selesai: ${rate}%.`,`${incomplete} sesi tidak lengkap perlu disemak.`,`${active} sesi sedang bertugas.`,`Geofence: ${ctx.meta.radius||"-"} meter.`].forEach((text,i)=>{
      const lines=wrapText(ctx.regular,text,191,11);
      lines.forEach((line,j)=>drawText(page,line,613,226-i*31-j*13,11,ctx.regular,C.white));
    });
  }

  function signatures(page,ctx){
    drawText(page,"PENGESAHAN LAPORAN",26,128,13,ctx.bold,C.midnight);
    const gap=9,w=(841.89-52-gap*2)/3;
    ["Disediakan oleh","Disemak oleh","Disahkan oleh"].forEach((heading,i)=>{
      const x=26+i*(w+gap);page.drawRectangle({x,y:42,width:w,height:72,color:colour(C.ice)});page.drawRectangle({x,y:111,width:w,height:3,color:colour(C.gold)});drawText(page,heading.toUpperCase(),x+12,94,11,ctx.bold,C.midnight);page.drawLine({start:{x:x+12,y:70},end:{x:x+w-12,y:70},thickness:.7,color:colour(C.steel)});drawText(page,"Nama:",x+12,54,11,ctx.regular);drawText(page,"Jawatan:",x+w/2,54,11,ctx.regular);drawText(page,"Tarikh: ______________",x+12,42,11,ctx.regular);
    });
  }

  function detailPage(pdf,ctx,rows,startNo,pageNo,totalPages,isFinal){
    const page=pdf.addPage(A4_LANDSCAPE);header(page,ctx,pageNo,totalPages);
    const endNo=rows.length?startNo+rows.length-1:0;title(page,ctx,"REKOD KEHADIRAN TERPERINCI",rows.length?`Sesi ${startNo} hingga ${endNo} | Masa, tempoh, status serta data GPS Punch-In dan Punch-Out`:"Tiada sesi dalam tempoh dipilih");
    const punchCell=(time,lat,lng,distance,accuracy)=>`${time?`Masa: ${time}`:"Masa: -"}\n${coordinate(lat,lng)}\nJarak ${metric(distance)} m | Tepat ${metric(accuracy)} m`;
    const detailRows=rows.length?rows.map((r,i)=>[startNo+i,r.date,r.wardenCode,r.wardenName,punchCell(r.punchIn,r.punchInLat,r.punchInLng,r.punchInDistance,r.punchInAccuracy),punchCell(r.punchOut,r.punchOutLat,r.punchOutLng,r.punchOutDistance,r.punchOutAccuracy),r.duration||"-",statusOf(r)]):[["-","-","-","Tiada rekod","-","-","-","-"]];
    table(page,ctx,{x:26,top:370,widths:[30,65,75,140,160,160,70,90],headers:["Bil.","Tarikh","ID Warden","Nama Warden","PUNCH-IN\nMasa | GPS | Jarak","PUNCH-OUT\nMasa | GPS | Jarak","Tempoh","Status"],rows:detailRows,rowHeight:64,fontSize:11,headerHeight:42});
    const noteY=isFinal?160:42,noteH=28;
    page.drawRectangle({x:26,y:noteY,width:789.89,height:noteH,color:colour(C.ice),borderRadius:5});
    drawText(page,"Catatan: Jarak daripada pusat geofence. Ketepatan ialah anggaran GPS peranti.",38,noteY+10,11,ctx.regular,C.steel);
    if(isFinal) signatures(page,ctx);
  }

  async function generate(options){
    if(!window.PDFLib) throw new Error("Modul PDF belum dimuatkan.");
    const pdf=await PDFLib.PDFDocument.create();
    pdf.setTitle(`Laporan Kehadiran Warden - ${safe(options.meta.school)}`);pdf.setAuthor(safe(options.meta.school));pdf.setCreator("e-WARDEN SMKDHAS");
    const regular=await pdf.embedFont(PDFLib.StandardFonts.Helvetica),bold=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const logo=await pdf.embedPng(options.logoBytes||await logoPngBytes(options.meta.logo));
    const rows=options.rows||[],chunks=[];
    if(rows.length){
      let index=0;
      while(rows.length-index>2){
        const take=Math.min(4,rows.length-index-2);
        chunks.push(rows.slice(index,index+take));index+=take;
      }
      chunks.push(rows.slice(index));
    }else chunks.push([]);
    const total=1+chunks.length,ctx={regular,bold,logo,meta:options.meta};
    summaryPage(pdf,ctx,rows,total);
    let start=1;chunks.forEach((chunk,i)=>{detailPage(pdf,ctx,chunk,start,i+2,total,i===chunks.length-1);start+=chunk.length;});
    return new Blob([await pdf.save()],{type:"application/pdf"});
  }

  window.ewardenReportPdf={generate};
})();
