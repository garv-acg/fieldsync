function SchedView({games,workers,da,locs,pub,isPub,pubWeek,unpubWeek,conf,runAuto,setModal,setUmp,updDA,setGS,rainout,getDragger,setDraggerOverride,draggerOverrides,sendReminders}){
  const[lf,setLf]=useState("all");
  const dates=[...new Set(games.map(g=>g.date))].sort();
  const byWk={};dates.forEach(d=>{const w=wkKey(d);if(!byWk[w])byWk[w]=[];if(!byWk[w].includes(d))byWk[w].push(d)});
  const fl=lf==="all"?locs:locs.filter(l=>l.id===lf);
  const cmap=gameConflictMap(conf);
  return R("div",null,
    R("div",{className:"ph"},
      R("div",null,R("h2",null,"Schedule"),R("p",null,"Build in draft — publish to notify workers")),
      R("div",{style:{display:"flex",gap:8}},
        R("button",{className:"btn btn-green",onClick:runAuto},"⚡ Auto-schedule"),
        R("button",{className:"btn btn-blue",onClick:()=>setModal({type:"add_game"})},"+  Add game")
      )
    ),
    R("div",{style:{display:"flex",gap:6,marginBottom:14}},
      R("button",{className:"btn btn-sm"+(lf==="all"?" btn-blue":""),onClick:()=>setLf("all")},"All"),
      locs.map(l=>R("button",{key:l.id,className:"btn btn-sm"+(lf===l.id?" btn-blue":""),onClick:()=>setLf(l.id)},l.name))
    ),
    conf.length>0&&R("div",{className:"conf-banner",style:{marginBottom:14}},"⚠ "+conf.length+" conflict"+(conf.length>1?"s":"")+" detected — see Today and Umpires tabs"),
    Object.entries(byWk).sort((a,b)=>a[0].localeCompare(b[0])).map(([ws,wdates])=>{
      const p=pub.has(ws),wg=games.filter(g=>wkKey(g.date)===ws&&(lf==="all"||g.locId===lf));
      if(!wg.length)return null;
      return R("div",{key:ws,style:{marginBottom:24}},
        R("div",{className:"wpb "+(p?"wpb-p":"wpb-d")},
          R("span",{style:{fontWeight:700,fontSize:14,flex:1}},"Week of "+ws+(p?" — Published":" — Draft")),
          p?R("button",{className:"btn btn-sm",onClick:()=>unpubWeek(ws)},"Unpublish")
           :R("button",{className:"btn btn-sm btn-green",onClick:()=>pubWeek(ws)},"Publish & notify workers")
        ),
        wdates.filter(date=>games.some(g=>g.date===date&&(lf==="all"||g.locId===lf))).map(date=>{
          const dow=WDAYS[new Date(date+"T12:00:00").getDay()],dg=games.filter(g=>g.date===date&&(lf==="all"||g.locId===lf));
          return R("div",{key:date,style:{border:"1px solid "+(p?"#2E3450":"#E0A030"),borderStyle:p?"solid":"dashed",borderRadius:12,padding:14,marginBottom:10,background:"#181C27"}},
            R("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12}},
              R("span",{style:{fontWeight:800,fontSize:15}},dow+", "+date),
              R("span",{className:"badge "+(p?"b-green":"b-amber"),style:{fontSize:10}},p?"Published":"Draft"),
              R("div",{style:{marginLeft:"auto",display:"flex",gap:8}},
                R("button",{className:"btn btn-sm",onClick:()=>sendReminders(date)},"🔔 Remind"),
                R("button",{className:"btn btn-sm",onClick:()=>setModal({type:"add_game",prefillDate:date})},"+  Game")
              )
            ),
            fl.map(loc=>{
              const lg=dg.filter(g=>g.locId===loc.id);if(!lg.length)return null;
              const crew=(da[dk(date,loc.id)]||{}).fieldCrew||[];
              const draggerId=getDragger(date,loc.id);
              const isOverridden=draggerOverrides&&draggerOverrides[dk(date,loc.id)]!=null;
              return R("div",{key:loc.id,style:{marginBottom:12}},
                R("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8}},
                  R("span",{className:"badge b-blue"},loc.name),
                  R("button",{className:"btn btn-sm",style:{marginLeft:"auto",background:"#3D1A1A",color:"#F09090",borderColor:"#E05555"},onClick:()=>setModal({type:"rainout",date,locId:loc.id,locName:loc.name})},"⛈ Rainout")
                ),
                lg.map(game=>{
                  const gConf=cmap[game.id];
                  return R("div",{key:game.id,style:{background:"#1E2333",border:"1px solid "+(gConf?"#E05555":"#2E3450"),borderRadius:8,padding:"10px 12px",marginBottom:7}},
                    R("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}},
                      R("span",{style:{fontWeight:700}},game.division),
                      isDual(game.division)&&R("span",{className:"badge b-purple",style:{fontSize:9}},"2 umps"),
                      R("span",{style:{color:"#9BA3BF",fontSize:12}},game.time+" · "+game.field),
                      (game.away||game.home)&&R("span",{style:{color:"#6B7394",fontSize:11}},game.away+" vs "+game.home),
                      R("select",{className:"inline-sel",style:{marginLeft:"auto",fontSize:11},value:game.status,onChange:e=>setGS(game.id,e.target.value)},STATS.map(s=>R("option",{key:s,value:s},s))),
                      R("button",{className:"btn btn-sm",onClick:()=>setModal({type:"edit_game",game})},"Edit"),
                      R("button",{className:"btn btn-sm",style:{background:"#3D1A1A",color:"#F09090",borderColor:"#E05555"},onClick:()=>setModal({type:"confirm_del",gameId:game.id})},"Del")
                    ),
                    R(UmpSlots,{game,workers,setUmp}),
                    gConf&&R("div",{style:{marginTop:8,padding:"6px 10px",background:"#3D1A1A",border:"1px solid #E05555",borderRadius:6}},
                      gConf.map((c,i)=>R("div",{key:i,style:{fontSize:12,color:"#F09090"}},
                        "⚠ "+(c.worker?.name||"?")+" is also assigned to "+c.others.map(o=>{
                          const ol=locs.find(l=>l.id===o.locId);
                          return o.division+" · "+(ol?.name||"")+" "+o.field+" at "+o.time;
                        }).join(", ")+" — same time"
                      ))
                    )
                  );
                }),
                R(CrewPanel,{date,locId:loc.id,da,workers,updDA}),
                // Dragger row — most senior field crew, admin can override
                crew.length>0&&R("div",{style:{display:"flex",alignItems:"center",gap:8,marginTop:6,padding:"6px 10px",background:"#1A1F2E",borderRadius:7,border:"1px solid #2A3050"}},
                  R("span",{style:{fontSize:12,color:"#9BA3BF"}},"🚜 Dragger:"),
                  R("select",{
                    className:"inline-sel",
                    style:{fontSize:12},
                    value:draggerId||"",
                    onChange:e=>setDraggerOverride(date,loc.id,Number(e.target.value))
                  },
                    crew.map(id=>{
                      const w=workers.find(x=>x.id===id);
                      const isCurrent=id===draggerId;
                      return R("option",{key:id,value:id},(isCurrent?"🚜 ":"")+( w?.name||id)+(w?.yearsExp?" ("+w.yearsExp+"yr)":""));
                    })
                  ),
                  isOverridden&&R("span",{style:{fontSize:10,color:"#E0A030",marginLeft:4}},"override"),
                  isOverridden&&R("button",{
                    className:"btn btn-sm",
                    style:{fontSize:10,padding:"1px 6px"},
                    onClick:()=>setDraggerOverride(date,loc.id,null)
                  },"reset")
                )
              );
            })
          );
        })
      );
    })
  );
}