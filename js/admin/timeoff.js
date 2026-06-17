function TimeOffView({workers,requests}){
  const days=[];
  for(let i=0;i<14;i++){
    const d=new Date();d.setDate(d.getDate()+i);
    days.push(d.toISOString().slice(0,10));
  }
  const staff=workers.filter(w=>w.role!=="overseer");

  const cellInfo=(w,date)=>{
    const dow=WDAYS[new Date(date+"T12:00:00").getDay()];
    const weeklyOff=!(w.avail||[]).includes(dow);
    const covering=requests.filter(r=>{
      if(r.workerId!==w.id||(r.type!=="vacation"&&r.type!=="time_off"))return false;
      const start=r.dateStart||r.date,end=r.dateEnd||r.dateStart||r.date;
      return start&&date>=start&&date<=end;
    });
    const approved=covering.find(r=>r.status==="approved");
    const pending=covering.find(r=>r.status==="pending");
    if(approved)return{kind:"approved",label:(approved.type==="vacation"?"Vacation":"Time off")+" — approved"};
    if(pending)return{kind:"pending",label:(pending.type==="vacation"?"Vacation":"Time off")+" — pending approval"};
    if(weeklyOff)return{kind:"weekly",label:"Outside weekly availability ("+dow+")"};
    return{kind:"open",label:""};
  };

  const cellStyle=kind=>{
    if(kind==="approved")return{background:"#3D1A1A",color:"#F09090",border:"1px solid #E05555"};
    if(kind==="pending")return{background:"#3D2E10",color:"#F0C060",border:"1px solid #E0A030"};
    if(kind==="weekly")return{background:"#1E2333",color:"#6B7394",border:"1px solid #2E3450"};
    return{background:"transparent",color:"transparent",border:"1px solid transparent"};
  };

  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Time off"),R("p",null,"Weekly availability gaps and approved time off/vacation — next 14 days"))),
    R("div",{style:{display:"flex",gap:16,marginBottom:14,fontSize:12,color:"#9BA3BF",flexWrap:"wrap"}},
      R("span",null,R("span",{style:{display:"inline-block",width:10,height:10,background:"#3D1A1A",border:"1px solid #E05555",borderRadius:3,marginRight:5}}),"Approved time off / vacation"),
      R("span",null,R("span",{style:{display:"inline-block",width:10,height:10,background:"#3D2E10",border:"1px solid #E0A030",borderRadius:3,marginRight:5}}),"Pending request"),
      R("span",null,R("span",{style:{display:"inline-block",width:10,height:10,background:"#1E2333",border:"1px solid #2E3450",borderRadius:3,marginRight:5}}),"Outside weekly availability")
    ),
    staff.length===0
      ? R("div",{className:"card"},R("div",{className:"empty"},"No workers on staff yet."))
      : R("div",{className:"card",style:{overflowX:"auto"}},
          R("table",{style:{borderCollapse:"collapse",fontSize:12,width:"100%"}},
            R("thead",null,
              R("tr",null,
                R("th",{style:{padding:"6px 10px",textAlign:"left",position:"sticky",left:0,background:"#181C27",zIndex:1}},"Worker"),
                days.map(d=>R("th",{key:d,style:{padding:"6px 6px",textAlign:"center",color:"#6B7394",fontSize:10,whiteSpace:"nowrap",fontWeight:600}},
                  WDAYS[new Date(d+"T12:00:00").getDay()],R("br",null),d.slice(5)
                ))
              )
            ),
            R("tbody",null,staff.map(w=>R("tr",{key:w.id,style:{borderTop:"1px solid #2E3450"}},
              R("td",{style:{padding:"6px 10px",whiteSpace:"nowrap",position:"sticky",left:0,background:"#181C27"}},
                R("div",{style:{fontWeight:700}},w.name),
                R("div",{style:{fontSize:10,color:"#6B7394"}},rl(w.role))
              ),
              days.map(d=>{
                const info=cellInfo(w,d);
                return R("td",{key:d,title:info.label,style:{padding:"3px"}},
                  R("div",{style:{...cellStyle(info.kind),borderRadius:5,padding:"3px 0",fontWeight:700,fontSize:11,textAlign:"center",minWidth:26}},
                    info.kind==="open"?"·":info.kind==="pending"?"?":"✕"
                  )
                );
              })
            )))
          )
        )
  );
}