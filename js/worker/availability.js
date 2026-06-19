function AvailView({user,workers,updAvailByRole,updYears,updPhone}){
  const w=workers.find(x=>x.id===user.id);
  const myRoles=(w?.roles&&w.roles.length)?w.roles:(user.roles&&user.roles.length)?user.roles:[w?.role||user.role];
  const[activeRole,setActiveRole]=useState(myRoles[0]);
  const[yrs,setYrs]=useState(w?.yearsExp||0);
  const[phone,setPhone]=useState(w?.phone||"");
  const[saved,setSaved]=useState(false);

  // Per-role availability state
  const initAvail=role=>(w?.availByRole&&w.availByRole[role])||w?.avail||[];
  const[selByRole,setSelByRole]=useState(()=>{const o={};myRoles.forEach(r=>{o[r]=initAvail(r)});return o});

  const tog=d=>setSelByRole(p=>({...p,[activeRole]:p[activeRole].includes(d)?p[activeRole].filter(x=>x!==d):[...p[activeRole],d]}));

  const save=()=>{
    myRoles.forEach(r=>updAvailByRole(user.id,r,selByRole[r]));
    updYears(user.id,yrs);
    updPhone(user.id,phone);
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const ROLE_META={
    umpire:{label:"Umpire",sub:"Days you're available to umpire games",expLabel:"Years umpiring"},
    field:{label:"Field Crew",sub:"Days you're available for field crew duty",expLabel:"Years on field crew"},
    concessions:{label:"Concessions",sub:"Days you're available to work the snack shack",expLabel:"Years working concessions"},
  };

  const sel=selByRole[activeRole]||[];

  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"My Profile"),R("p",null,"Experience, contact info & per-role availability"))),

    // ── Top card: experience + phone ──
    R("div",{className:"card",style:{marginBottom:16}},
      R("div",{style:{display:"flex",gap:32,flexWrap:"wrap",marginBottom:20}},
        R("div",null,
          R("label",{style:{display:"block",fontWeight:700,fontSize:13,marginBottom:6,color:"#C8D0E8"}},
            ROLE_META[user.role]?.expLabel||"Years of experience"
          ),
          R("div",{style:{display:"flex",alignItems:"center",gap:10}},
            R("input",{type:"number",min:0,max:50,value:yrs,onChange:e=>setYrs(Number(e.target.value)),
              style:{width:80,padding:"6px 10px",borderRadius:8,border:"1px solid #2E3450",background:"#1E2333",color:"#E8ECF8",fontSize:15,fontWeight:700}}),
            R("span",{style:{color:"#9BA3BF",fontSize:13}},"years")
          )
        ),
        R("div",null,
          R("label",{style:{display:"block",fontWeight:700,fontSize:13,marginBottom:6,color:"#C8D0E8"}},"Phone number"),
          R("input",{type:"tel",value:phone,onChange:e=>setPhone(e.target.value),placeholder:"+15551234567",
            style:{width:200,padding:"6px 10px",borderRadius:8,border:"1px solid #2E3450",background:"#1E2333",color:"#E8ECF8",fontSize:14}}),
          R("div",{style:{fontSize:11,color:"#6B7394",marginTop:4}},"For SMS reminders — include country code (+1 for US)")
        )
      )
    ),

    // ── Availability card with role tabs ──
    R("div",{className:"card"},
      R("div",{style:{display:"flex",gap:0,borderBottom:"1px solid #2E3450",marginBottom:20}},
        myRoles.map(r=>R("div",{key:r,onClick:()=>setActiveRole(r),style:{
          padding:"10px 18px",cursor:"pointer",fontWeight:600,fontSize:13,
          borderBottom:activeRole===r?"2px solid #5B7FFF":"2px solid transparent",
          color:activeRole===r?"#E8ECF8":"#6B7394",
          display:"flex",alignItems:"center",gap:6,
        }},
          R("span",{className:"badge "+rb(r),style:{fontSize:10,padding:"1px 6px"}},ROLE_META[r]?.label||rl(r)),
          R("span",{style:{fontSize:11,color:"#6B7394",marginLeft:2}},
            (selByRole[r]||[]).length+"/7 days"
          )
        ))
      ),
      R("div",{style:{fontSize:13,color:"#9BA3BF",marginBottom:14}},ROLE_META[activeRole]?.sub||""),
      R("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,marginBottom:20}},
        WDAYS.map(d=>{
          const on=sel.includes(d);
          return R("div",{key:d,onClick:()=>tog(d),style:{
            border:"1px solid "+(on?"#4F7EF7":"#2E3450"),
            background:on?"#1A2550":"#1E2333",
            borderRadius:10,padding:"12px 6px",textAlign:"center",
            cursor:"pointer",fontWeight:700,fontSize:12,
            color:on?"#A8C0FC":"#6B7394",
          }},d);
        })
      ),
      R("button",{className:"btn btn-blue",style:{padding:"8px 20px"},onClick:save},
        saved?"✓ Saved!":"Save profile"
      )
    )
  );
}
