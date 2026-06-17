function ReportsView({workers,games,da,rsvp,locs}){
  const rows=workers.filter(w=>w.role!=="overseer").map(w=>{
    let shifts=0;
    if(w.role==="umpire"){
      shifts=games.filter(g=>g.status!=="cancelled"&&(g.ump1===w.id||g.ump2===w.id)).length;
    } else {
      const roleKey=w.role==="field"?"fieldCrew":"concessions";
      shifts=Object.values(da).filter(v=>(v[roleKey]||[]).includes(w.id)).length;
    }
    let confirmed=0,declined=0;
    Object.entries(rsvp).forEach(([k,status])=>{
      const wId=k.split("_")[0];
      if(Number(wId)===w.id){
        if(status==="confirmed")confirmed++;
        if(status==="declined")declined++;
      }
    });
    const totalRsvp=confirmed+declined;
    const declineRate=totalRsvp>0?Math.round(declined/totalRsvp*100):null;
    return{worker:w,shifts,confirmed,declined,declineRate};
  });

  // Average shifts per role, used to flag under/over-utilized workers
  const byRole={};
  rows.forEach(r=>{if(!byRole[r.worker.role])byRole[r.worker.role]=[];byRole[r.worker.role].push(r.shifts)});
  const avg={};
  Object.entries(byRole).forEach(([role,arr])=>{avg[role]=arr.reduce((a,b)=>a+b,0)/arr.length});

  const fairnessTag=r=>{
    const a=avg[r.worker.role]||0;
    if(a===0)return null;
    if(r.shifts<a*0.5)return{label:"Underutilized",red:false};
    if(r.shifts>a*1.5)return{label:"Overloaded",red:true};
    return null;
  };

  const sorted=[...rows].sort((a,b)=>b.shifts-a.shifts);

  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Season report"),R("p",null,"Shift totals, RSVP reliability, and workload balance"))),
    rows.length===0
      ? R("div",{className:"card"},R("div",{className:"empty"},"No workers on staff yet."))
      : R("div",{className:"card"},
          R("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:13}},
            R("thead",null,
              R("tr",{style:{textAlign:"left"}},
                R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Worker"),
                R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Role"),
                R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Shifts"),
                R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Confirmed"),
                R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Declined"),
                R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Decline rate"),
                R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Balance")
              )
            ),
            R("tbody",null,sorted.map(r=>{
              const tag=fairnessTag(r);
              return R("tr",{key:r.worker.id,style:{borderTop:"1px solid #2E3450"}},
                R("td",{style:{padding:"8px 10px",fontWeight:700}},r.worker.name),
                R("td",{style:{padding:"8px 10px",color:"#9BA3BF"}},rl(r.worker.role)),
                R("td",{style:{padding:"8px 10px"}},r.shifts),
                R("td",{style:{padding:"8px 10px",color:"#7DDBA8"}},r.confirmed),
                R("td",{style:{padding:"8px 10px",color:"#F09090"}},r.declined),
                R("td",{style:{padding:"8px 10px"}},r.declineRate==null?"—":r.declineRate+"%"),
                R("td",{style:{padding:"8px 10px"}},
                  tag
                    ? R("span",{className:"badge",style:tag.red?{background:"#3D1A1A",color:"#F09090",border:"1px solid #E05555"}:{background:"#3D2E10",color:"#F0C060",border:"1px solid #E0A030"}},tag.label)
                    : "—"
                )
              );
            }))
          )
        )
  );
}