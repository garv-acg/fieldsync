function AvailView({user,workers,updAvail,updYears}){
  const w=workers.find(x=>x.id===user.id);
  const[sel,setSel]=useState(w?w.avail:[]);
  const[yrs,setYrs]=useState(w?.yearsExp||0);
  const[saved,setSaved]=useState(false);
  const tog=d=>{setSel(p=>p.includes(d)?p.filter(x=>x!==d):[...p,d]);setSaved(false)};
  const expLabel=user.role==="umpire"?"Years umpiring":user.role==="field"?"Years on field crew":"Years working concessions";
  const save=()=>{updAvail(user.id,sel);updYears(user.id,yrs);setSaved(true);setTimeout(()=>setSaved(false),2000)};
  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"My Profile"),R("p",null,"Experience & availability — used by the auto-scheduler"))),
    R("div",{className:"card"},
      R("div",{style:{marginBottom:20}},
        R("label",{style:{display:"block",fontWeight:700,fontSize:13,marginBottom:6,color:"#C8D0E8"}},expLabel),
        R("div",{style:{display:"flex",alignItems:"center",gap:10}},
          R("input",{
            type:"number",min:0,max:50,
            value:yrs,
            onChange:e=>setYrs(Number(e.target.value)),
            style:{width:80,padding:"6px 10px",borderRadius:8,border:"1px solid #2E3450",background:"#1E2333",color:"#E8ECF8",fontSize:15,fontWeight:700}
          }),
          R("span",{style:{color:"#9BA3BF",fontSize:13}},"years")
        )
      ),
      R("p",{style:{color:"#9BA3BF",fontSize:13,marginBottom:12}},"Tap each day you're available to work."),
      R("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,marginBottom:16}},WDAYS.map(d=>{
        const on=sel.includes(d);
        return R("div",{key:d,onClick:()=>tog(d),style:{border:"1px solid "+(on?"#4F7EF7":"#2E3450"),background:on?"#1A2550":"#1E2333",borderRadius:10,padding:"12px 6px",textAlign:"center",cursor:"pointer",fontWeight:700,fontSize:12,color:on?"#A8C0FC":"#6B7394"}},d);
      })),
      R("button",{className:"btn btn-blue",style:{padding:"8px 20px"},onClick:save},saved?"Saved!":"Save profile")
    )
  );
}