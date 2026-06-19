function UmpsView({games,workers,locs,conf,setUmp,swapUmps}){
  const[tab,setTab]=useState("board"),[lf,setLf]=useState("all");
  const umps=workers.filter(w=>hasRole(w,"umpire"));
  const allActive=games.filter(g=>g.status!=="cancelled");
  const activeGames=allActive.filter(g=>lf==="all"||g.locId===lf).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const dates=[...new Set(activeGames.map(g=>g.date))].sort();
  const cmap=gameConflictMap(conf);

  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Umpires"),R("p",null,"Assign, swap, and balance umpire workload"))),
    conf.length>0&&R("div",{className:"conf-banner",style:{marginBottom:14}},"⚠ "+conf.length+" conflict"+(conf.length>1?"s":"")+" detected — umpire conflicts shown below, crew conflicts on Today"),
    R("div",{style:{display:"flex",gap:6,marginBottom:14}},
      R("button",{className:"btn btn-sm"+(tab==="board"?" btn-blue":""),onClick:()=>setTab("board")},"Board"),
      R("button",{className:"btn btn-sm"+(tab==="swap"?" btn-blue":""),onClick:()=>setTab("swap")},"Swap"),
      R("button",{className:"btn btn-sm"+(tab==="workload"?" btn-blue":""),onClick:()=>setTab("workload")},"Workload")
    ),
    tab!=="workload"&&R("div",{style:{display:"flex",gap:6,marginBottom:14}},
      R("button",{className:"btn btn-sm"+(lf==="all"?" btn-blue":""),onClick:()=>setLf("all")},"All"),
      locs.map(l=>R("button",{key:l.id,className:"btn btn-sm"+(lf===l.id?" btn-blue":""),onClick:()=>setLf(l.id)},l.name))
    ),
    tab==="board"&&R(BoardTab,{dates,activeGames,locs,workers,setUmp,cmap}),
    tab==="swap"&&R(SwapTab,{dates,activeGames,locs,workers,swapUmps}),
    tab==="workload"&&R(WorkloadTab,{umps,allActive,conf})
  );
}

function BoardTab({dates,activeGames,locs,workers,setUmp,cmap}){
  if(!dates.length)return R("div",{className:"card"},R("div",{className:"empty"},"No games scheduled."));
  return R("div",null,dates.map(date=>{
    const dg=activeGames.filter(g=>g.date===date);
    return R("div",{key:date,style:{marginBottom:18}},
      R("div",{style:{fontWeight:800,fontSize:14,marginBottom:8}},date),
      dg.map(g=>{
        const loc=locs.find(l=>l.id===g.locId),gConf=cmap[g.id];
        return R("div",{key:g.id,style:{background:"#1E2333",border:"1px solid "+(gConf?"#E05555":"#2E3450"),borderRadius:8,padding:"10px 12px",marginBottom:7}},
          R("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}},
            R("span",{style:{fontWeight:700}},g.division),
            isDual(g.division)&&R("span",{className:"badge b-purple",style:{fontSize:9}},"2 umps"),
            R("span",{style:{color:"#9BA3BF",fontSize:12}},g.time+" · "+(loc?.name||"?")+" "+g.field),
            (g.away||g.home)&&R("span",{style:{color:"#6B7394",fontSize:11}},g.away+" vs "+g.home)
          ),
          R(UmpSlots,{game:g,workers,setUmp}),
          gConf&&R("div",{style:{marginTop:8,padding:"6px 10px",background:"#3D1A1A",border:"1px solid #E05555",borderRadius:6}},
            gConf.map((c,i)=>R("div",{key:i,style:{fontSize:12,color:"#F09090"}},
              "⚠ "+(c.worker?.name||"?")+" is also assigned to "+c.others.map(o=>{
                const ol=locs.find(l=>l.id===o.locId);
                return o.division+" · "+(ol?.name||"")+" "+o.field+" at "+o.time;
              }).join(", ")+" — same time"
            ))
          )
        );
      })
    );
  }));
}

function SwapTab({dates,activeGames,locs,workers,swapUmps}){
  const[sel,setSel]=useState(null);
  const pick=(gid,slot)=>{
    if(!sel){setSel({gid,slot});return}
    if(sel.gid===gid&&sel.slot===slot){setSel(null);return}
    swapUmps(sel.gid,sel.slot,gid,slot);
    setSel(null);
  };
  if(!dates.length)return R("div",{className:"card"},R("div",{className:"empty"},"No games scheduled."));
  return R("div",null,
    R("p",{style:{color:"#9BA3BF",fontSize:13,marginBottom:14}},"Click an umpire slot, then click another slot to swap them instantly."),
    dates.map(date=>{
      const dg=activeGames.filter(g=>g.date===date);
      return R("div",{key:date,style:{marginBottom:18}},
        R("div",{style:{fontWeight:800,fontSize:14,marginBottom:8}},date),
        dg.map(g=>{
          const loc=locs.find(l=>l.id===g.locId),slots=isDual(g.division)?["ump1","ump2"]:["ump1"];
          return R("div",{key:g.id,style:{background:"#1E2333",border:"1px solid #2E3450",borderRadius:8,padding:"10px 12px",marginBottom:7}},
            R("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}},
              R("span",{style:{fontWeight:700}},g.division),
              R("span",{style:{color:"#9BA3BF",fontSize:12}},g.time+" · "+(loc?.name||"?")+" "+g.field),
              (g.away||g.home)&&R("span",{style:{color:"#6B7394",fontSize:11}},g.away+" vs "+g.home)
            ),
            R("div",{style:{display:"flex",gap:8}},
              slots.map(slot=>{
                const wId=g[slot],w=workers.find(x=>x.id===wId),isSel=sel&&sel.gid===g.id&&sel.slot===slot;
                return R("button",{
                  key:slot,onClick:()=>pick(g.id,slot),className:"btn btn-sm",
                  style:isSel?{background:"#1A2550",borderColor:"#4F7EF7",color:"#A8C0FC"}:{}
                },(slot==="ump1"?"Ump 1: ":"Ump 2: ")+(w?.name||"—"));
              })
            )
          );
        })
      );
    })
  );
}

function WorkloadTab({umps,allActive,conf}){
  if(!umps.length)return R("div",{className:"card"},R("div",{className:"empty"},"No umpires on staff."));
  const counts=umps.map(u=>{
    const n=allActive.filter(g=>g.ump1===u.id||g.ump2===u.id).length;
    const hasConf=conf.some(c=>c.worker?.id===u.id);
    return{worker:u,count:n,hasConf};
  }).sort((a,b)=>b.count-a.count);
  const max=Math.max(1,...counts.map(c=>c.count));
  return R("div",{className:"card"},
    counts.map(c=>R("div",{key:c.worker.id,style:{marginBottom:14}},
      R("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}},
        R("span",{style:{fontWeight:700,fontSize:13,color:c.hasConf?"#F09090":"#E8ECF8"}},c.worker.name+(c.hasConf?"  ⚠":"")),
        R("span",{style:{fontSize:12,color:"#9BA3BF"}},c.count+" game"+(c.count!==1?"s":""))
      ),
      R("div",{style:{height:8,background:"#1E2333",borderRadius:6,overflow:"hidden"}},
        R("div",{style:{height:"100%",width:(c.count/max*100)+"%",background:c.hasConf?"#E05555":"#4F7EF7",borderRadius:6}})
      )
    ))
  );
}