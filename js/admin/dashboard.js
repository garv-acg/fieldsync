function DashView({games,locs,pub,rsvp,conf,runAuto,setModal}){
  const upcoming=games.filter(g=>g.status==="scheduled").sort((a,b)=>new Date(a.date)-new Date(b.date));
  const noUmp=games.filter(g=>g.status==="scheduled"&&g.ump1===NONE).length;
  const confirmed=Object.values(rsvp).filter(v=>v==="confirmed").length;
  return R("div",null,
    R("div",{className:"ph"},
      R("div",null,R("h2",null,"Dashboard"),R("p",null,"Overview across all locations")),
      R("div",{style:{display:"flex",gap:8}},
        R("button",{className:"btn",onClick:()=>setModal({type:"import"})},"Import CSV"),
        R("button",{className:"btn btn-green",onClick:runAuto},"⚡ Auto-schedule"),
        R("button",{className:"btn btn-blue",onClick:()=>setModal({type:"add_game"})},"+  Add game")
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
    R("div",{className:"card"},
      R("div",{className:"card-title"},"Upcoming games"),
      upcoming.length===0?R("div",{className:"empty"},"No games scheduled."):
      upcoming.slice(0,8).map(g=>{
        const loc=locs.find(l=>l.id===g.locId),p=pub.has(wkKey(g.date));
        return R("div",{key:g.id,style:{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #2E3450"}},
          R("div",{style:{flex:1}},
            R("div",{style:{fontWeight:700}},g.division,(g.away||g.home)&&R("span",{style:{color:"#9BA3BF",fontWeight:400,fontSize:12,marginLeft:8}},g.away+" vs "+g.home)),
            R("div",{style:{fontSize:11,color:"#6B7394",marginTop:2}},g.date+" · "+g.time+" · "+(loc?.name||"?")+" "+g.field)
          ),
          R("span",{className:"badge "+(p?"b-green":"b-amber"),style:{fontSize:10}},p?"Published":"Draft"),
          g.ump1===NONE&&R("span",{className:"badge b-red",style:{fontSize:10}},"No ump")
        );
      })
    )
  );
}
