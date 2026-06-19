function WorkersView({workers,games,da,updWorkerRoles,updWorkerPayRate,payConfig}){
  const[editing,setEditing]=useState(null); // worker id being edited
  const ALL_ROLES=["umpire","field","concessions"];

  const workerRoles=w=>w.roles&&w.roles.length?w.roles:[w.role];
  const effectiveRate=(w,role)=>{
    if(w.payRate!=null)return w.payRate;
    return role==="umpire"?payConfig.umpireRate:role==="field"?payConfig.fieldRate:payConfig.concessionsRate;
  };

  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Workers"),R("p",null,"Manage roles and pay rates for each staff member"))),
    R("div",{className:"card"},R("table",{className:"tbl"},
      R("thead",null,R("tr",null,
        R("th",null,"Name"),R("th",null,"Roles"),R("th",null,"Email"),R("th",null,"Available"),R("th",null,"Shifts"),R("th",null,"Rate"),R("th",null,"")
      )),
      R("tbody",null,workers.filter(w=>w.role!=="overseer").map(w=>{
        const roles=workerRoles(w);
        let cnt=0;
        if(w.role==="umpire")cnt=games.filter(g=>g.ump1===w.id||g.ump2===w.id).length;
        else if(w.role==="field")cnt=Object.values(da).filter(d=>(d.fieldCrew||[]).includes(w.id)).length;
        else cnt=Object.values(da).filter(d=>(d.concessions||[]).includes(w.id)).length;

        const rateLabel=roles.map(r=>{
          const rate=effectiveRate(w,r);
          return r==="umpire"?"$"+rate+"/game":r==="field"?"$"+rate+"/shift":"$"+rate+"/hr";
        }).join(", ");

        const isEditing=editing===w.id;
        return[
          R("tr",{key:w.id,style:{borderTop:"1px solid #2E3450"}},
            R("td",{style:{padding:"8px 10px",fontWeight:700}},w.name),
            R("td",{style:{padding:"8px 10px"}},R("div",{style:{display:"flex",gap:4,flexWrap:"wrap"}},
              roles.map(r=>R("span",{key:r,className:"badge "+rb(r)},rl(r)))
            )),
            R("td",{style:{padding:"8px 10px",color:"#9BA3BF",fontSize:12}},w.email),
            R("td",{style:{padding:"8px 10px"}},R("div",{style:{display:"flex",gap:3,flexWrap:"wrap"}},w.avail.map(d=>R("span",{key:d,style:{padding:"1px 6px",borderRadius:4,fontSize:11,background:"#252A3D",color:"#9BA3BF"}},d)))),
            R("td",{style:{padding:"8px 10px"}},cnt),
            R("td",{style:{padding:"8px 10px",fontSize:12,color:"#9BA3BF"}},rateLabel),
            R("td",{style:{padding:"8px 10px"}},R("button",{className:"btn btn-sm",onClick:()=>setEditing(isEditing?null:w.id)},isEditing?"Done":"Edit"))
          ),
          isEditing&&R(WorkerEditRow,{key:w.id+"-edit",w,workerRoles,ALL_ROLES,payConfig,updWorkerRoles,updWorkerPayRate})
        ];
      }))
    ))
  );
}

function WorkerEditRow({w,workerRoles,ALL_ROLES,payConfig,updWorkerRoles,updWorkerPayRate}){
  const roles=workerRoles(w);
  const[pendingRoles,setPendingRoles]=useState(roles);
  const[rateInput,setRateInput]=useState(w.payRate!=null?String(w.payRate):"");

  const toggleRole=r=>{
    if(pendingRoles.includes(r)&&pendingRoles.length===1)return; // must keep at least one
    setPendingRoles(p=>p.includes(r)?p.filter(x=>x!==r):[...p,r]);
  };
  const saveRoles=()=>updWorkerRoles(w.id,pendingRoles);
  const saveRate=()=>{
    const v=rateInput.trim();
    updWorkerPayRate(w.id,v===""?null:parseFloat(v)||null);
  };
  const globalRate=w.role==="umpire"?payConfig.umpireRate:w.role==="field"?payConfig.fieldRate:payConfig.concessionsRate;

  return R("tr",{style:{background:"#1A1F2E",borderTop:"none"}},
    R("td",{colSpan:7,style:{padding:"12px 20px"}},
      R("div",{style:{display:"flex",gap:32,alignItems:"flex-start",flexWrap:"wrap"}},
        R("div",null,
          R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",marginBottom:8}},"Roles"),
          R("div",{style:{display:"flex",gap:8}},
            ALL_ROLES.map(r=>R("button",{key:r,className:"btn btn-sm"+(pendingRoles.includes(r)?" btn-blue":""),onClick:()=>toggleRole(r)},rl(r)))
          ),
          R("button",{className:"btn btn-sm btn-green",style:{marginTop:8},onClick:saveRoles},"Save roles")
        ),
        R("div",null,
          R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",marginBottom:8}},"Pay rate override"),
          R("div",{style:{fontSize:11,color:"#6B7394",marginBottom:6}},"Global default: $"+globalRate+" — leave blank to use global"),
          R("div",{style:{display:"flex",gap:8,alignItems:"center"}},
            R("span",{style:{color:"#9BA3BF"}},"$"),
            R("input",{type:"number",min:0,step:0.5,value:rateInput,onChange:e=>setRateInput(e.target.value),
              placeholder:"e.g. 50",
              style:{width:90,padding:"5px 8px",borderRadius:6,border:"1px solid #2E3450",background:"#252A3D",color:"#E8ECF8",fontSize:13}}),
            R("button",{className:"btn btn-sm btn-green",onClick:saveRate},"Save rate")
          )
        )
      )
    )
  );
}
