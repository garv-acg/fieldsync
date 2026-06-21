function autoSched(games,workers,da,requests,locs){
  const nda={...da},ug=games.map(g=>({...g}));
  const reqs=requests||[];

  // Count existing season shifts per worker for load balancing
  const umpShifts={},fwShifts={},cwShifts={};
  ug.forEach(g=>{[g.ump1,g.ump2].forEach(u=>{if(u&&u!==NONE)umpShifts[u]=(umpShifts[u]||0)+1})});
  Object.values(da).forEach(v=>{
    (v.fieldCrew||[]).forEach(id=>{fwShifts[id]=(fwShifts[id]||0)+1});
    (v.concessions||[]).forEach(id=>{cwShifts[id]=(cwShifts[id]||0)+1});
  });

  // Sort: most senior first; break ties by fewest existing shifts
  const byExp=(a,b)=>{
    const ed=(b.yearsExp||0)-(a.yearsExp||0);
    return ed!==0?ed:0; // seniority primary; shift count applied per-pick below
  };
  const pickBest=(candidates,shiftMap)=>{
    return candidates.slice().sort((a,b)=>{
      const ed=(b.yearsExp||0)-(a.yearsExp||0);
      if(ed!==0)return ed;
      return(shiftMap[a.id]||0)-(shiftMap[b.id]||0);
    });
  };

  const umps=workers.filter(w=>hasRole(w,"umpire"));
  const fw=workers.filter(w=>hasRole(w,"field"));
  const cw=workers.filter(w=>hasRole(w,"concessions"));
  // Track umpire availability per date+time slot (not whole day) so they can work multiple time slots
  const uu={};
  const uuKey=(date,time)=>date+"|"+(time||"");
  ug.forEach(g=>{[g.ump1,g.ump2].forEach(u=>{if(u&&u!==NONE){if(!uu[u])uu[u]=new Set();uu[u].add(uuKey(g.date,g.time))}})});

  // Process dual-umpire games first so most-senior umps fill those slots
  const sorted=[...ug].sort((a,b)=>(isDual(b.division)?1:0)-(isDual(a.division)?1:0));
  sorted.forEach(g=>{
    if(g.status!=="scheduled")return;
    const slot=uuKey(g.date,g.time);
    const avail=umps.filter(u=>wa(u,g.date,reqs,"umpire")&&(!uu[u.id]||!uu[u.id].has(slot)));
    const av=pickBest(avail,umpShifts);
    if(g.ump1===NONE&&av.length>0){
      const p=av.shift();g.ump1=p.id;
      if(!uu[p.id])uu[p.id]=new Set();uu[p.id].add(slot);
      umpShifts[p.id]=(umpShifts[p.id]||0)+1;
    }
    if(isDual(g.division)&&g.ump2===NONE){
      const p=av.find(u=>u.id!==g.ump1);
      if(p){g.ump2=p.id;if(!uu[p.id])uu[p.id]=new Set();uu[p.id].add(slot);umpShifts[p.id]=(umpShifts[p.id]||0)+1}
    }
  });

  const gdays=new Set();
  ug.filter(g=>g.status==="scheduled").forEach(g=>gdays.add(dk(g.date,g.locId)));
  const fu={},cu={};
  Object.entries(nda).forEach(([k,v])=>{
    const d=k.split("|")[0];
    (v.fieldCrew||[]).forEach(id=>{if(!fu[id])fu[id]=new Set();fu[id].add(d)});
    (v.concessions||[]).forEach(id=>{if(!cu[id])cu[id]=new Set();cu[id].add(d)});
  });
  gdays.forEach(key=>{
    const[date,locId]=key.split("|");
    if(!nda[key])nda[key]={fieldCrew:[],concessions:[]};
    const ex=nda[key].fieldCrew||[],need=FC-ex.length;
    if(need>0){
      const avail=fw.filter(u=>wa(u,date,reqs,"field")&&!ex.includes(u.id)&&(!fu[u.id]||!fu[u.id].has(date)));
      pickBest(avail,fwShifts).slice(0,need).forEach(u=>{
        ex.push(u.id);if(!fu[u.id])fu[u.id]=new Set();fu[u.id].add(date);fwShifts[u.id]=(fwShifts[u.id]||0)+1;
      });
      nda[key]={...nda[key],fieldCrew:ex};
    }
    const loc=(locs||[]).find(l=>l.id===locId);
    const ssOpen=nda[key].snackShackOpen??true;
    if(loc?.hasSnackShack&&ssOpen){
      const ec=nda[key].concessions||[];
      if(ec.length===0){
        const avail=cw.filter(u=>wa(u,date,reqs,"concessions")&&(!cu[u.id]||!cu[u.id].has(date)));
        pickBest(avail,cwShifts).slice(0,3).forEach(u=>{
          ec.push(u.id);if(!cu[u.id])cu[u.id]=new Set();cu[u.id].add(date);cwShifts[u.id]=(cwShifts[u.id]||0)+1;
        });
        nda[key]={...nda[key],concessions:ec};
      }
    }
  });
  return{games:ug,da:nda};
}

function detConf(games,workers,da,locs){
  const conflicts=[];

  // Umpires double-booked at the same date+time
  const map={};
  games.filter(g=>g.status==="scheduled").forEach(g=>{
    [g.ump1,g.ump2].forEach(uid=>{
      if(!uid||uid===NONE)return;
      const k=`${uid}|${g.date}|${g.time}`;
      if(!map[k])map[k]=[];
      map[k].push(g);
    });
  });
  Object.values(map).filter(gs=>gs.length>1).forEach(gs=>{
    const uid=[gs[0].ump1,gs[0].ump2].find(u=>u&&u!==NONE);
    conflicts.push({type:"umpire",worker:workers.find(w=>w.id===uid),games:gs});
  });

  // Field crew / concessions assigned to more than one location on the same date.
  // Skip concessions entries for locations that have no snack shack — stale data shouldn't trigger conflicts.
  const byWorkerDate={};
  Object.entries(da||{}).forEach(([k,v])=>{
    const[date,locId]=k.split("|");
    const loc=(locs||[]).find(l=>l.id===locId);
    const crew=[...(v.fieldCrew||[])];
    if(loc?.hasSnackShack)(v.concessions||[]).forEach(id=>crew.push(id));
    crew.forEach(wId=>{
      const key=wId+"|"+date;
      if(!byWorkerDate[key])byWorkerDate[key]=new Set();
      byWorkerDate[key].add(locId);
    });
  });
  Object.entries(byWorkerDate).forEach(([key,locSet])=>{
    if(locSet.size>1){
      const[wId,date]=key.split("|");
      conflicts.push({type:"crew",worker:workers.find(w=>w.id===Number(wId)),date,locIds:[...locSet]});
    }
  });

  return conflicts;
}

// Maps each conflicted game id to who's double-booked and which other game(s) they conflict with
function gameConflictMap(conf){
  const map={};
  conf.filter(c=>c.type==="umpire").forEach(c=>{
    c.games.forEach(g=>{
      if(!map[g.id])map[g.id]=[];
      map[g.id].push({worker:c.worker,others:c.games.filter(og=>og.id!==g.id)});
    });
  });
  return map;
}

function exportCSV(games,locs,da,workers){
  const hdr=["Date","Location","Field","Division","Away","Home","Status","Ump1","Ump2","Field Crew","Concessions"];
  const rows=games.map(g=>{
    const loc=locs.find(l=>l.id===g.locId),u1=workers.find(w=>w.id===g.ump1),u2=workers.find(w=>w.id===g.ump2),d=da[dk(g.date,g.locId)]||{};
    const fc=(d.fieldCrew||[]).map(id=>workers.find(w=>w.id===id)?.name||"").join("; ");
    const cc=(d.concessions||[]).map(id=>workers.find(w=>w.id===id)?.name||"").join("; ");
    return[g.date,loc?.name||"",g.field,g.division,g.away||"",g.home||"",g.status,u1?.name||"",u2?.name||"",fc,cc];
  });
  const csv=[hdr,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="fieldsync.csv";a.click();
}

// ── Calendar (.ics) export — lets a worker pull their shifts into Google/Apple Calendar ──
function parseTimeToHM(t){
  const m=(t||"").match(/(\d+):(\d+)\s*(AM|PM)/i);
  if(!m)return{h:9,m:0};
  let h=parseInt(m[1],10);const min=parseInt(m[2],10),ap=m[3].toUpperCase();
  if(ap==="PM"&&h!==12)h+=12;
  if(ap==="AM"&&h===12)h=0;
  return{h,m:min};
}
function icsStamp(date,h,m){return date.replace(/-/g,"")+"T"+String(h).padStart(2,"0")+String(m).padStart(2,"0")+"00"}
const ICS_TZ="America/Denver";
const VTIMEZONE=[
  "BEGIN:VTIMEZONE","TZID:"+ICS_TZ,
  "BEGIN:STANDARD","DTSTART:19671029T020000","RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=11","TZNAME:MST","TZOFFSETFROM:-0600","TZOFFSETTO:-0700","END:STANDARD",
  "BEGIN:DAYLIGHT","DTSTART:19870405T020000","RRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3","TZNAME:MDT","TZOFFSETFROM:-0700","TZOFFSETTO:-0600","END:DAYLIGHT",
  "END:VTIMEZONE"
];
function shiftMin(h,m,delta){const t=h*60+m+delta;return{h:Math.floor(t/60),m:((t%60)+60)%60};}
function buildICS(worker,games,da,locs,isPub,getDragger){
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//FieldSync//EN","CALSCALE:GREGORIAN","X-WR-CALNAME:FieldSync Shifts","X-WR-TIMEZONE:"+ICS_TZ,...VTIMEZONE];
  const roles=(worker.roles&&worker.roles.length)?worker.roles:[worker.role];
  if(roles.includes("umpire")){
    games.filter(g=>g.status==="scheduled"&&(g.ump1===worker.id||g.ump2===worker.id)&&isPub(g.date)).forEach(g=>{
      const loc=locs.find(l=>l.id===g.locId),{h,m}=parseTimeToHM(g.time);
      lines.push("BEGIN:VEVENT","UID:ump-"+g.id+"-"+worker.id+"@fieldsync");
      lines.push("DTSTART;TZID="+ICS_TZ+":"+icsStamp(g.date,h,m),"DTEND;TZID="+ICS_TZ+":"+icsStamp(g.date,Math.min(h+2,23),m));
      lines.push("SUMMARY:"+g.division+" — Umpire ("+(loc?.name||"")+")");
      lines.push("LOCATION:"+(loc?.name||"")+" "+(g.field||""),"END:VEVENT");
    });
  }
  if(roles.includes("field")){
    Object.entries(da).filter(([k,v])=>{const[date]=k.split("|");return(v.fieldCrew||[]).includes(worker.id)&&isPub(date)}).forEach(([k,v])=>{
      const[date,locId]=k.split("|"),loc=locs.find(l=>l.id===locId);
      const dayGames=games.filter(g=>g.date===date&&g.locId===locId&&g.status==="scheduled").sort((a,b)=>timeToMin(a.time)-timeToMin(b.time));
      const t0=dayGames[0]?.time,tN=dayGames[dayGames.length-1]?.time;
      const{h:fh,m:fm}=parseTimeToHM(t0||"9:00 AM"),{h:eh,m:em}=parseTimeToHM(tN||"9:00 AM");
      const isDragger=getDragger&&getDragger(date,locId)===worker.id;
      const{h:sh,m:sm}=shiftMin(fh,fm,isDragger?-150:-120);
      const summary=(isDragger?"🚜 Dragger":"Field Crew")+" — "+(loc?.name||"")+" ("+dayGames.length+" game"+(dayGames.length!==1?"s":"")+")"  ;
      lines.push("BEGIN:VEVENT","UID:field-"+k+"-"+worker.id+"@fieldsync");
      lines.push("DTSTART;TZID="+ICS_TZ+":"+icsStamp(date,sh,sm),"DTEND;TZID="+ICS_TZ+":"+icsStamp(date,Math.min(eh+2,23),em));
      lines.push("SUMMARY:"+summary);
      lines.push("LOCATION:"+(loc?.name||""),"END:VEVENT");
    });
  }
  if(roles.includes("concessions")){
    Object.entries(da).filter(([k,v])=>{const[date,locId]=k.split("|");const loc=locs.find(l=>l.id===locId);return loc?.hasSnackShack&&(v.concessions||[]).includes(worker.id)&&isPub(date)}).forEach(([k])=>{
      const[date,locId]=k.split("|"),loc=locs.find(l=>l.id===locId);
      const dayGames=games.filter(g=>g.date===date&&g.locId===locId&&g.status==="scheduled").sort((a,b)=>timeToMin(a.time)-timeToMin(b.time));
      const t0=dayGames[0]?.time,tN=dayGames[dayGames.length-1]?.time;
      const{h:sh,m:sm}=parseTimeToHM(t0||"9:00 AM"),{h:eh,m:em}=parseTimeToHM(tN||"9:00 AM");
      lines.push("BEGIN:VEVENT","UID:conc-"+k+"-"+worker.id+"@fieldsync");
      lines.push("DTSTART;TZID="+ICS_TZ+":"+icsStamp(date,sh,sm),"DTEND;TZID="+ICS_TZ+":"+icsStamp(date,Math.min(eh+2,23),em));
      lines.push("SUMMARY:Snack Shack — "+(loc?.name||"")+" ("+dayGames.length+" game"+(dayGames.length!==1?"s":"")+")"  );
      lines.push("LOCATION:"+(loc?.name||""),"END:VEVENT");
    });
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function exportICS(worker,games,da,locs,isPub,target,getDragger){
  const ics=buildICS(worker,games,da,locs,isPub||((d)=>true),getDragger);
  const blob=new Blob([ics],{type:"text/calendar"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=(target==="outlook"?"fieldsync-outlook.ics":"fieldsync-shifts.ics");
  a.click();
}

const ICS_BUCKET="ics-feeds";
const SUPABASE_URL="https://aknynshszfxxkspkokru.supabase.co";

async function publishWorkerICS(worker,games,da,locs,isPub,getDragger){
  const ics=buildICS(worker,games,da,locs,isPub||((d)=>true),getDragger);
  const blob=new Blob([ics],{type:"text/calendar"});
  const path=worker.id+".ics";
  const{error}=await sb.storage.from(ICS_BUCKET).upload(path,blob,{upsert:true,contentType:"text/calendar",cacheControl:"no-cache, no-store, must-revalidate"});
  if(error)throw error;
  return SUPABASE_URL+"/storage/v1/object/public/"+ICS_BUCKET+"/"+path;
}

function workerICSUrl(workerId){
  return SUPABASE_URL+"/storage/v1/object/public/"+ICS_BUCKET+"/"+workerId+".ics";
}