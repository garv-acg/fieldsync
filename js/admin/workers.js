function WorkersView({workers,games,da,updWorkerRoles,updWorkerPayRate,payConfig,setModal,updWorkerPassword}){
  const[editing,setEditing]=useState(null);
  const ALL_ROLES=["umpire","field","concessions"];
  const workerRoles=w=>w.roles&&w.roles.length?w.roles:[w.role];
  const globalRate=r=>r==="umpire"?payConfig.umpireRate:r==="field"?payConfig.fieldRate:payConfig.concessionsRate;
  const displayRate=(w,r)=>(w.payRates||{})[r]??globalRate(r);

  return R("div",null,
    R("div",{className:"ph"},
      R("div",null,R("h2",null,"Workers"),R("p",null,"Set individual pay rates and roles for each staff member")),
      R("button",{className:"btn btn-blue",onClick:()=>setModal({type:"add_worker"})},"+  Add worker")
    ),
    R("div",{className:"card"},R("div",{className:"tbl-wrap"},R("table",{className:"tbl"},
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
          const rate=displayRate(w,r);
          const unit=r==="umpire"?"/game":r==="field"?"/shift":"/hr";
          const isSet=(w.payRates||{})[r]!=null;
          return "$"+rate+unit+(isSet?"":" (default)");
        }).join("  ·  ");
        const isSet=roles.some(r=>(w.payRates||{})[r]!=null);

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
            R("td",{style:{padding:"8px 10px"}},
              R("span",{style:{fontWeight:700,color:"#E8ECF8",fontSize:13}},rateLabel)
            ),
            R("td",{style:{padding:"8px 10px"}},R("button",{className:"btn btn-sm",onClick:()=>setEditing(isEditing?null:w.id)},isEditing?"Done":"Edit"))
          ),
          isEditing&&R(WorkerEditRow,{key:w.id+"-edit",w,workerRoles,ALL_ROLES,globalRate,updWorkerRoles,updWorkerPayRate,updWorkerPassword})
        ];
      }))
    )))
  );
}

function WorkerEditRow({w,workerRoles,ALL_ROLES,globalRate,updWorkerRoles,updWorkerPayRate,updWorkerPassword}){
  const roles=workerRoles(w);
  const[pendingRoles,setPendingRoles]=useState(roles);
  const initRates=()=>{const o={};ALL_ROLES.forEach(r=>{const v=(w.payRates||{})[r];o[r]=v!=null?String(v):""});return o};
  const[rateInputs,setRateInputs]=useState(initRates);
  const[newPass,setNewPass]=useState(""),[passSaved,setPassSaved]=useState(false);
  const savePass=()=>{if(!newPass.trim())return;updWorkerPassword(w.id,newPass.trim());setNewPass("");setPassSaved(true);setTimeout(()=>setPassSaved(false),2000)};

  const toggleRole=r=>{
    if(pendingRoles.includes(r)&&pendingRoles.length===1)return;
    setPendingRoles(p=>p.includes(r)?p.filter(x=>x!==r):[...p,r]);
  };
  const saveRoles=()=>updWorkerRoles(w.id,pendingRoles);
  const saveRate=role=>{
    const v=parseFloat(rateInputs[role]);
    updWorkerPayRate(w.id,role,isNaN(v)?null:v);
  };
  const UNITS={umpire:"per game",field:"per shift (flat)",concessions:"per hour"};

  return R("tr",{style:{background:"#1A1F2E",borderTop:"none"}},
    R("td",{colSpan:7,style:{padding:"14px 20px"}},
      R("div",{style:{display:"flex",gap:32,alignItems:"flex-start",flexWrap:"wrap",marginBottom:16}},
        R("div",null,
          R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",marginBottom:8}},"Reset Password"),
          R("div",{style:{display:"flex",gap:6,alignItems:"center"}},
            R("input",{type:"text",value:newPass,onChange:e=>setNewPass(e.target.value),placeholder:"New password…",style:{padding:"5px 8px",borderRadius:6,border:"1px solid #5B7FFF",background:"#1E2333",color:"#E8ECF8",fontSize:13,width:160}}),
            R("button",{className:"btn btn-sm btn-green",disabled:!newPass.trim(),onClick:savePass},passSaved?"✓ Saved":"Set password")
          )
        )
      ),
      R("div",{style:{display:"flex",gap:32,alignItems:"flex-start",flexWrap:"wrap"}},
        R("div",null,
          R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",marginBottom:8}},"Roles"),
          R("div",{style:{display:"flex",gap:8}},
            ALL_ROLES.map(r=>R("button",{key:r,className:"btn btn-sm"+(pendingRoles.includes(r)?" btn-blue":""),onClick:()=>toggleRole(r)},rl(r)))
          ),
          R("button",{className:"btn btn-sm btn-green",style:{marginTop:8},onClick:saveRoles},"Save roles")
        ),
        R("div",null,
          R("div",{style:{fontSize:11,fontWeight:700,color:"#6B7394",textTransform:"uppercase",marginBottom:10}},"Pay rates"),
          R("div",{style:{display:"flex",gap:20,flexWrap:"wrap"}},
            ALL_ROLES.map(r=>{
              const active=pendingRoles.includes(r);
              return R("div",{key:r,style:{opacity:active?1:0.35}},
                R("div",{style:{fontSize:11,color:"#6B7394",marginBottom:4}},rl(r)+" · "+UNITS[r]),
                R("div",{style:{display:"flex",gap:6,alignItems:"center"}},
                  R("span",{style:{color:"#9BA3BF"}},"$"),
                  R("input",{type:"number",min:0,step:0.5,disabled:!active,
                    value:rateInputs[r],
                    placeholder:String(globalRate(r)),
                    onChange:e=>setRateInputs(p=>({...p,[r]:e.target.value})),
                    style:{width:80,padding:"5px 8px",borderRadius:6,border:"1px solid "+(active?"#5B7FFF":"#2E3450"),background:"#1E2333",color:"#E8ECF8",fontSize:13,fontWeight:700}}),
                  active&&R("button",{className:"btn btn-sm btn-green",onClick:()=>saveRate(r)},"Save")
                )
              );
            })
          )
        )
      )
    )
  );
}
