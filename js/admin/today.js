function TodayView({games,workers,locs,da,setModal,sendReminders,getDragger,conf,pub,rsvp,runAuto}){
  const today=new Date().toISOString().slice(0,10);
  const tmrw=new Date(Date.now()+86400000).toISOString().slice(0,10);
  const todayGames=games.filter(g=>g.date===today&&g.status!=="cancelled");
  const conflicted=new Set(conf.filter(c=>c.type==="crew"&&c.date===today).map(c=>c.worker?.id));
  const noUmp=games.filter(g=>g.status==="scheduled"&&g.ump1===NONE).length;
  const confirmed=Object.values(rsvp).filter(v=>v==="confirmed").length;

  const chip=(status,label)=>{
    const sty=status==="green"?{background:"#13311F",color:"#7DDBA8",border:"1px solid #3DBA7B"}
      :status==="amber"?{background:"#3D2E10",color:"#F0C060",border:"1px solid #E0A030"}
      :{background:"#3D1A1A",color:"#F09090",border:"1px solid #E05555"};
    return R("span",{style:{...sty,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}},label);
  };
  const sectionLabel=text=>R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,marginTop:14}},text);
  const namePill=(key,name,isConflict)=>R("span",{key,className:"badge "+(isConflict?"b-amber":"b-blue"),style:isConflict?{background:"#3D1A1A",color:"#F09090",border:"1px solid #E05555"}:{}},(isConflict?"⚠ ":"")+name);

  return R("div",null,
    R("div",{className:"ph"},
      R("div",null,R("h2",null,"Today"),R("p",null,new Date(today+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})+" — live staffing status")),
      R("div",{style:{display:"flex",gap:8}},
        R("button",{className:"btn",onClick:()=>setModal({type:"import"})},"Import CSV"),
        R("button",{className:"btn btn-green",onClick:runAuto},"⚡ Auto-schedule"),
        R("button",{className:"btn btn-blue",onClick:()=>setModal({type:"add_game"})},"+  Add game"),
        R("button",{className:"btn btn-blue",onClick:()=>sendReminders(tmrw)},"🔔 Tomorrow reminders")
      )
    ),
    conf.length>0&&R("div",{className:"conf-banner"},
      R("div",{className:"conf-banner-title"},"⚠ "+conf.length+" umpire conflict"+(conf.length>1?"s":"")+" detected"),
      conf.map((c,i)=>R("div",{key:i,style:{fontSize:12,marginTop:2}},c.worker?.name+" is double-booked on "+c.games[0].date+" at "+c.games[0].time+" ("+c.games.map(g=>g.division).join(" & ")+")"))
    ),
    R("div",{className:"metrics"},
      R("div",{className:"metric"},R("div",{className:"metric-label"},"Games"),R("div",{className:"metric-val"},games.length),R("div",{className:"metric-sub"},games.filter(g=>g.status==="scheduled").length+" scheduled")),
      R("div",{className:"metric"},R("div",{className:"metric-label"},"Missing ump"),R("div",{className:"metric-val",style:{color:noUmp>0?"#F0C060":"#7DDBA8"}},noUmp===0?"✓":noUmp),R("div",{className:"metric-sub"},noUmp===0?"All covered":"Need assignment")),
      R("div",{className:"metric"},R("div",{className:"metric-label"},"Conflicts"),R("div",{className:"metric-val",style:{color:conf.length>0?"#F09090":"#7DDBA8"}},conf.length),R("div",{className:"metric-sub"},"Double-bookings")),
      R("div",{className:"metric"},R("div",{className:"metric-label"},"RSVPs"),R("div",{className:"metric-val",style:{color:"#7DDBA8"}},confirmed),R("div",{className:"metric-sub"},"Workers confirmed"))
    ),
    todayGames.length===0
      ? R("div",{className:"card"},R("div",{className:"empty"},"No games scheduled for today."))
      : locs.map(loc=>{
          const lg=todayGames.filter(g=>g.locId===loc.id);
          if(!lg.length)return null;

          let totalSlots=0,filledSlots=0;
          lg.forEach(g=>{
            totalSlots+=1;if(g.ump1&&g.ump1!==NONE)filledSlots+=1;
            if(isDual(g.division)){totalSlots+=1;if(g.ump2&&g.ump2!==NONE)filledSlots+=1}
          });
          const umpStatus=filledSlots===totalSlots?"green":filledSlots===0?"red":"amber";

          const d=da[dk(today,loc.id)]||{};
          const fc=(d.fieldCrew||[]).length,fcStatus=fc>=FC?"green":fc===0?"red":"amber";
          const cc=(d.concessions||[]).length,ccStatus=cc>=3?"green":cc===0?"red":"amber";
          const draggerId=getDragger(today,loc.id);
          const fcNames=(d.fieldCrew||[]).map(id=>{const w=workers.find(x=>x.id===id);return{id,name:w?.name||id,isDragger:id===draggerId}});
          const ccNames=(d.concessions||[]).map(id=>({id,name:workers.find(x=>x.id===id)?.name||id}));

          return R("div",{key:loc.id,className:"card",style:{marginBottom:16}},
            R("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:14}},
              R("span",{style:{fontWeight:800,fontSize:16}},loc.name),
              R("button",{className:"btn btn-sm",style:{marginLeft:"auto",background:"#3D1A1A",color:"#F09090",borderColor:"#E05555"},onClick:()=>setModal({type:"rainout",date:today,locId:loc.id,locName:loc.name})},"⛈ Rainout")
            ),
            R("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}},
              chip(umpStatus,"Umpires "+filledSlots+"/"+totalSlots),
              chip(fcStatus,"Field crew "+fc+"/"+FC),
              chip(ccStatus,"Snack shack "+cc+"/3")
            ),
            sectionLabel("Games & umpires"),
            lg.map(g=>{
              const u1=workers.find(w=>w.id===g.ump1)?.name,u2=workers.find(w=>w.id===g.ump2)?.name,dual=isDual(g.division);
              return R("div",{key:g.id,style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",fontSize:13,padding:"8px 0",borderTop:"1px solid #2E3450"}},
                R("span",{style:{fontWeight:700,minWidth:90}},g.division),
                R("span",{style:{color:"#9BA3BF"}},g.time+" · "+g.field),
                (g.away||g.home)&&R("span",{style:{color:"#6B7394"}},g.away+" vs "+g.home),
                R("span",{style:{marginLeft:"auto",color:"#9BA3BF",fontSize:12}},
                  dual?("Ump 1: "+(u1||"—")+"  ·  Ump 2: "+(u2||"—")):("Ump: "+(u1||"—"))
                )
              );
            }),
            sectionLabel("Field crew"),
            fcNames.length
              ? R("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},fcNames.map(n=>namePill(n.id,(n.isDragger?"🚜 ":"")+n.name,conflicted.has(n.id))))
              : R("div",{style:{fontSize:12,color:"#6B7394"}},"No one assigned yet"),
            sectionLabel("Snack shack"),
            ccNames.length
              ? R("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},ccNames.map(n=>namePill(n.id,n.name,conflicted.has(n.id))))
              : R("div",{style:{fontSize:12,color:"#6B7394"}},"No one assigned yet")
          );
        })
  );
}