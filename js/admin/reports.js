// ── Pay calculation helpers ────────────────────────────────────────
function workerRoles(w){return(w.roles&&w.roles.length)?w.roles:[w.role]}

function effectiveRate(w,role,payConfig){
  const r=(w.payRates||{})[role];
  if(r!=null)return r;
  return role==="umpire"?payConfig.umpireRate:role==="field"?payConfig.fieldRate:payConfig.concessionsRate;
}

function computePayRows(workers,games,da,payConfig,filterDates,locs){
  // filterDates: Set of date strings, or null for all
  const inRange=d=>!filterDates||filterDates.has(d);
  return workers.filter(w=>w.role!=="overseer").map(w=>{
    const roles=workerRoles(w);
    const entries=[];
    if(roles.includes("umpire")){
      const myGames=games.filter(g=>g.status!=="cancelled"&&(g.ump1===w.id||g.ump2===w.id)&&inRange(g.date));
      const rate=effectiveRate(w,"umpire",payConfig);
      entries.push({role:"umpire",label:"Umpire",count:myGames.length,hours:null,rate,total:myGames.length*rate});
    }
    if(roles.includes("field")){
      const shifts=Object.entries(da).filter(([k,v])=>(v.fieldCrew||[]).includes(w.id)&&inRange(k.split("|")[0]));
      const rate=effectiveRate(w,"field",payConfig);
      entries.push({role:"field",label:"Field crew",count:shifts.length,hours:null,rate,total:shifts.length*rate});
    }
    if(roles.includes("concessions")){
      const shifts=Object.entries(da).filter(([k,v])=>{const[d,locId]=k.split("|");const loc=(locs||[]).find(l=>l.id===locId);return loc?.hasSnackShack&&(v.concessions||[]).includes(w.id)&&inRange(d)});
      const rate=effectiveRate(w,"concessions",payConfig);
      const hours=shifts.reduce((sum,[k,v])=>sum+((v.concessionsHours||{})[w.id]||0),0);
      entries.push({role:"concessions",label:"Concessions",count:shifts.length,hours,rate,total:hours*rate});
    }
    const grandTotal=entries.reduce((s,e)=>s+e.total,0);
    return{worker:w,entries,grandTotal};
  }).filter(r=>r.entries.length>0);
}

// ── Season report (original) ───────────────────────────────────────
function SeasonTab({workers,games,da,rsvp}){
  const rows=workers.filter(w=>w.role!=="overseer").map(w=>{
    let shifts=0;
    if(w.role==="umpire")shifts=games.filter(g=>g.status!=="cancelled"&&(g.ump1===w.id||g.ump2===w.id)).length;
    else{const rk=w.role==="field"?"fieldCrew":"concessions";shifts=Object.values(da).filter(v=>(v[rk]||[]).includes(w.id)).length}
    let confirmed=0,declined=0;
    Object.entries(rsvp).forEach(([k,status])=>{if(Number(k.split("_")[0])===w.id){if(status==="confirmed")confirmed++;if(status==="declined")declined++}});
    const totalRsvp=confirmed+declined,declineRate=totalRsvp>0?Math.round(declined/totalRsvp*100):null;
    return{worker:w,shifts,confirmed,declined,declineRate};
  });
  const byRole={};rows.forEach(r=>{if(!byRole[r.worker.role])byRole[r.worker.role]=[];byRole[r.worker.role].push(r.shifts)});
  const avg={};Object.entries(byRole).forEach(([role,arr])=>{avg[role]=arr.reduce((a,b)=>a+b,0)/arr.length});
  const fairnessTag=r=>{const a=avg[r.worker.role]||0;if(a===0)return null;if(r.shifts<a*0.5)return{label:"Underutilized",red:false};if(r.shifts>a*1.5)return{label:"Overloaded",red:true};return null};
  const sorted=[...rows].sort((a,b)=>b.shifts-a.shifts);
  return rows.length===0?R("div",{className:"card"},R("div",{className:"empty"},"No workers on staff yet.")):
    R("div",{className:"card"},R("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:13}},
      R("thead",null,R("tr",{style:{textAlign:"left"}},
        R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Worker"),
        R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Role"),
        R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Shifts"),
        R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Confirmed"),
        R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Declined"),
        R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Decline rate"),
        R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Balance")
      )),
      R("tbody",null,sorted.map(r=>{
        const tag=fairnessTag(r);
        return R("tr",{key:r.worker.id,style:{borderTop:"1px solid #2E3450"}},
          R("td",{style:{padding:"8px 10px",fontWeight:700}},r.worker.name),
          R("td",{style:{padding:"8px 10px",color:"#9BA3BF"}},rl(r.worker.role)),
          R("td",{style:{padding:"8px 10px"}},r.shifts),
          R("td",{style:{padding:"8px 10px",color:"#7DDBA8"}},r.confirmed),
          R("td",{style:{padding:"8px 10px",color:"#F09090"}},r.declined),
          R("td",{style:{padding:"8px 10px"}},r.declineRate==null?"—":r.declineRate+"%"),
          R("td",{style:{padding:"8px 10px"}},tag?R("span",{className:"badge",style:tag.red?{background:"#3D1A1A",color:"#F09090",border:"1px solid #E05555"}:{background:"#3D2E10",color:"#F0C060",border:"1px solid #E0A030"}},tag.label):"—")
        );
      }))
    ));
}

// ── Pay tab ────────────────────────────────────────────────────────
function PayTab({workers,games,da,payConfig,updPayConfig,updConcessionsHours,locs}){
  const[scope,setScope]=useState("week"); // "week" | "season"
  const[weekStart,setWeekStart]=useState(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());return d.toISOString().slice(0,10)});
  const[showRates,setShowRates]=useState(false);
  const[rateInputs,setRateInputs]=useState({umpireRate:payConfig.umpireRate,fieldRate:payConfig.fieldRate,concessionsRate:payConfig.concessionsRate});

  const shiftWeek=n=>{const d=new Date(weekStart+"T12:00:00");d.setDate(d.getDate()+n*7);setWeekStart(d.toISOString().slice(0,10))};
  const weekEnd=()=>{const d=new Date(weekStart+"T12:00:00");d.setDate(d.getDate()+6);return d.toISOString().slice(0,10)};
  const weekDates=()=>{const s=new Date(weekStart+"T12:00:00"),out=new Set();for(let i=0;i<7;i++){const d=new Date(s);d.setDate(s.getDate()+i);out.add(d.toISOString().slice(0,10))}return out};

  const filterDates=scope==="week"?weekDates():null;
  const rows=computePayRows(workers,games,da,payConfig,filterDates,locs);
  const grandTotal=rows.reduce((s,r)=>s+r.grandTotal,0);

  const fmtCur=n=>"$"+n.toFixed(2);
  const fmtDate=d=>new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});

  // Concessions hours logger (week scope only)
  const concDays=scope==="week"?Object.entries(da).filter(([k])=>{const[d,locId]=k.split("|");const loc=(locs||[]).find(l=>l.id===locId);return loc?.hasSnackShack&&filterDates.has(d)&&(da[k].concessions||[]).length>0}):[];

  const saveRates=()=>{updPayConfig({umpireRate:+rateInputs.umpireRate||0,fieldRate:+rateInputs.fieldRate||0,concessionsRate:+rateInputs.concessionsRate||0})};

  const exportPay=()=>{
    const title=scope==="week"
      ?"Week of "+fmtDate(weekStart)+" – "+fmtDate(weekEnd())
      :"Full Season";
    const groups=[
      {label:"Umpires",role:"umpire",cols:["Name","Games","Rate / Game","Total"]},
      {label:"Field Crew",role:"field",cols:["Name","Shifts","Rate / Shift","Total"]},
      {label:"Concessions",role:"concessions",cols:["Name","Shifts","Hours","Rate / Hr","Total"]},
    ];
    const groupedWorkers=role=>rows.filter(r=>r.entries.some(e=>e.role===role));
    const tableFor=g=>{
      const wrows=groupedWorkers(g.role);
      if(!wrows.length)return'<p style="color:#888;font-style:italic">No staff scheduled.</p>';
      let subtotal=0;
      const bodyRows=wrows.map(r=>{
        const e=r.entries.find(x=>x.role===g.role);
        if(!e)return"";
        subtotal+=e.total;
        const cells=g.role==="concessions"
          ?`<td>${r.worker.name}</td><td>${e.count}</td><td>${e.hours.toFixed(2)}</td><td>${fmtCur(e.rate)}</td><td><strong>${fmtCur(e.total)}</strong></td>`
          :`<td>${r.worker.name}</td><td>${e.count}</td><td>${fmtCur(e.rate)}</td><td><strong>${fmtCur(e.total)}</strong></td>`;
        return`<tr>${cells}</tr>`;
      }).join("");
      const colspan=g.cols.length;
      const footer=`<tr class="subtotal"><td colspan="${colspan-1}">Subtotal</td><td><strong>${fmtCur(subtotal)}</strong></td></tr>`;
      return`<table><thead><tr>${g.cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${bodyRows}${footer}</tbody></table>`;
    };

    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>FieldSync Pay Report</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e;background:#fff;padding:40px 48px;font-size:13px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1a1a2e}
      .logo{font-size:22px;font-weight:800;letter-spacing:-0.5px}.logo span{color:#4A70FF}
      .meta{text-align:right}.meta h2{font-size:16px;font-weight:700;margin-bottom:4px}.meta p{color:#666;font-size:12px}
      .section{margin-bottom:32px}
      .section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#666;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}
      table{width:100%;border-collapse:collapse;margin-bottom:0}
      th{background:#f3f4f6;padding:7px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #d1d5db}
      td{padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#1a1a2e}
      tr:last-child td{border-bottom:none}
      tr.subtotal td{background:#f9fafb;font-weight:600;border-top:1px solid #d1d5db}
      .grand{display:flex;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:2px solid #1a1a2e}
      .grand-box{background:#1a1a2e;color:#fff;padding:14px 24px;border-radius:8px;text-align:right}
      .grand-box .label{font-size:11px;text-transform:uppercase;letter-spacing:0.5px;opacity:.7;margin-bottom:4px}
      .grand-box .amount{font-size:22px;font-weight:800}
      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between}
      .print-btn{position:fixed;top:20px;right:20px;background:#4A70FF;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
      @media print{.print-btn{display:none}body{padding:20px 28px}}
    </style></head><body>
    <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
    <div class="header">
      <div class="logo">Field<span>Sync</span></div>
      <div class="meta"><h2>Pay Report — ${title}</h2><p>Generated ${new Date().toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p><p style="margin-top:2px;color:#888">Confidential — for accounting use</p></div>
    </div>
    ${groups.map(g=>`<div class="section"><div class="section-title">${g.label}</div>${tableFor(g)}</div>`).join("")}
    <div class="grand"><div class="grand-box"><div class="label">Total Payroll</div><div class="amount">${fmtCur(grandTotal)}</div></div></div>
    <div class="footer"><span>FieldSync Workforce &amp; Game Scheduling</span><span>Total workers: ${rows.length}</span></div>
    </body></html>`;

    const w=window.open("","_blank");
    w.document.write(html);w.document.close();
  };

  return R("div",null,
    // ── Rate settings panel ──
    R("div",{className:"card",style:{marginBottom:16}},
      R("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"},onClick:()=>setShowRates(p=>!p)},
        R("div",{style:{fontWeight:700,fontSize:14}},"Default pay rates"),
      R("div",{style:{fontSize:11,color:"#6B7394",marginTop:2}},"Applied when a worker has no individual rate set"),
        R("span",{style:{color:"#6B7394",fontSize:12}},showRates?"▲ Hide":"▼ Show")
      ),
      showRates&&R("div",{style:{marginTop:16,display:"flex",gap:32,flexWrap:"wrap"}},
        [["umpireRate","Umpire rate","per game"],["fieldRate","Field crew rate","per shift (flat)"],["concessionsRate","Concessions rate","per hour"]].map(([key,label,sub])=>
          R("div",{key},
            R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",marginBottom:4}},label),
            R("div",{style:{fontSize:10,color:"#6B7394",marginBottom:6}},sub),
            R("div",{style:{display:"flex",alignItems:"center",gap:6}},
              R("span",{style:{color:"#9BA3BF"}},"$"),
              R("input",{type:"number",min:0,step:0.5,value:rateInputs[key],
                onChange:e=>setRateInputs(p=>({...p,[key]:e.target.value})),
                style:{width:80,padding:"5px 8px",borderRadius:6,border:"1px solid #2E3450",background:"#1E2333",color:"#E8ECF8",fontSize:13}})
            )
          )
        ),
        R("div",{style:{display:"flex",alignItems:"flex-end"}},
          R("button",{className:"btn btn-green",onClick:saveRates},"Save rates")
        )
      )
    ),

    // ── Scope + week nav ──
    R("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}},
      R("div",{style:{display:"flex",gap:4}},
        [{id:"week",label:"Weekly"},{id:"season",label:"Full season"}].map(s=>
          R("button",{key:s.id,className:"btn btn-sm"+(scope===s.id?" btn-blue":""),onClick:()=>setScope(s.id)},s.label)
        )
      ),
      scope==="week"&&R("div",{style:{display:"flex",alignItems:"center",gap:8}},
        R("button",{className:"btn btn-sm",onClick:()=>shiftWeek(-1)},"← Prev"),
        R("span",{style:{fontSize:13,fontWeight:600,color:"#E8ECF8"}},fmtDate(weekStart)+" – "+fmtDate(weekEnd())),
        R("button",{className:"btn btn-sm",onClick:()=>shiftWeek(1)},"Next →")
      ),
      R("button",{className:"btn btn-blue",onClick:exportPay},"↗ Export for accountant")
    ),

    // ── Concessions hours logger (weekly only) ──
    scope==="week"&&concDays.length>0&&R("div",{className:"card",style:{marginBottom:16}},
      R("div",{style:{fontWeight:700,fontSize:14,marginBottom:12}},"Concessions hours — log shift hours"),
      R("div",{style:{fontSize:11,color:"#6B7394",marginBottom:12}},"Enter decimal hours worked per worker (e.g. 3.5 for 3h 30m). Changes save immediately."),
      concDays.map(([k,v])=>{
        const[date,locId]=k.split("|");
        const loc=locs.find(l=>l.id===locId);
        return R("div",{key:k,style:{marginBottom:12}},
          R("div",{style:{fontSize:12,fontWeight:700,color:"#9BA3BF",marginBottom:6}},
            new Date(date+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})+" — "+(loc?.name||locId)
          ),
          R("div",{style:{display:"flex",gap:12,flexWrap:"wrap"}},
            (v.concessions||[]).map(wId=>{
              const w=workers.find(x=>x.id===wId);
              if(!w)return null;
              return R(ConcessionsHoursInput,{key:wId,w,date,locId,da,updConcessionsHours});
            })
          )
        );
      })
    ),

    // ── Pay table ──
    rows.length===0
      ? R("div",{className:"card"},R("div",{className:"empty"},"No shifts in this period."))
      : R("div",{className:"card"},
          R("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:13}},
            R("thead",null,R("tr",{style:{textAlign:"left"}},
              R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Name"),
              R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Role(s)"),
              R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase"}},"Breakdown"),
              R("th",{style:{padding:"6px 10px",color:"#6B7394",fontSize:11,textTransform:"uppercase",textAlign:"right"}},"Total")
            )),
            R("tbody",null,[
              ...rows.sort((a,b)=>b.grandTotal-a.grandTotal).map(r=>
                R("tr",{key:r.worker.id,style:{borderTop:"1px solid #2E3450"}},
                  R("td",{style:{padding:"10px 10px",fontWeight:700,verticalAlign:"top"}},r.worker.name),
                  R("td",{style:{padding:"10px 10px",verticalAlign:"top"}},R("div",{style:{display:"flex",gap:4,flexWrap:"wrap"}},
                    workerRoles(r.worker).map(role=>R("span",{key:role,className:"badge "+rb(role)},rl(role)))
                  )),
                  R("td",{style:{padding:"10px 10px",verticalAlign:"top"}},
                    R("div",null,r.entries.map(e=>
                      R("div",{key:e.role,style:{fontSize:12,color:"#9BA3BF",marginBottom:2}},
                        e.label+": ",
                        e.role==="concessions"
                          ? e.hours>0?(e.hours.toFixed(2)+"h × $"+e.rate+"/hr = $"+e.total.toFixed(2)):"0h logged"
                          : e.count+(e.role==="umpire"?" game":" shift")+(e.count!==1?"s":"")+" × $"+e.rate+" = $"+e.total.toFixed(2)
                      )
                    ))
                  ),
                  R("td",{style:{padding:"10px 10px",fontWeight:700,fontSize:15,textAlign:"right",verticalAlign:"top",color:"#7DDBA8"}},fmtCur(r.grandTotal))
                )
              ),
              R("tr",{key:"total",style:{borderTop:"2px solid #5B7FFF"}},
                R("td",{colSpan:3,style:{padding:"10px 10px",fontWeight:700,fontSize:13,color:"#9BA3BF"}},"Total payroll"),
                R("td",{style:{padding:"10px 10px",fontWeight:800,fontSize:16,textAlign:"right",color:"#E8ECF8"}},"$"+grandTotal.toFixed(2))
              )
            ])
          )
        )
  );
}

function ConcessionsHoursInput({w,date,locId,da,updConcessionsHours}){
  const current=(da[dk(date,locId)]?.concessionsHours||{})[w.id]||0;
  const[val,setVal]=useState(current===0?"":String(current));
  const save=()=>{const h=parseFloat(val)||0;updConcessionsHours(date,locId,w.id,h)};
  return R("div",{style:{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-start"}},
    R("div",{style:{fontSize:12,color:"#E8ECF8",fontWeight:600}},w.name),
    R("div",{style:{display:"flex",gap:6,alignItems:"center"}},
      R("input",{type:"number",min:0,step:0.25,value:val,onChange:e=>setVal(e.target.value),onBlur:save,
        placeholder:"hrs",
        style:{width:70,padding:"5px 8px",borderRadius:6,border:"1px solid #2E3450",background:"#1E2333",color:"#E8ECF8",fontSize:13}}),
      R("span",{style:{fontSize:11,color:"#6B7394"}},"hrs")
    )
  );
}

// ── Main reports view ──────────────────────────────────────────────
function ReportsView(sp){
  const[tab,setTab]=useState("season");
  const tabs=[{id:"season",label:"Season report"},{id:"pay",label:"Pay & payroll"}];
  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Reports"),R("p",null,"Season stats, workload balance, and payroll"))),
    R("div",{style:{display:"flex",gap:4,padding:"0 20px",borderBottom:"1px solid #2E3450",marginBottom:16}},
      tabs.map(t=>R("div",{key:t.id,onClick:()=>setTab(t.id),style:{padding:"10px 18px",cursor:"pointer",fontWeight:600,fontSize:13,borderBottom:tab===t.id?"2px solid #5B7FFF":"2px solid transparent",color:tab===t.id?"#E8ECF8":"#6B7394"}},t.label))
    ),
    tab==="season"&&R(SeasonTab,sp),
    tab==="pay"&&R(PayTab,sp)
  );
}
