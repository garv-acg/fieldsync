function MyShifts({user,games,da,workers,locs,isPub,getRsvp,setRsvpStatus,requests,offerShift,claimShift,getDragger}){
  const today=new Date().toISOString().slice(0,10);
  const[showPast,setShowPast]=useState(false);
  const userRoles=[];
  if(hasRole(user,"umpire"))userRoles.push("umpire");
  if(hasRole(user,"field"))userRoles.push("field");
  if(hasRole(user,"concessions"))userRoles.push("concessions");

  const allG=hasRole(user,"umpire")?games.filter(g=>g.status==="scheduled"&&(g.ump1===user.id||g.ump2===user.id)).sort((a,b)=>new Date(a.date)-new Date(b.date)):[];
  const allField=hasRole(user,"field")?Object.entries(da).filter(([,v])=>(v.fieldCrew||[]).includes(user.id)).sort((a,b)=>a[0].localeCompare(b[0])):[];
  const allConc=hasRole(user,"concessions")?Object.entries(da).filter(([,v])=>(v.concessions||[]).includes(user.id)).sort((a,b)=>a[0].localeCompare(b[0])):[];

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
      R("div",null,R("h2",null,"My shifts"),R("p",null,"Confirm, offer up, or claim open shifts")),
      R("div",{style:{display:"flex",gap:8,alignItems:"center"}},
        pastCount>0&&R("button",{className:"btn btn-sm"+(showPast?" btn-amber":""),onClick:()=>setShowPast(p=>!p)},
          showPast?"Hide past shifts":"Show past ("+pastCount+")"
        ),
        R("button",{className:"btn btn-blue",onClick:()=>exportICS(user,games,da,locs)},"📅 Add to calendar")
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
        return R("div",{key:k,style:{background:"#181C27",border:"1px solid "+(isDragger?"#4F8A5A":"#2E3450"),borderRadius:10,padding:"14px",marginBottom:10}},
          !p&&R("div",{style:{fontSize:11,color:"#F0C060",marginBottom:8}},"🔒 Not published yet"),
          isDragger&&R("div",{style:{display:"inline-flex",alignItems:"center",gap:6,background:"#1A3D2C",border:"1px solid #3DBA7B",borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,color:"#7DDBA8",marginBottom:8}},"🚜 You're dragging the field today"),
          R("div",{style:{fontWeight:700,fontSize:14}},date),
          R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},(loc?.name||"?")+" — Field Crew"),
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
        return R("div",{key:k,style:{background:"#181C27",border:"1px solid #2E3450",borderRadius:10,padding:"14px",marginBottom:10}},
          !p&&R("div",{style:{fontSize:11,color:"#F0C060",marginBottom:8}},"🔒 Not published yet"),
          R("div",{style:{fontWeight:700,fontSize:14}},date),
          R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},(loc?.name||"?")+" — Snack Shack"),
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
