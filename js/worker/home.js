function WHome({user,games,da,workers,locs,isPub,rsvp,setRsvpStatus,getRsvp}){
  const today=new Date().toISOString().slice(0,10);
  const[sel,setSel]=useState(today);
  const d0=new Date(today+"T12:00:00"),wd=[];
  for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()-d0.getDay()+i);wd.push(d.toISOString().slice(0,10))}
  const gw=date=>{
    const mg=hasRole(user,"umpire")?games.filter(g=>g.date===date&&g.status==="scheduled"&&(g.ump1===user.id||g.ump2===user.id)):[];
    const fieldLocs=hasRole(user,"field")?locs.filter(loc=>(da[dk(date,loc.id)]?.fieldCrew||[]).includes(user.id)):[];
    const concLocs=hasRole(user,"concessions")?locs.filter(loc=>(da[dk(date,loc.id)]?.concessions||[]).includes(user.id)):[];
    return{games:mg,fieldLocs,concLocs};
  };
  const sw=gw(sel),sp=isPub(sel);
  const hasAny=w=>w.games.length>0||w.fieldLocs.length>0||w.concLocs.length>0;
  const next=wd.find(d=>hasAny(gw(d))&&d>=today);

  const myRoles=(user.roles&&user.roles.length)?user.roles:[user.role];

  return R("div",null,
    R("div",{style:{background:"#1A2550",border:"1px solid #4F7EF7",borderRadius:12,padding:"16px 20px",marginBottom:18,display:"flex",alignItems:"center",gap:14}},
      R("div",{style:{width:44,height:44,borderRadius:"50%",background:"#252A3D",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,flexShrink:0}},ini(user.name)),
      R("div",null,R("div",{style:{fontWeight:800,fontSize:16}},"Hey "+user.name.split(" ")[0]+"!"),R("div",{style:{color:"#A8C0FC",fontSize:13,marginTop:3}},next?"Next shift: "+next:"No shifts this week.")),
      R("div",{style:{marginLeft:"auto",display:"flex",gap:4,flexWrap:"wrap"}},myRoles.map(r=>R("span",{key:r,className:"badge "+rb(r)},rl(r))))
    ),
    R("div",{className:"week-strip"},wd.map(date=>{
      const w=gw(date),has=hasAny(w),d=new Date(date+"T12:00:00"),isSel=date===sel;
      return R("div",{key:date,className:"wday"+(has?" has":"")+(isSel?" sel":""),onClick:()=>setSel(date)},
        R("div",{className:"wd-n"},WDAYS[d.getDay()]),
        R("div",{className:"wd-d"},d.getDate()),
        has&&!isSel&&R("div",{className:"wd-dot"})
      );
    })),
    R("div",{className:"card"},
      R("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
        R("span",{style:{fontWeight:700,fontSize:14}},sel),
        R("span",{className:"badge "+(sp?"b-green":"b-amber")},sp?"Published":"Not published yet")
      ),
      !sp?R("div",{style:{color:"#F0C060",fontSize:13,padding:"8px 0"}},"🔒 Not published yet — check back soon."):
      !hasAny(sw)?R("div",{style:{color:"#6B7394",fontSize:13}},"You're not scheduled on this day."):
      R("div",null,
        // ── Umpire games ──
        sw.games.length>0&&R("div",{style:{marginBottom:16}},
          R("div",{style:{fontWeight:700,fontSize:12,color:"#9B8AFF",textTransform:"uppercase",letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
            R("span",{className:"badge b-purple",style:{fontSize:10}},"Umpire"),
            sw.games.length+" game"+(sw.games.length>1?"s":"")
          ),
          sw.games.map(game=>{
            const loc=locs.find(l=>l.id===game.locId),slot=game.ump1===user.id?"Umpire 1":"Umpire 2",pUid=game.ump1===user.id?game.ump2:game.ump1,partner=pUid&&pUid!==NONE?workers.find(w=>w.id===pUid):null;
            return R("div",{key:game.id,style:{background:"#1E2333",border:"1px solid #2E3450",borderRadius:8,padding:"12px",marginBottom:8}},
              R("div",{style:{fontWeight:700,fontSize:14}},game.division,(game.away||game.home)&&R("span",{style:{fontWeight:400,fontSize:12,color:"#9BA3BF",marginLeft:8}},game.away+" vs "+game.home)),
              R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},game.time+" · "+(loc?.name||"?")+" "+game.field),
              R("div",{style:{display:"flex",gap:8,marginTop:6}},R("span",{className:"badge b-purple"},slot),partner?R("span",{style:{fontSize:12,color:"#9BA3BF"}},"Partner: "+partner.name):R("span",{style:{fontSize:12,color:"#6B7394"}},"Solo")),
              R(RsvpBtns,{wId:user.id,date:sel,locId:game.locId,getRsvp,setRsvpStatus})
            );
          })
        ),

        // ── Field crew shifts ──
        sw.fieldLocs.length>0&&R("div",{style:{marginBottom:16}},
          R("div",{style:{fontWeight:700,fontSize:12,color:"#5DB87A",textTransform:"uppercase",letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
            R("span",{className:"badge b-green",style:{fontSize:10}},"Field Crew"),
            sw.fieldLocs.length+" location"+(sw.fieldLocs.length>1?"s":"")
          ),
          sw.fieldLocs.map(loc=>{
            const d=da[dk(sel,loc.id)]||{};
            const tm=(d.fieldCrew||[]).filter(id=>id!==user.id).map(id=>workers.find(w=>w.id===id)?.name||"?");
            return R("div",{key:loc.id,style:{background:"#1E2333",border:"1px solid #2E3450",borderRadius:8,padding:"12px",marginBottom:8}},
              R("div",{style:{fontWeight:700,fontSize:14}},loc.name),
              R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},"Field crew assignment"),
              tm.length>0&&R("div",{style:{fontSize:12,color:"#6B7394",marginTop:4}},"With you: "+tm.join(", ")),
              R(RsvpBtns,{wId:user.id,date:sel,locId:loc.id,getRsvp,setRsvpStatus})
            );
          })
        ),

        // ── Concessions shifts ──
        sw.concLocs.length>0&&R("div",null,
          R("div",{style:{fontWeight:700,fontSize:12,color:"#D4A017",textTransform:"uppercase",letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
            R("span",{className:"badge b-amber",style:{fontSize:10}},"Concessions"),
            sw.concLocs.length+" location"+(sw.concLocs.length>1?"s":"")
          ),
          sw.concLocs.map(loc=>{
            const d=da[dk(sel,loc.id)]||{};
            const tm=(d.concessions||[]).filter(id=>id!==user.id).map(id=>workers.find(w=>w.id===id)?.name||"?");
            return R("div",{key:loc.id,style:{background:"#1E2333",border:"1px solid #2E3450",borderRadius:8,padding:"12px",marginBottom:8}},
              R("div",{style:{fontWeight:700,fontSize:14}},loc.name),
              R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},"Snack shack assignment"),
              tm.length>0&&R("div",{style:{fontSize:12,color:"#6B7394",marginTop:4}},"With you: "+tm.join(", ")),
              R(RsvpBtns,{wId:user.id,date:sel,locId:loc.id,getRsvp,setRsvpStatus})
            );
          })
        )
      )
    )
  );
}
