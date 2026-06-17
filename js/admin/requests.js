function ReqsView({requests,workers,handleReq}){
  const[f,setF]=useState("pending");

  // Pending includes both pending and pending_approval
  const sh=requests.filter(r=>{
    if(f==="pending") return r.status==="pending"||r.status==="pending_approval";
    if(f==="all")     return true;
    return r.status===f;
  });

  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Requests"),R("p",null,"Time off, vacation, shift swaps, and shift offers"))),
    R("div",{style:{display:"flex",gap:6,marginBottom:14}},
      ["pending","approved","denied","all"].map(s=>R("button",{key:s,className:"btn btn-sm"+(f===s?" btn-blue":""),onClick:()=>setF(s)},
        s.charAt(0).toUpperCase()+s.slice(1),
        s==="pending"&&requests.filter(r=>r.status==="pending"||r.status==="pending_approval").length>0&&
          " ("+requests.filter(r=>r.status==="pending"||r.status==="pending_approval").length+")"
      ))
    ),
    R("div",{className:"card"},
      sh.length===0?R("div",{className:"empty"},"No "+f+" requests."):
      sh.map(r=>{
        const w=workers.find(x=>x.id===r.workerId);

        // ── SHIFT OFFER / CLAIM ──────────────────────────────────
        if(r.type==="shift_offer"){
          const claimer=r.claimedBy?workers.find(x=>x.id===r.claimedBy):null;
          const isPendingApproval=r.status==="pending_approval";
          return R("div",{key:r.id,style:{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:"1px solid #2E3450"}},
            R("div",{style:{width:36,height:36,borderRadius:8,background:"#1A3D2C",border:"1px solid #3DBA7B",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},
              R("span",{style:{fontSize:16}},isPendingApproval?"🔄":"📋")
            ),
            R("div",{style:{flex:1}},
              R("div",{style:{fontWeight:700,fontSize:13}},isPendingApproval?"Shift Claim — Needs Approval":"Shift Offered Up"),
              R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:3}},r.label),
              R("div",{style:{display:"flex",gap:8,alignItems:"center",marginTop:5,flexWrap:"wrap"}},
                R("span",{className:"badge b-green",style:{fontSize:10}},"Shift offer"),
                R("span",{style:{fontSize:12,color:"#9BA3BF"}},"Offered by: "+w?.name||"?"),
                claimer&&R("span",{style:{fontSize:12,color:"#7DDBA8",fontWeight:700}},"→ "+claimer.name+" wants to claim")
              )
            ),
            R("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}},
              R("span",{className:"badge "+(r.status==="pending"?"b-dim":r.status==="pending_approval"?"b-amber":r.status==="approved"?"b-green":"b-red"),style:{fontSize:10}},
                r.status==="pending"?"Open":r.status==="pending_approval"?"Claim pending":r.status
              ),
              isPendingApproval&&R("div",{style:{display:"flex",gap:6}},
                R("button",{className:"btn btn-sm btn-green",onClick:()=>handleReq(r.id,"approved")},"Approve swap"),
                R("button",{className:"btn btn-sm btn-red",onClick:()=>handleReq(r.id,"denied")},"Deny")
              )
            )
          );
        }

        // ── STANDARD REQUESTS ────────────────────────────────────
        const tl=r.type==="vacation"?"Vacation":r.type==="time_off"?"Time off":"Shift swap";
        const dl=r.type==="vacation"&&r.dateEnd&&r.dateEnd!==r.dateStart?r.dateStart+" → "+r.dateEnd:r.dateStart||r.date||"";
        return R("div",{key:r.id,style:{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #2E3450"}},
          R("div",{style:{flex:1}},
            R("div",{style:{fontWeight:700}},w?.name||"?"),
            R("div",{style:{display:"flex",gap:8,alignItems:"center",marginTop:3}},
              R("span",{className:"badge b-blue",style:{fontSize:10}},tl),
              dl&&R("span",{style:{fontSize:12,color:"#9BA3BF"}},dl)
            ),
            r.reason&&R("div",{style:{fontSize:12,color:"#6B7394",marginTop:2}},r.reason)
          ),
          R("span",{className:"badge "+(r.status==="pending"?"b-amber":r.status==="approved"?"b-green":"b-red")},r.status),
          r.status==="pending"&&R("div",{style:{display:"flex",gap:6}},
            R("button",{className:"btn btn-sm btn-green",onClick:()=>handleReq(r.id,"approved")},"Approve"),
            R("button",{className:"btn btn-sm btn-red",onClick:()=>handleReq(r.id,"denied")},"Deny")
          )
        );
      })
    )
  );
}
