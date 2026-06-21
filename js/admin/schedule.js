const FIELD_CFG={
  "Tee Ball":      {base:"60'",mound:"-",   bBox:1,fLines:1,cBox:0,rLine:0,mnd:0,rubber:1,pCircle:0,oDeck:0},
  "A":             {base:"60'",mound:"-",   bBox:1,fLines:1,cBox:0,rLine:0,mnd:0,rubber:1,pCircle:0,oDeck:0},
  "AA":            {base:"60'",mound:"40'", bBox:1,fLines:1,cBox:1,rLine:1,mnd:1,rubber:0,pCircle:0,oDeck:0},
  "AAA":           {base:"60'",mound:"46'", bBox:1,fLines:1,cBox:1,rLine:1,mnd:1,rubber:0,pCircle:0,oDeck:0},
  "Majors":        {base:"60'",mound:"46'", bBox:1,fLines:1,cBox:1,rLine:1,mnd:1,rubber:0,pCircle:0,oDeck:0},
  "Intermediates": {base:"70'",mound:"50'", bBox:1,fLines:1,cBox:1,rLine:1,mnd:1,rubber:0,pCircle:0,oDeck:1},
  "Seniors":       {base:"90'",mound:"60'6\"",bBox:1,fLines:1,cBox:1,rLine:1,mnd:1,rubber:0,pCircle:0,oDeck:1},
  "Softball 8U":   {base:"60'",mound:"30'", bBox:1,fLines:1,cBox:0,rLine:0,mnd:0,rubber:1,pCircle:1,oDeck:0},
  "Softball 10U":  {base:"60'",mound:"35'", bBox:1,fLines:1,cBox:1,rLine:1,mnd:0,rubber:1,pCircle:1,oDeck:0},
  "Softball 12U":  {base:"60'",mound:"40'", bBox:1,fLines:1,cBox:1,rLine:1,mnd:0,rubber:1,pCircle:1,oDeck:0},
};
const CFG_KEYS=["bBox","fLines","cBox","rLine","mnd","rubber","pCircle","oDeck"];
const CFG_LABELS=["Batters Box","Foul Lines","Coaches Box","Runner's Line","Mound","Rubber","Pitching Circle","On Deck Circle"];
const cfgChanges=(d1,d2)=>{
  const a=FIELD_CFG[d1],b=FIELD_CFG[d2];if(!a||!b)return[];
  const out=[];
  if(a.base!==b.base||a.mound!==b.mound)out.push("Distances → "+b.base+" bases, "+b.mound+" mound");
  CFG_KEYS.forEach((k,i)=>{if(a[k]!==b[k])out.push((b[k]?"+ ":"− ")+CFG_LABELS[i]);});
  return out;
};

function exportSchedule(games,workers,da,pub,locs){
  const pubWeeks=[...pub].sort();
  if(!pubWeeks.length){alert("No published weeks to export.");return;}
  const wname=id=>(workers.find(w=>w.id===id)||{name:"Unassigned"}).name;
  let html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>FieldSync Schedule</title><style>
    body{font-family:sans-serif;font-size:13px;color:#111;padding:24px;max-width:900px;margin:0 auto}
    h1{font-size:20px;margin-bottom:2px}
    .sub{color:#666;font-size:11px;margin-bottom:20px}
    h2{font-size:15px;margin:20px 0 6px;padding:5px 10px;background:#e8f0fe;border-left:4px solid #4285f4;border-radius:2px}
    h3{font-size:13px;font-weight:700;margin:12px 0 4px;color:#333}
    table{border-collapse:collapse;width:100%;margin-bottom:10px;font-size:12px}
    td,th{border:1px solid #ddd;padding:4px 8px;text-align:left}
    th{background:#f5f5f5;font-weight:600}
    .loc{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;background:#dce8ff;color:#1a56db;margin-right:6px;margin-bottom:4px}
    .crew{font-size:12px;color:#444;margin:3px 0 8px;padding:3px 8px;background:#f8f8f8;border-radius:3px}
    @media print{body{padding:8px}h2{page-break-before:auto}}
  </style></head><body>`;
  html+=`<h1>FieldSync — Schedule Export</h1><div class="sub">Generated ${new Date().toLocaleDateString()} · Published weeks only</div>`;
  pubWeeks.forEach(wk=>{
    const wg=games.filter(g=>wkKey(g.date)===wk&&g.status!=="cancelled");
    if(!wg.length)return;
    const dates=[...new Set(wg.map(g=>g.date))].sort();
    html+=`<h2>Week of ${wk}</h2>`;
    dates.forEach(date=>{
      const dg=wg.filter(g=>g.date===date);
      const dow=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(date+"T12:00:00").getDay()];
      html+=`<h3>${dow}, ${date}</h3>`;
      locs.forEach(loc=>{
        const lg=dg.filter(g=>g.locId===loc.id);if(!lg.length)return;
        const slot=da[dk(date,loc.id)]||{};
        const crew=(slot.fieldCrew||[]).map(id=>wname(id));
        const conc=(slot.concessions||[]).map(id=>wname(id));
        html+=`<div class="loc">${loc.name}</div>`;
        if(crew.length)html+=`<div class="crew">Field crew: ${crew.join(", ")}</div>`;
        if(loc.hasSnackShack&&conc.length)html+=`<div class="crew">Snack shack: ${conc.join(", ")}</div>`;
        html+=`<table><thead><tr><th>Time</th><th>Field</th><th>Division</th><th>Home</th><th>Away</th><th>Ump 1</th><th>Ump 2</th></tr></thead><tbody>`;
        lg.sort((a,b)=>timeToMin(a.time)-timeToMin(b.time)).forEach(g=>{
          html+=`<tr><td>${g.time||""}</td><td>${g.field||""}</td><td>${g.division||""}</td><td>${g.home||""}</td><td>${g.away||""}</td><td>${g.ump1?wname(g.ump1):""}</td><td>${g.ump2?wname(g.ump2):""}</td></tr>`;
        });
        html+=`</tbody></table>`;
      });
    });
  });
  html+=`</body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
}

function SaturdayView({games,workers,da,locs,pub}){
  const sats=[...new Set(games.filter(g=>{const d=new Date(g.date+"T12:00:00");return!isNaN(d)&&d.getDay()===6;}).map(g=>g.date))].sort();
  const todayStr=new Date().toISOString().slice(0,10);
  const defSat=sats.find(s=>s>=todayStr)||sats[sats.length-1]||"";
  const[sel,setSel]=useState(defSat);
  if(!sats.length)return R("div",{className:"ph"},R("p",{style:{color:"#9BA3BF"}},"No Saturday games found."));
  const satGames=games.filter(g=>g.date===sel);
  const isPub=pub.has(wkKey(sel));
  return R("div",null,
    R("div",{className:"ph"},
      R("div",null,R("h2",null,"Saturday Schedule"),R("p",null,"Full day view with field configuration changes")),
      R("div",{style:{display:"flex",alignItems:"center",gap:10}},
        R("select",{className:"inline-sel",style:{fontSize:13,padding:"6px 10px"},value:sel,onChange:e=>setSel(e.target.value)},
          sats.map(s=>R("option",{key:s,value:s},s+(pub.has(wkKey(s))?" ✓":"")))
        ),
        R("span",{className:"badge "+(isPub?"b-green":"b-amber")},isPub?"Published":"Draft"),
        R("span",{style:{fontSize:12,color:"#9BA3BF"}},satGames.length+" games")
      )
    ),
    locs.map(loc=>{
      const lg=satGames.filter(g=>g.locId===loc.id);
      if(!lg.length)return null;
      const fields=[...new Set(lg.map(g=>g.field))].sort();
      const slot=da[dk(sel,loc.id)]||{};
      const crewNames=(slot.fieldCrew||[]).map(id=>(workers.find(w=>w.id===id)||{}).name||"?");
      const concNames=loc.hasSnackShack?(slot.concessions||[]).map(id=>(workers.find(w=>w.id===id)||{}).name||"?"):[];
      return R("div",{key:loc.id,style:{margin:"0 20px 28px"}},
        R("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:10,flexWrap:"wrap"}},
          R("h3",{style:{margin:0,fontSize:15}},loc.name),
          crewNames.length>0&&R("span",{style:{fontSize:12,color:"#9BA3BF"}},"Field crew: "+crewNames.join(", ")),
          concNames.length>0&&R("span",{style:{fontSize:12,color:"#E0A030"}},"Snack shack: "+concNames.join(", "))
        ),
        R("div",{style:{display:"grid",gridTemplateColumns:"repeat("+fields.length+",1fr)",gap:10,overflowX:"auto"}},
          fields.map(field=>{
            const fg=lg.filter(g=>g.field===field).sort((a,b)=>timeToMin(a.time)-timeToMin(b.time));
            return R("div",{key:field,style:{background:"#1A1F2E",borderRadius:10,padding:12,border:"1px solid #2E3450",minWidth:200}},
              R("div",{style:{fontWeight:700,fontSize:13,marginBottom:10,color:"#5B7FFF",borderBottom:"1px solid #2E3450",paddingBottom:6}},field),
              fg.map((game,i)=>{
                const changes=i>0?cfgChanges(fg[i-1].division,game.division):[];
                const cfg=FIELD_CFG[game.division];
                return R("div",{key:game.id},
                  changes.length>0&&R("div",{style:{margin:"6px 0",padding:"6px 8px",background:"#2A1F0A",border:"1px solid #E0A030",borderRadius:6}},
                    R("div",{style:{fontSize:10,fontWeight:700,color:"#E0A030",marginBottom:3}},"⚠ FIELD CHANGE"),
                    changes.map((c,j)=>R("div",{key:j,style:{fontSize:11,color:c.startsWith("+")?  "#6EE7B7":c.startsWith("−")?"#F09090":"#E8ECF8"}},c))
                  ),
                  R("div",{style:{background:"#252A3D",borderRadius:7,padding:"8px 10px",marginBottom:4}},
                    R("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:3}},
                      R("span",{style:{fontWeight:700,fontSize:12,color:"#E0A030"}},game.time),
                      R("span",{style:{fontWeight:600,fontSize:13,color:"#E8ECF8"}},game.division)
                    ),
                    (game.away||game.home)&&R("div",{style:{fontSize:11,color:"#9BA3BF",marginBottom:4}},game.away+" vs "+game.home),
                    cfg&&R("div",{style:{fontSize:10,color:"#6B7394"}},cfg.base+" bases"+(cfg.mound!=="-"?" · "+cfg.mound+" mound":""))
                  )
                );
              })
            );
          })
        )
      );
    })
  );
}

function SchedView({games,workers,da,locs,pub,isPub,pubWeek,unpubWeek,conf,runAuto,setModal,setUmp,updDA,updSnackShackOpen,setGS,rainout,getDragger,setDraggerOverride,draggerOverrides,sendReminders}){
  const[lf,setLf]=useState("all");
  const[showPast,setShowPast]=useState(false);
  const todayWk=wkKey(new Date().toISOString().slice(0,10));
  const dates=[...new Set(games.map(g=>g.date).filter(d=>wkKey(d)))].sort();
  const byWk={};dates.forEach(d=>{const w=wkKey(d);if(w&&!byWk[w])byWk[w]=[];if(w&&!byWk[w].includes(d))byWk[w].push(d)});
  const fl=lf==="all"?locs:locs.filter(l=>l.id===lf);
  const cmap=gameConflictMap(conf);
  const allWks=Object.entries(byWk).sort((a,b)=>a[0].localeCompare(b[0]));
  const pastWks=allWks.filter(([ws])=>ws<todayWk);
  const upcomingWks=allWks.filter(([ws])=>ws>=todayWk);
  return R("div",null,
    R("div",{className:"ph"},
      R("div",null,R("h2",null,"Schedule"),R("p",null,"Build in draft — publish to notify workers")),
      R("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
        R("button",{className:"btn btn-green",onClick:runAuto},"⚡ Auto-schedule"),
        R("button",{className:"btn btn-blue",onClick:()=>setModal({type:"add_game"})},"+  Add game"),
        R("button",{className:"btn",onClick:()=>exportSchedule(games,workers,da,pub,locs)},"📋 Export published")
      )
    ),
    R("div",{style:{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}},
      R("button",{className:"btn btn-sm"+(lf==="all"?" btn-blue":""),onClick:()=>setLf("all")},"All"),
      locs.map(l=>R("button",{key:l.id,className:"btn btn-sm"+(lf===l.id?" btn-blue":""),onClick:()=>setLf(l.id)},l.name))
    ),
    conf.length>0&&R("div",{className:"conf-banner",style:{marginBottom:14}},"⚠ "+conf.length+" conflict"+(conf.length>1?"s":"")+" detected — see Today and Umpires tabs"),
    pastWks.length>0&&R("div",{style:{marginBottom:14}},
      R("button",{className:"btn btn-sm"+(showPast?" btn-amber":""),onClick:()=>setShowPast(p=>!p)},
        showPast?"▲ Hide past weeks":"▼ Show past ("+pastWks.length+" week"+(pastWks.length>1?"s":"")+")")
    ),
    showPast&&pastWks.map(([ws,wdates])=>{
      const p=pub.has(ws),wg=games.filter(g=>wkKey(g.date)===ws&&(lf==="all"||g.locId===lf));
      if(!wg.length)return null;
      return R("div",{key:ws,style:{marginBottom:24,opacity:0.6}},
        R("div",{className:"wpb "+(p?"wpb-p":"wpb-d")},
          R("span",{style:{fontWeight:700,fontSize:14,flex:1}},"Week of "+ws+(p?" — Published":" — Draft")),
          p?R("button",{className:"btn btn-sm",onClick:()=>unpubWeek(ws)},"Unpublish"):null
        ),
        wdates.filter(date=>games.some(g=>g.date===date&&(lf==="all"||g.locId===lf))).map(date=>{
          const dow=WDAYS[new Date(date+"T12:00:00").getDay()],dg=games.filter(g=>g.date===date&&(lf==="all"||g.locId===lf));
          return R("div",{key:date,style:{border:"1px solid #2E3450",borderRadius:12,padding:14,marginBottom:10,background:"#181C27"}},
            R("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:8}},
              R("span",{style:{fontWeight:800,fontSize:15,color:"#6B7394"}},dow+", "+date),
              R("span",{className:"badge b-dim",style:{fontSize:10}},"Past")
            ),
            fl.map(loc=>{
              const lg=dg.filter(g=>g.locId===loc.id);if(!lg.length)return null;
              return R("div",{key:loc.id,style:{marginBottom:8}},
                R("span",{className:"badge b-blue",style:{marginBottom:6,display:"inline-flex"}},loc.name),
                lg.map(game=>R("div",{key:game.id,style:{background:"#1E2333",border:"1px solid #2E3450",borderRadius:8,padding:"8px 12px",marginBottom:5,fontSize:13}},
                  R("span",{style:{fontWeight:700}},game.division)," · ",
                  R("span",{style:{color:"#9BA3BF"}},game.time+" · "+game.field+" · "),
                  R("span",{className:"badge b-dim",style:{fontSize:10,marginLeft:4}},game.status)
                ))
              );
            })
          );
        })
      );
    }),
    upcomingWks.map(([ws,wdates])=>{
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
                R(CrewPanel,{date,locId:loc.id,da,workers,updDA,updSnackShackOpen,loc}),
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
                      return R("option",{key:id,value:id},(isCurrent?"🚜 ":"")+(w?.name||id)+(w?.yearsExp?" ("+w.yearsExp+"yr)":""));
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

function CancelledView({games,locs,setModal}){
  const INACTIVE=["cancelled","postponed","rainout"];
  const inactive=games.filter(g=>INACTIVE.includes(g.status)).sort((a,b)=>b.date.localeCompare(a.date));
  const statusColor=s=>s==="cancelled"?"#F09090":s==="rainout"?"#A8C0FC":"#F0C060";
  const statusBg=s=>s==="cancelled"?"#3D1A1A":s==="rainout"?"#1A2550":"#3D2A00";
  const statusBorder=s=>s==="cancelled"?"#E05555":s==="rainout"?"#4F7EF7":"#E0A030";

  return R("div",null,
    R("div",{className:"ph"},
      R("div",null,
        R("h2",null,"Cancelled & Rainouts"),
        R("p",null,inactive.length+" game"+(inactive.length!==1?"s":"")+" to reschedule")
      )
    ),
    inactive.length===0&&R("div",{className:"card"},R("div",{className:"empty"},"No cancelled or rained-out games.")),
    inactive.map(game=>{
      const loc=locs.find(l=>l.id===game.locId);
      const dow=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(game.date+"T12:00:00").getDay()];
      return R("div",{key:game.id,style:{background:"#181C27",border:"1px solid "+statusBorder(game.status),borderRadius:10,padding:"14px 16px",marginBottom:10}},
        R("div",{style:{display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap"}},
          R("div",{style:{flex:1}},
            R("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}},
              R("span",{style:{display:"inline-flex",alignItems:"center",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:statusBg(game.status),color:statusColor(game.status),border:"1px solid "+statusBorder(game.status)}},game.status.charAt(0).toUpperCase()+game.status.slice(1)),
              R("span",{style:{fontWeight:700,fontSize:14}},game.division),
              R("span",{className:"badge b-blue",style:{fontSize:10}},loc?.name||"?")
            ),
            R("div",{style:{fontSize:13,color:"#9BA3BF"}},dow+", "+game.date+" · "+game.time+" · "+game.field),
            (game.away||game.home)&&R("div",{style:{fontSize:12,color:"#6B7394",marginTop:3}},game.away+" vs "+game.home)
          ),
          R("button",{
            className:"btn btn-green btn-sm",
            style:{marginTop:2,flexShrink:0},
            onClick:()=>setModal({type:"add_game",prefill:{
              locId:game.locId,field:game.field,division:game.division,
              away:game.away,home:game.home,time:game.time
            }})
          },"📅 Reschedule")
        )
      );
    })
  );
}

function SchedGamesView(sp){
  const[tab,setTab]=useState("schedule");
  const cancelCount=sp.games.filter(g=>["cancelled","postponed","rainout"].includes(g.status)).length;
  return R("div",null,
    R("div",{style:{display:"flex",gap:4,padding:"16px 20px 0",borderBottom:"1px solid #2E3450",overflowX:"auto"}},
      [{id:"schedule",label:"Weekly view"},{id:"games",label:"All games"},{id:"saturday",label:"Saturday"},{id:"cancelled",label:"Cancelled",badge:cancelCount}].map(t=>R("div",{key:t.id,onClick:()=>setTab(t.id),style:{padding:"10px 18px",cursor:"pointer",fontWeight:600,fontSize:13,borderBottom:tab===t.id?"2px solid #5B7FFF":"2px solid transparent",color:tab===t.id?"#E8ECF8":"#6B7394",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}},
        t.label,
        t.badge>0&&R("span",{style:{background:"#E05555",color:"#fff",borderRadius:10,padding:"0 6px",fontSize:10,fontWeight:700}},t.badge)
      ))
    ),
    tab==="schedule"&&R(SchedView,{...sp,hidePage:true}),
    tab==="games"&&R(GamesView,{...sp,hidePage:true}),
    tab==="saturday"&&R(SaturdayView,{...sp,hidePage:true}),
    tab==="cancelled"&&R(CancelledView,{...sp,hidePage:true})
  );
}
