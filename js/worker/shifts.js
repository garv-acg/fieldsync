function CalExportPicker({user,games,da,locs,isPub}){
  const[open,setOpen]=useState(false);
  const[subState,setSubState]=useState(null); // null | "loading" | {url} | "error"

  const icsUrl=workerICSUrl(user.id);
  const webcalUrl=icsUrl.replace("https://","webcal://");
  const googleUrl="https://www.google.com/calendar/render?cid="+encodeURIComponent(webcalUrl);

  const doPublish=async()=>{
    setSubState("loading");
    try{
      await publishWorkerICS(user,games,da,locs,isPub);
      setSubState({url:icsUrl});
    }catch(e){
      console.error("ICS publish failed",e);
      setSubState("error");
    }
  };

  const dlOpts=[
    {id:"apple",label:"Apple Calendar",icon:"🍎",hint:"Downloads .ics — open to add"},
    {id:"google",label:"Google Calendar",icon:"📆",hint:"Downloads .ics — import at calendar.google.com"},
    {id:"outlook",label:"Outlook",icon:"📧",hint:"Downloads .ics — open to add"},
  ];

  return R("div",{style:{position:"relative"}},
    R("button",{className:"btn btn-blue",onClick:()=>{setOpen(p=>!p);setSubState(null)}},"📅 Calendar"),
    open&&R("div",{style:{position:"absolute",right:0,top:"calc(100% + 6px)",background:"#181C27",border:"1px solid #2E3450",borderRadius:12,padding:12,zIndex:200,minWidth:260,boxShadow:"0 8px 32px rgba(0,0,0,.6)"}},
      R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",marginBottom:8,letterSpacing:.06},""},
        "Subscribe (auto-updates)"
      ),
      subState==="loading"&&R("div",{style:{fontSize:13,color:"#9BA3BF",padding:"8px 0"}},"Generating link…"),
      subState==="error"&&R("div",{style:{fontSize:12,color:"#F09090",padding:"8px 0"}},"Storage bucket not set up yet. Ask your manager."),
      (!subState||subState==="error")&&R("button",{className:"btn btn-blue btn-sm",style:{width:"100%",marginBottom:4},onClick:doPublish},"🔗 Generate subscribe link"),
      subState&&subState.url&&R("div",{style:{marginBottom:4}},
        R("div",{style:{fontSize:11,color:"#7DDBA8",marginBottom:6}},"✓ Link ready — choose your app:"),
        R("a",{href:webcalUrl,style:{display:"block",padding:"7px 10px",background:"#252A3D",borderRadius:7,color:"#E8ECF8",fontSize:13,textDecoration:"none",marginBottom:4,textAlign:"center"},""},"🍎 Add to Apple Calendar"),
        R("a",{href:googleUrl,target:"_blank",style:{display:"block",padding:"7px 10px",background:"#252A3D",borderRadius:7,color:"#E8ECF8",fontSize:13,textDecoration:"none",marginBottom:4,textAlign:"center"},""},"📆 Add to Google Calendar"),
        R("button",{className:"btn btn-sm",style:{width:"100%"},onClick:()=>{navigator.clipboard.writeText(webcalUrl).then(()=>alert("Copied! Paste into Outlook → Add calendar from internet"))}},"📧 Copy link for Outlook")
      ),
      R("div",{style:{borderTop:"1px solid #2E3450",margin:"10px 0 8px"}}),
      R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",marginBottom:6,letterSpacing:.06},""},"One-time download"),
      dlOpts.map(o=>R("div",{key:o.id,onClick:()=>{exportICS(user,games,da,locs,isPub,o.id);setOpen(false)},style:{display:"flex",gap:8,alignItems:"center",padding:"7px 8px",borderRadius:7,cursor:"pointer"},
        onMouseEnter:e=>e.currentTarget.style.background="#252A3D",
        onMouseLeave:e=>e.currentTarget.style.background="transparent",
      },
        R("span",{style:{fontSize:16}},o.icon),
        R("div",null,
          R("div",{style:{fontSize:13,color:"#E8ECF8"}},o.label),
          R("div",{style:{fontSize:10,color:"#6B7394"}},o.hint)
        )
      ))
    )
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
        R(CalExportPicker,{user,games,da,locs,isPub})
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
        const concGames=games.filter(g=>g.date===date&&g.locId===locId&&g.status==="scheduled").sort((a,b)=>timeToMin(a.time)-timeToMin(b.time));
        const _cc0=concGames[0]?.time,_ccN=concGames[concGames.length-1]?.time;
        const concTimeRange=concGames.length>0?_cc0+(_ccN&&_ccN!==_cc0?" – "+_ccN:""):null;
        return R("div",{key:k,style:{background:"#181C27",border:"1px solid #2E3450",borderRadius:10,padding:"14px",marginBottom:10}},
          !p&&R("div",{style:{fontSize:11,color:"#F0C060",marginBottom:8}},"🔒 Not published yet"),
          R("div",{style:{fontWeight:700,fontSize:14}},date),
          R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},(loc?.name||"?")+" — Snack Shack"+(concTimeRange?" · "+concTimeRange:"")),
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
