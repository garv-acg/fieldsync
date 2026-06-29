// ── Pay calculation helpers ────────────────────────────────────────
function workerRoles(w){return(w.roles&&w.roles.length)?w.roles:[w.role]}

function shiftHours(da,k,wId){
  const manual=(da[k]?.concessionsHours||{})[wId];
  if(manual!=null&&manual>0)return manual;
  const s=(da[k]?.concessionsShifts||{})[wId];
  if(s?.start&&s?.end){
    const[sh,sm]=s.start.split(":").map(Number),[eh,em]=s.end.split(":").map(Number);
    return Math.max(0,(eh*60+em-sh*60-sm)/60);
  }
  return 0;
}

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
    const hasGamesAny=(date,locId)=>games.some(g=>g.date===date&&g.locId===locId);
    const hasGames=(date,locId)=>games.some(g=>g.date===date&&g.locId===locId&&g.status==="scheduled");
    if(roles.includes("field")){
      const shiftKeys=Object.entries(da).filter(([k,v])=>{const[date,locId]=k.split("|");return(v.fieldCrew||[]).includes(w.id)&&inRange(date)&&hasGamesAny(date,locId)});
      const uniqueDates=new Set(shiftKeys.map(([k])=>k.split("|")[0]));
      const count=uniqueDates.size;
      const rate=effectiveRate(w,"field",payConfig);
      entries.push({role:"field",label:"Field crew",count,hours:null,rate,total:count*rate});
    }
    if(roles.includes("concessions")){
      const shifts=Object.entries(da).filter(([k,v])=>{const[d,locId]=k.split("|");const loc=(locs||[]).find(l=>l.id===locId);return loc?.hasSnackShack&&(v.concessions||[]).includes(w.id)&&inRange(d)&&hasGames(d,locId)});
      const rate=effectiveRate(w,"concessions",payConfig);
      const hours=shifts.reduce((sum,[k])=>sum+shiftHours(da,k,w.id),0);
      entries.push({role:"concessions",label:"Concessions",count:shifts.length,hours,rate,total:hours*rate});
    }
    const grandTotal=entries.reduce((s,e)=>s+e.total,0);
    return{worker:w,entries,grandTotal};
  }).filter(r=>r.entries.length>0);
}

// ── Season report (original) ───────────────────────────────────────
function SeasonTab({workers,games,da,rsvp,locs}){
  const rows=workers.filter(w=>w.role!=="overseer").map(w=>{
    let shifts=0;
    if(w.role==="umpire")shifts=games.filter(g=>g.status!=="cancelled"&&(g.ump1===w.id||g.ump2===w.id)).length;
    else if(w.role==="field"){shifts=new Set(Object.entries(da).filter(([k,v])=>{const[date,locId]=k.split("|");return(v.fieldCrew||[]).includes(w.id)&&games.some(g=>g.date===date&&g.locId===locId&&g.status==="scheduled")}).map(([k])=>k.split("|")[0])).size}
    else{shifts=Object.entries(da).filter(([k,v])=>{const[date,locId]=k.split("|");const loc=locs?.find(l=>l.id===locId);return loc?.hasSnackShack&&(v.concessions||[]).includes(w.id)&&games.some(g=>g.date===date&&g.locId===locId&&g.status==="scheduled")}).length}
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
function PayTab({workers,games,da,payConfig,updPayConfig,updConcessionsHours,updWorkerPayRate,locs,lockWeek,unlockWeek,isLocked,lockedWeeks}){
  const[scope,setScope]=useState("week"); // "week" | "season"
  const[weekStart,setWeekStart]=useState(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());return d.toISOString().slice(0,10)});
  const[showRates,setShowRates]=useState(false);
  const[rateInputs,setRateInputs]=useState({umpireRate:payConfig.umpireRate,fieldRate:payConfig.fieldRate,concessionsRate:payConfig.concessionsRate});
  const[adjInputs,setAdjInputs]=useState({}); // {wId: {role: string, amt: string, note: string}}
  const[hideUmpires,setHideUmpires]=useState(false);

  const shiftWeek=n=>{const d=new Date(weekStart+"T12:00:00");d.setDate(d.getDate()+n*7);setWeekStart(d.toISOString().slice(0,10));setAdjInputs({})};
  const weekEnd=()=>{const d=new Date(weekStart+"T12:00:00");d.setDate(d.getDate()+6);return d.toISOString().slice(0,10)};
  const weekDates=()=>{const s=new Date(weekStart+"T12:00:00"),out=new Set();for(let i=0;i<7;i++){const d=new Date(s);d.setDate(s.getDate()+i);out.add(d.toISOString().slice(0,10))}return out};

  const filterDates=scope==="week"?weekDates():null;
  const allRows=computePayRows(workers,games,da,payConfig,filterDates,locs);
  const rows=hideUmpires
    ?allRows.map(r=>{const entries=r.entries.filter(e=>e.role!=="umpire");const grandTotal=entries.reduce((s,e)=>s+e.total,0);return{...r,entries,grandTotal}}).filter(r=>r.entries.length>0)
    :allRows;
  const getAdj=wId=>{const a=adjInputs[wId];return a?parseFloat(a.amt)||0:0};
  const grandTotal=rows.reduce((s,r)=>s+r.grandTotal+getAdj(r.worker.id),0);

  const fmtCur=n=>"$"+n.toFixed(2);
  const fmtDate=d=>new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});

  // Concessions hours logger (week scope only)
  const concDays=scope==="week"?Object.entries(da).filter(([k])=>{const[d,locId]=k.split("|");const loc=(locs||[]).find(l=>l.id===locId);return loc?.hasSnackShack&&filterDates.has(d)&&(da[k].concessions||[]).length>0&&da[k].snackShackOpen!==false}).sort(([a],[b])=>a.localeCompare(b)):[];

  const saveRates=()=>{updPayConfig({umpireRate:+rateInputs.umpireRate||0,fieldRate:+rateInputs.fieldRate||0,concessionsRate:+rateInputs.concessionsRate||0})};

  const exportPay=()=>{
    const title=scope==="week"
      ?"Week of "+fmtDate(weekStart)+" – "+fmtDate(weekEnd())
      :"Full Season";
    const groups=[
      ...(!hideUmpires?[{label:"Umpires",role:"umpire",cols:["Name","Games","Rate / Game","Total"]}]:[]),
      {label:"Field Crew",role:"field",cols:["Name","Days Worked","Shifts","Rate / Shift","Total"]},
      {label:"Concessions",role:"concessions",cols:["Name","Shifts","Shift Times","Hours","Rate / Hr","Total"]},
    ];
    const groupedWorkers=role=>rows.filter(r=>r.entries.some(e=>e.role===role));
    const DNAMES=["Su","M","Tu","W","Th","F","Sa"];
    const tableFor=g=>{
      // Filter out workers with nothing earned in this role
      const wrows=groupedWorkers(g.role).filter(r=>{const e=r.entries.find(x=>x.role===g.role);return e&&(e.count>0||e.hours>0);});
      if(!wrows.length)return'<p style="color:#888;font-style:italic">No staff scheduled.</p>';
      let subtotal=0;
      const bodyRows=wrows.map(r=>{
        const e=r.entries.find(x=>x.role===g.role);
        if(!e)return"";
        const workerRoleTotal=e.total;
        subtotal+=workerRoleTotal;
        const concTimes=g.role==="concessions"?Object.entries(da).filter(([k,v])=>{const[d,locId]=k.split("|");const loc=(locs||[]).find(l=>l.id===locId);return loc?.hasSnackShack&&(v.concessions||[]).includes(r.worker.id)&&(!filterDates||filterDates.has(d));}).map(([k])=>concShiftTime(r.worker.id,k)).filter(Boolean).join("<br>") || "—":"";
        const fieldDays=g.role==="field"?[...new Set(Object.entries(da).filter(([k,v])=>{const[d,locId]=k.split("|");return(v.fieldCrew||[]).includes(r.worker.id)&&(!filterDates||filterDates.has(d))&&games.some(gg=>gg.date===d&&gg.locId===locId);}).map(([k])=>k.split("|")[0]))].sort().map(d=>DNAMES[new Date(d+"T12:00:00").getDay()]).join(", "):"";
        const cells=g.role==="concessions"
          ?`<td>${r.worker.name}</td><td>${e.count}</td><td style="font-size:11px;color:#444;line-height:1.6">${concTimes}</td><td>${e.hours.toFixed(2)}</td><td>${fmtCur(e.rate)}</td><td><strong>${fmtCur(workerRoleTotal)}</strong></td>`
          :g.role==="field"
          ?`<td>${r.worker.name}</td><td style="font-size:11px;color:#444">${fieldDays}</td><td>${e.count}</td><td>${fmtCur(e.rate)}</td><td><strong>${fmtCur(workerRoleTotal)}</strong></td>`
          :`<td>${r.worker.name}</td><td>${e.count}</td><td>${fmtCur(e.rate)}</td><td><strong>${fmtCur(workerRoleTotal)}</strong></td>`;
        return`<tr>${cells}</tr>`;
      }).join("");
      const colspan=g.cols.length;
      const footer=`<tr class="subtotal"><td colspan="${colspan-1}">Subtotal</td><td><strong>${fmtCur(subtotal)}</strong></td></tr>`;
      return`<table><thead><tr>${g.cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${bodyRows}${footer}</tbody></table>`;
    };

    // Department subtotals for summary box
    const deptTotals=groups.map(g=>{
      const wrows=groupedWorkers(g.role);
      const sub=wrows.reduce((s,r)=>{const e=r.entries.find(x=>x.role===g.role);return s+(e?e.total:0)},0);
      return{label:g.label,role:g.role,sub};
    });
    const totalAdj=rows.reduce((s,r)=>s+getAdj(r.worker.id),0);

    // Adjustments section
    const adjRows=rows.filter(r=>getAdj(r.worker.id)!==0).map(r=>{
      const a=adjInputs[r.worker.id]||{};
      const amt=parseFloat(a.amt)||0;
      return`<tr><td>${r.worker.name}</td><td>${a.role?rl(a.role):"—"}</td><td style="color:${amt<0?"#c0392b":"#27ae60"};font-weight:600">${amt>0?"+":""}${fmtCur(amt)}</td><td>${a.note||"—"}</td></tr>`;
    }).join("");

    // Concessions shift times lookup
    const concShiftTime=(wId,k)=>{const s=(da[k]?.concessionsShifts||{})[wId];if(!s?.start)return"";const fmt=t=>{const[h,m]=t.split(":").map(Number);const ap=h>=12?"PM":"AM";return(h%12||12)+(m?":"+String(m).padStart(2,"0"):"")+ap;};return s.end?fmt(s.start)+" – "+fmt(s.end):fmt(s.start)+" onwards";};

    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>FieldSync Pay Report — ${title}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#fff;padding:36px 48px;font-size:13px;line-height:1.5}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:2px solid #111827}
      .logo{font-size:24px;font-weight:900;letter-spacing:-0.5px}.logo span{color:#4A70FF}
      .meta{text-align:right}.meta h2{font-size:15px;font-weight:700;margin-bottom:3px;color:#111827}.meta p{color:#6b7280;font-size:11.5px}
      .summary{display:flex;gap:10px;margin-bottom:28px}
      .summary-card{flex:1;border:1.5px solid #e5e7eb;border-radius:10px;padding:13px 16px}
      .summary-card .s-label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#374151;margin-bottom:5px}
      .summary-card .s-amt{font-size:19px;font-weight:800;color:#111827}
      .summary-card .s-sub{font-size:10.5px;color:#6b7280;margin-top:2px}
      .summary-card.adj .s-amt{color:${totalAdj<0?"#dc2626":totalAdj>0?"#16a34a":"#111827"}}
      .summary-card.total{background:#111827;border-color:#111827}
      .summary-card.total .s-label{color:rgba(255,255,255,0.5)}
      .summary-card.total .s-amt{color:#fff}
      .summary-card.total .s-sub{color:rgba(255,255,255,0.4)}
      .section{margin-bottom:24px;page-break-inside:avoid}
      .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:#6b7280;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #e5e7eb}
      table{width:100%;border-collapse:collapse}
      th{background:#f9fafb;padding:6px 10px;text-align:left;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#374151;border-bottom:1.5px solid #e5e7eb}
      td{padding:7px 10px;border-bottom:1px solid #f3f4f6;color:#111827;vertical-align:top}
      tr:last-child td{border-bottom:none}
      tr.subtotal td{background:#f9fafb;font-weight:700;border-top:1.5px solid #e5e7eb;color:#111827}
      .bottom{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding-top:16px;border-top:2px solid #111827;page-break-inside:avoid}
      .grand-box{background:#111827;color:#fff;padding:12px 22px;border-radius:8px;text-align:right}
      .grand-box .label{font-size:10px;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.6);margin-bottom:3px}
      .grand-box .amount{font-size:22px;font-weight:800}
      .footer-txt{font-size:10.5px;color:#9ca3af}
      .print-btn{position:fixed;top:16px;right:16px;background:#4A70FF;color:#fff;border:none;padding:8px 18px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(74,112,255,0.3)}
      @media print{.print-btn{display:none}body{padding:24px 32px}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}.summary-card.total{-webkit-print-color-adjust:exact;print-color-adjust:exact}.grand-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
    <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>
    <script>window.onload=function(){window.print();};</script>
    <div class="header">
      <div class="logo">Field<span>Sync</span></div>
      <div class="meta"><h2>Pay Report — ${title}</h2><p>Generated ${new Date().toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p><p style="margin-top:1px">Confidential — for accounting use</p></div>
    </div>
    <div class="summary">
      ${deptTotals.map(d=>`<div class="summary-card"><div class="s-label">${d.label}</div><div class="s-amt">${fmtCur(d.sub)}</div><div class="s-sub">${groupedWorkers(d.role).filter(r=>{const e=r.entries.find(x=>x.role===d.role);return e&&(e.count>0||e.hours>0);}).length} worker${groupedWorkers(d.role).filter(r=>{const e=r.entries.find(x=>x.role===d.role);return e&&(e.count>0||e.hours>0);}).length!==1?"s":""}</div></div>`).join("")}
      ${totalAdj!==0?`<div class="summary-card adj"><div class="s-label">Adjustments</div><div class="s-amt">${totalAdj>0?"+":""}${fmtCur(totalAdj)}</div><div class="s-sub">${rows.filter(r=>getAdj(r.worker.id)!==0).length} worker${rows.filter(r=>getAdj(r.worker.id)!==0).length!==1?"s":""}</div></div>`:""}
      <div style="flex:1;border:2px solid #111827;border-radius:10px;padding:13px 16px;background:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact"><div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:rgba(255,255,255,0.65);margin-bottom:5px">Total Payroll</div><div style="font-size:19px;font-weight:800;color:#fff">${fmtCur(grandTotal)}</div><div style="font-size:10.5px;color:rgba(255,255,255,0.45);margin-top:2px">${rows.length} worker${rows.length!==1?"s":""}</div></div>
    </div>
    ${groups.map(g=>`<div class="section"><div class="section-title">${g.label}</div>${tableFor(g)}</div>`).join("")}
    ${adjRows?`<div class="section"><div class="section-title">Pay Adjustments</div><table><thead><tr><th>Name</th><th>Paycheck</th><th>Amount</th><th>Reason</th></tr></thead><tbody>${adjRows}</tbody></table></div>`:""}
    <div class="bottom">
      <div class="footer-txt"><div style="font-weight:600;color:#374151">FieldSync Workforce &amp; Game Scheduling</div><div style="margin-top:2px">${rows.length} workers · ${title}</div></div>
      <div class="grand-box"><div class="label">Total Payroll</div><div class="amount">${fmtCur(grandTotal)}</div></div>
    </div>
    </body></html>`;

    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    window.open(url,"_blank");
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
      R("div",{style:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}},
        R("button",{className:"btn btn-sm"+(hideUmpires?" btn-amber":""),onClick:()=>setHideUmpires(p=>!p),title:"Toggle umpire section"},hideUmpires?"Umpires: OFF":"Umpires: ON"),
        scope==="week"&&(isLocked&&isLocked(weekStart)
          ?R("button",{className:"btn btn-sm",style:{background:"#3D2E10",color:"#F0C060",borderColor:"#E0A030"},onClick:()=>unlockWeek&&unlockWeek(weekStart)},"🔓 Unlock week")
          :R("button",{className:"btn btn-sm",style:{background:"#3D2E10",color:"#F0C060",borderColor:"#E0A030"},onClick:()=>lockWeek&&lockWeek(weekStart)},"🔒 Lock week")),
        R("button",{className:"btn btn-blue",onClick:exportPay},"↗ Export for accountant")
      )
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
              ...rows.sort((a,b)=>b.grandTotal-a.grandTotal).map(r=>{
                const adj=adjInputs[r.worker.id]||{role:"",amt:"",note:""};
                const adjAmt=parseFloat(adj.amt)||0;
                const workerTotal=r.grandTotal+adjAmt;
                return R("tr",{key:r.worker.id,style:{borderTop:"1px solid #2E3450"}},
                  R("td",{style:{padding:"10px 10px",fontWeight:700,verticalAlign:"top"}},r.worker.name),
                  R("td",{style:{padding:"10px 10px",verticalAlign:"top"}},R("div",{style:{display:"flex",gap:4,flexWrap:"wrap"}},
                    workerRoles(r.worker).map(role=>R("span",{key:role,className:"badge "+rb(role)},rl(role)))
                  )),
                  R("td",{style:{padding:"10px 10px",verticalAlign:"top"}},
                    R("div",null,
                      r.entries.map(e=>
                        R("div",{key:e.role,style:{fontSize:12,color:"#9BA3BF",marginBottom:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}},
                          R("span",null,e.label+": "),
                          e.role==="concessions"
                            ? R("span",null,e.hours>0?e.hours.toFixed(2)+"h × ":"0h logged")
                            : R("span",null,e.count+(e.role==="umpire"?" game":" shift")+(e.count!==1?"s":"")+" × "),
                          R(WorkerRateInput,{key:r.worker.id+"-"+e.role,w:r.worker,role:e.role,payConfig,updWorkerPayRate}),
                          e.role==="concessions"
                            ? (e.hours>0?R("span",null," = $"+e.total.toFixed(2)):null)
                            : R("span",null," = $"+e.total.toFixed(2))
                        )
                      ),
                      scope==="week"&&R("div",{style:{marginTop:8,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}},
                        R("span",{style:{fontSize:11,color:"#6B7394"}},"Adjustment:"),
                        R("select",{value:adj.role||"",
                          onChange:e=>setAdjInputs(p=>({...p,[r.worker.id]:{...adj,role:e.target.value}})),
                          style:{padding:"2px 5px",borderRadius:4,border:"1px solid #2E3450",background:"#1A2035",color:"#E8ECF8",fontSize:12}},
                          R("option",{value:""},"Role…"),
                          workerRoles(r.worker).map(ro=>R("option",{key:ro,value:ro},rl(ro)))
                        ),
                        R("span",{style:{color:"#9BA3BF"}},"$"),
                        R("input",{type:"number",step:0.5,value:adj.amt,placeholder:"0.00",
                          onChange:e=>setAdjInputs(p=>({...p,[r.worker.id]:{...adj,amt:e.target.value}})),
                          style:{width:70,padding:"2px 6px",borderRadius:4,border:"1px solid #2E3450",background:"#1A2035",color:"#E8ECF8",fontSize:12}}),
                        R("input",{type:"text",value:adj.note,placeholder:"reason (e.g. no-show, short shift)",
                          onChange:e=>setAdjInputs(p=>({...p,[r.worker.id]:{...adj,note:e.target.value}})),
                          style:{width:180,padding:"2px 6px",borderRadius:4,border:"1px solid #2E3450",background:"#1A2035",color:"#E8ECF8",fontSize:12}}),
                        adjAmt!==0&&R("span",{style:{fontSize:12,color:adjAmt<0?"#F09090":"#7DDBA8"}},(adjAmt>0?"+":"")+fmtCur(adjAmt))
                      )
                    )
                  ),
                  R("td",{style:{padding:"10px 10px",fontWeight:700,fontSize:15,textAlign:"right",verticalAlign:"top",color:"#7DDBA8"}},fmtCur(workerTotal))
                );
              }),
              R("tr",{key:"total",style:{borderTop:"2px solid #5B7FFF"}},
                R("td",{colSpan:3,style:{padding:"10px 10px",fontWeight:700,fontSize:13,color:"#9BA3BF"}},"Total payroll"),
                R("td",{style:{padding:"10px 10px",fontWeight:800,fontSize:16,textAlign:"right",color:"#E8ECF8"}},"$"+grandTotal.toFixed(2))
              )
            ])
          )
        )
  );
}

function WorkerRateInput({w,role,payConfig,updWorkerPayRate}){
  const globalRate=r=>role==="umpire"?payConfig.umpireRate:role==="field"?payConfig.fieldRate:payConfig.concessionsRate;
  const current=(w.payRates||{})[role];
  const[val,setVal]=useState(current!=null?String(current):"");
  React.useEffect(()=>{setVal(current!=null?String(current):"");},[current]);
  const placeholder=String(globalRate(role));
  const unit=role==="concessions"?"/hr":role==="umpire"?"/game":"/shift";
  const save=()=>{
    const v=val.trim();
    const n=v===""?null:parseFloat(v);
    updWorkerPayRate(w.id,role,isNaN(n)?null:n);
  };
  return R("span",{style:{display:"inline-flex",alignItems:"center",gap:2}},
    R("span",{style:{color:"#9BA3BF"}},"$"),
    R("input",{type:"number",min:0,step:0.5,value:val,
      placeholder,
      onChange:e=>setVal(e.target.value),
      onBlur:save,
      title:"Leave blank to use default ("+placeholder+")",
      style:{width:56,padding:"2px 4px",borderRadius:4,border:"1px solid #2E3450",background:"#1A2035",color:"#E8ECF8",fontSize:12}}),
    R("span",{style:{color:"#6B7394",fontSize:11}},unit)
  );
}

function ConcessionsHoursInput({w,date,locId,da,updConcessionsHours}){
  const k=dk(date,locId);
  const manual=(da[k]?.concessionsHours||{})[w.id];
  const shift=(da[k]?.concessionsShifts||{})[w.id];
  const autoHours=(()=>{if(shift?.start&&shift?.end){const[sh,sm]=shift.start.split(":").map(Number),[eh,em]=shift.end.split(":").map(Number);return Math.max(0,(eh*60+em-sh*60-sm)/60);}return null;})();
  const[val,setVal]=useState(manual!=null&&manual>0?String(manual):"");
  React.useEffect(()=>{setVal(manual!=null&&manual>0?String(manual):"");},[manual]);
  const save=()=>{const h=parseFloat(val)||0;updConcessionsHours(date,locId,w.id,h)};
  const shiftLabel=shift?.start&&shift?.end?shift.start+" – "+shift.end:null;
  return R("div",{style:{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-start"}},
    R("div",{style:{fontSize:12,color:"#E8ECF8",fontWeight:600}},w.name),
    shiftLabel&&R("div",{style:{fontSize:10,color:"#6B7394"}},shiftLabel+(autoHours!=null?" ("+autoHours.toFixed(2)+"h auto)":"")),
    R("div",{style:{display:"flex",gap:6,alignItems:"center"}},
      R("input",{type:"number",min:0,step:0.25,value:val,onChange:e=>setVal(e.target.value),onBlur:save,
        placeholder:autoHours!=null?autoHours.toFixed(2):"hrs",
        style:{width:70,padding:"5px 8px",borderRadius:6,border:"1px solid #2E3450",background:"#1E2333",color:"#E8ECF8",fontSize:13}}),
      R("span",{style:{fontSize:11,color:"#6B7394"}},val?"hrs (override)":"hrs")
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
