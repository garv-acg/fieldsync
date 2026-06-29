function CalendarModal({user,games,da,locs,isPub,getDragger,onClose}){
  const[subState,setSubState]=useState(null); // null | "loading" | {webcal,google} | "error"

  const doPublish=async()=>{
    setSubState("loading");
    try{
      await publishWorkerICS(user,games,da,locs,isPub,getDragger);
      const icsUrl=workerICSUrl(user.id);
      const webcal=icsUrl.replace("https://","webcal://");
      const google="https://www.google.com/calendar/render?cid="+encodeURIComponent(webcal);
      setSubState({webcal,google});
    }catch(e){
      console.error("ICS publish failed",e);
      setSubState({error:e?.message||e?.error||JSON.stringify(e)});
    }
  };

  const Row=(icon,label,hint,handleClick)=>R("div",{
    onClick:handleClick,
    style:{display:"flex",gap:12,alignItems:"center",padding:"12px 14px",borderRadius:9,cursor:"pointer",border:"1px solid #2E3450",background:"#1E2333",marginBottom:8},
    onMouseEnter:e=>e.currentTarget.style.background="#252A3D",
    onMouseLeave:e=>e.currentTarget.style.background="#1E2333",
  },
    R("span",{style:{fontSize:22,lineHeight:1,flexShrink:0}},icon),
    R("div",null,
      R("div",{style:{fontWeight:700,fontSize:13,color:"#E8ECF8"}},label),
      R("div",{style:{fontSize:11,color:"#6B7394",marginTop:2}},hint)
    )
  );

  return R("div",{className:"modal-wrap",onClick:e=>e.target.className==="modal-wrap"&&onClose()},
    R("div",{className:"modal",style:{maxWidth:380}},
      R("div",{className:"modal-hdr"},
        R("span",{className:"modal-title"},"Add to Calendar"),
        R("button",{className:"btn btn-sm",onClick:onClose},"✕")
      ),

      R("div",{style:{background:"#1A2550",border:"1px solid #4F7EF7",borderRadius:10,padding:"12px 14px",marginBottom:16}},
        R("div",{style:{fontWeight:700,fontSize:13,color:"#A8C0FC",marginBottom:4}},"Subscribe to your shifts"),
        R("div",{style:{fontSize:12,color:"#6B7394"}},"Subscribe once. When the manager publishes changes, your calendar updates automatically within an hour."))
      ,

      subState===null&&R("button",{className:"btn btn-blue",style:{width:"100%",padding:"10px",marginBottom:16,fontSize:14},onClick:doPublish},"🔗 Generate my calendar link"),
      subState==="loading"&&R("div",{style:{textAlign:"center",padding:"16px 0",fontSize:13,color:"#9BA3BF",marginBottom:16}},"Generating link…"),
      subState?.error&&R("div",null,
        R("div",{style:{background:"#3D1A1A",border:"1px solid #E05555",borderRadius:8,padding:"10px 12px",marginBottom:16,fontSize:12,color:"#F09090"}},
          R("div",{style:{fontWeight:700,marginBottom:4}},"Upload failed"),
          subState.error
        ),
        R("button",{className:"btn btn-blue",style:{width:"100%",padding:"10px",marginBottom:16},onClick:doPublish},"Try again")
      ),
      subState&&subState.webcal&&R("div",{style:{marginBottom:16}},
        R("div",{style:{fontSize:11,fontWeight:700,color:"#7DDBA8",textTransform:"uppercase",letterSpacing:.05,marginBottom:8}},"✓ Link ready — tap your app:"),
        Row("🍎","Apple Calendar","Tap to open and subscribe",()=>{location.href=subState.webcal;}),
        Row("📆","Google Calendar","Opens Google Calendar to subscribe",()=>{window.open(subState.google,"_blank");}),
        Row("📧","Outlook","Copy link, then in Outlook: Add calendar → Subscribe from web",()=>{
          navigator.clipboard.writeText(subState.webcal);
          alert("Link copied!\n\nIn Outlook: Settings → Add calendar → Subscribe from web → paste the link.");
        })
      ),

      R("div",{style:{borderTop:"1px solid #2E3450",paddingTop:14,marginBottom:8}}),
      R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",letterSpacing:.05,marginBottom:10}},"Or download once"),
      R("div",{style:{fontSize:12,color:"#6B7394",marginBottom:10}},"Downloads a .ics file. Apple Calendar imports it automatically. Google and Outlook require manual import."),
      Row("🍎","Apple Calendar",".ics — imports automatically on Mac/iPhone",()=>{exportICS(user,games,da,locs,isPub,"apple",getDragger);onClose();}),
      Row("📆","Google Calendar",".ics — go to calendar.google.com → Settings → Import",()=>{exportICS(user,games,da,locs,isPub,"google",getDragger);onClose();}),
      Row("📧","Outlook",".ics — open the downloaded file to import",()=>{exportICS(user,games,da,locs,isPub,"outlook",getDragger);onClose();})
    )
  );
}

function CalExportPicker({user,games,da,locs,isPub,getDragger}){
  const[open,setOpen]=useState(false);
  return R("div",null,
    R("button",{className:"btn btn-blue",onClick:()=>setOpen(true)},"📅 Calendar"),
    open&&R(CalendarModal,{user,games,da,locs,isPub,getDragger,onClose:()=>setOpen(false)})
  );
}

function MyShifts({user,games,da,workers,locs,isPub,getRsvp,setRsvpStatus,requests,offerShift,claimShift,getDragger}){
  const today=new Date().toISOString().slice(0,10);
  const[showPast,setShowPast]=useState(false);
  const userRoles=[];
  if(hasRole(user,"umpire"))userRoles.push("umpire");
  if(hasRole(user,"field"))userRoles.push("field");
  if(hasRole(user,"concessions"))userRoles.push("concessions");

  const allG=hasRole(user,"umpire")?games.filter(g=>g.status==="scheduled"&&(g.ump1===user.id||g.ump2===user.id)&&isPub(g.date)).sort((a,b)=>new Date(a.date)-new Date(b.date)):[];
  const hasGamesOn=(date,locId)=>games.some(g=>g.date===date&&g.locId===locId&&g.status==="scheduled");
  const allField=hasRole(user,"field")?Object.entries(da).filter(([k,v])=>{const[date,locId]=k.split("|");return(v.fieldCrew||[]).includes(user.id)&&hasGamesOn(date,locId)&&isPub(date)}).sort((a,b)=>a[0].localeCompare(b[0])):[];
  const allConc=hasRole(user,"concessions")?Object.entries(da).filter(([k,v])=>{const[date,locId]=k.split("|");const loc=locs.find(l=>l.id===locId);return loc?.hasSnackShack&&(v.concessions||[]).includes(user.id)&&hasGamesOn(date,locId)&&isPub(date)}).sort((a,b)=>a[0].localeCompare(b[0])):[];

  const myG=showPast?allG:allG.filter(g=>g.date>=today);
  const myField=showPast?allField:allField.filter(([k])=>k.split("|")[0]>=today);
  const myConc=showPast?allConc:allConc.filter(([k])=>k.split("|")[0]>=today);

  const pastCount=[...allG.filter(g=>g.date<today),...allField.filter(([k])=>k.split("|")[0]<today),...allConc.filter(([k])=>k.split("|")[0]<today)].length;

  const myOffers=requests.filter(r=>r.type==="shift_offer"&&r.workerId===user.id&&r.status==="pending");
  const isOffered=(date,locId)=>myOffers.some(r=>r.date===date&&r.locId===locId);
  const openOffers=requests.filter(r=>r.type==="shift_offer"&&r.workerId!==user.id&&r.status==="pending"&&userRoles.includes(r.role));
  const alreadyClaimed=(reqId)=>requests.some(r=>r.id===reqId&&r.claimedBy===user.id);

  const Section=({title,badge,children,empty})=>R("div",{style:{marginBottom:24}},
    R("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:10}},
      R("span",{className:"badge "+badge,style:{fontSize:11}},title),
      R("span",{style:{fontSize:12,color:"#6B7394"}})
    ),
    children||R("div",{className:"card"},R("div",{className:"empty"},empty||"No shifts assigned yet."))
  );

  const hasAny=myG.length>0||myField.length>0||myConc.length>0;

  return R("div",null,
    R("div",{className:"ph"},
      R("div",null,R("h2",null,"My shifts"),R("p",null,"Full season schedule — confirm, offer up, or claim open shifts")),
      R("div",{style:{display:"flex",gap:8,alignItems:"center"}},
        pastCount>0&&R("button",{className:"btn btn-sm"+(showPast?" btn-amber":""),onClick:()=>setShowPast(p=>!p)},
          showPast?"Hide past shifts":"Show past ("+pastCount+")"
        ),
        R(CalExportPicker,{user,games,da,locs,isPub,getDragger})
      )
    ),

    !hasAny&&R("div",{className:"card"},R("div",{className:"empty"},"No shifts assigned yet.")),

    // ── UMPIRE GAMES ──
    hasRole(user,"umpire")&&R(Section,{title:"Umpire Games",badge:"b-purple",empty:"No games assigned yet."},
      myG.length===0?null:myG.map(g=>{
        const loc=locs.find(l=>l.id===g.locId),slot=g.ump1===user.id?"Umpire 1":"Umpire 2",p=isPub(g.date),offered=isOffered(g.date,g.locId);
        return R("div",{key:g.id,style:{background:"#181C27",border:"1px solid #2E3450",borderRadius:10,padding:"14px",marginBottom:10}},
          !p&&R("div",{style:{fontSize:11,color:"#F0C060",marginBottom:8}},"🔒 Not published yet"),
          R("div",{style:{fontWeight:700,fontSize:14}},g.division,(g.away||g.home)&&R("span",{style:{fontWeight:400,fontSize:12,color:"#9BA3BF",marginLeft:8}},g.away+" vs "+g.home)),
          R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},g.date+" · "+g.time+" · "+(loc?.name||"?")+" "+g.field),
          R("span",{className:"badge b-purple",style:{marginTop:6,display:"inline-flex"}},slot),
          p&&R("div",null,
            R(RsvpBtns,{wId:user.id,date:g.date,locId:g.locId,getRsvp,setRsvpStatus}),
            R("button",{className:"btn btn-sm"+(offered?" btn-amber":""),style:{marginTop:8},disabled:offered,onClick:()=>offerShift(user.id,g.date,g.locId,"umpire",g.division+" ("+slot+") on "+g.date+" at "+(loc?.name||"?"))},offered?"⏳ Offered up":"Offer up this shift")
          )
        );
      })
    ),

    // ── FIELD CREW SHIFTS ──
    hasRole(user,"field")&&R(Section,{title:"Field Crew Shifts",badge:"b-green",empty:"No field crew shifts assigned yet."},
      myField.length===0?null:myField.map(([k,v])=>{
        const[date,locId]=k.split("|"),loc=locs.find(l=>l.id===locId);
        const tm=(v.fieldCrew||[]).filter(id=>id!==user.id).map(id=>workers.find(w=>w.id===id)?.name||"?");
        const p=isPub(date),offered=isOffered(date,locId);
        const isDragger=getDragger(date,locId)===user.id;
        const shiftGames=games.filter(g=>g.date===date&&g.locId===locId&&g.status==="scheduled").sort((a,b)=>timeToMin(a.time)-timeToMin(b.time));
        const _s0=shiftGames[0]?.time,_sN=shiftGames[shiftGames.length-1]?.time;
        const shiftTimeRange=shiftGames.length>0?_s0+(_sN&&_sN!==_s0?" – "+_sN:""):null;
        return R("div",{key:k,style:{background:"#181C27",border:"1px solid "+(isDragger?"#4F8A5A":"#2E3450"),borderRadius:10,padding:"14px",marginBottom:10}},
          !p&&R("div",{style:{fontSize:11,color:"#F0C060",marginBottom:8}},"🔒 Not published yet"),
          isDragger&&R("div",{style:{display:"inline-flex",alignItems:"center",gap:6,background:"#1A3D2C",border:"1px solid #3DBA7B",borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,color:"#7DDBA8",marginBottom:8}},"🚜 You're dragging the field"+(date===today?" today":"")),
          R("div",{style:{fontWeight:700,fontSize:14}},date),
          R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},(loc?.name||"?")+" — Field Crew · "+shiftGames.length+" game"+(shiftGames.length!==1?"s":"")+(shiftTimeRange?" · "+shiftTimeRange:"")),
          tm.length>0&&R("div",{style:{fontSize:12,color:"#6B7394",marginTop:4}},"With: "+tm.join(", ")),
          p&&R("div",null,
            R(RsvpBtns,{wId:user.id,date,locId,getRsvp,setRsvpStatus}),
            R("button",{className:"btn btn-sm"+(offered?" btn-amber":""),style:{marginTop:8},disabled:offered,onClick:()=>offerShift(user.id,date,locId,"field","Field crew shift on "+date+" at "+(loc?.name||"?"))},offered?"⏳ Offered up":"Offer up this shift")
          )
        );
      })
    ),

    // ── CONCESSIONS SHIFTS ──
    hasRole(user,"concessions")&&R(Section,{title:"Concessions Shifts",badge:"b-amber",empty:"No concessions shifts assigned yet."},
      myConc.length===0?null:myConc.map(([k,v])=>{
        const[date,locId]=k.split("|"),loc=locs.find(l=>l.id===locId);
        const tm=(v.concessions||[]).filter(id=>id!==user.id).map(id=>workers.find(w=>w.id===id)?.name||"?");
        const p=isPub(date),offered=isOffered(date,locId);
        const myShift=(v.concessionsShifts||{})[user.id]||{};
        const fmt12=t=>{if(!t)return"";const[h,m]=t.split(":").map(Number);const ap=h>=12?"PM":"AM";return(h%12||12)+(m?":" +String(m).padStart(2,"0"):"")+ap;};
        const shiftLabel=myShift.start&&myShift.end?fmt12(myShift.start)+" – "+fmt12(myShift.end):myShift.start?fmt12(myShift.start)+" onwards":null;
        return R("div",{key:k,style:{background:"#181C27",border:"1px solid #2E3450",borderRadius:10,padding:"14px",marginBottom:10}},
          !p&&R("div",{style:{fontSize:11,color:"#F0C060",marginBottom:8}},"🔒 Not published yet"),
          R("div",{style:{fontWeight:700,fontSize:14}},date),
          R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},(loc?.name||"?")+" — Snack Shack"+(shiftLabel?" · "+shiftLabel:"")),
          tm.length>0&&R("div",{style:{fontSize:12,color:"#6B7394",marginTop:4}},"With: "+tm.join(", ")),
          p&&R("div",null,
            R(RsvpBtns,{wId:user.id,date,locId,getRsvp,setRsvpStatus}),
            R("button",{className:"btn btn-sm"+(offered?" btn-amber":""),style:{marginTop:8},disabled:offered,onClick:()=>offerShift(user.id,date,locId,"concessions","Concessions shift on "+date+" at "+(loc?.name||"?"))},offered?"⏳ Offered up":"Offer up this shift")
          )
        );
      })
    ),

    // ── OPEN SHIFTS TO CLAIM ──
    openOffers.length>0&&R("div",null,
      R("div",{style:{fontWeight:700,fontSize:15,margin:"20px 0 10px"}},"Open shifts you can claim"),
      openOffers.map(offer=>{
        const offerer=workers.find(w=>w.id===offer.workerId),loc=locs.find(l=>l.id===offer.locId),claimed=alreadyClaimed(offer.id);
        return R("div",{key:offer.id,style:{background:"#1A3D2C",border:"1px solid #3DBA7B",borderRadius:10,padding:"14px",marginBottom:10}},
          R("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}},
            R("div",null,
              R("div",{style:{fontWeight:700,fontSize:14,color:"#7DDBA8"}},"Open: "+offer.label),
              R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},"Offered by "+offerer?.name)
            ),
            claimed
              ? R("span",{className:"badge b-amber"},"⏳ Claim pending approval")
              : R("button",{className:"btn btn-green btn-sm",onClick:()=>claimShift(offer.id,user.id)},"Claim this shift")
          )
        );
      })
    )
  );
}
