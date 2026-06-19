function UmpSlots({game,workers,setUmp}){
  const d2=isDual(game.division);
  const opts=[{v:NONE,l:"None"},...workers.filter(w=>hasRole(w,"umpire")).map(w=>({v:w.id,l:w.name}))];
  return R("div",{style:{marginTop:8}},
    R("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4}},
      R("span",{style:{fontSize:11,color:"#6B7394",fontWeight:700,width:44}},"UMP 1"),
      R("select",{className:"inline-sel",value:game.ump1||NONE,onChange:e=>setUmp(game.id,"ump1",parseInt(e.target.value))},opts.map(u=>R("option",{key:u.v,value:u.v},u.l)))
    ),
    d2&&R("div",{style:{display:"flex",alignItems:"center",gap:8}},
      R("span",{style:{fontSize:11,color:"#6B7394",fontWeight:700,width:44}},"UMP 2"),
      R("select",{className:"inline-sel",value:game.ump2||NONE,onChange:e=>setUmp(game.id,"ump2",parseInt(e.target.value))},opts.map(u=>R("option",{key:u.v,value:u.v},u.l)))
    )
  );
}
function CrewPanel({date,locId,da,workers,updDA,updSnackShackOpen,loc}){
  const k=dk(date,locId),d=da[k]||{fieldCrew:[],concessions:[]};
  const ssOpen=d.snackShackOpen??true;
  const fw=workers.filter(w=>hasRole(w,"field")),cw=workers.filter(w=>hasRole(w,"concessions"));
  const tog=(role,wId)=>{
    const curr=[...((role==="fieldCrew"?d.fieldCrew:d.concessions)||[])];
    const next=curr.includes(wId)?curr.filter(x=>x!==wId):[...curr,wId];
    if(role==="fieldCrew"&&next.length>FC)return;
    if(role==="concessions"&&next.length>3)return;
    updDA(date,locId,role,next);
  };
  return R("div",{style:{background:"#1E2333",border:"1px solid #2E3450",borderRadius:8,padding:"10px 12px",marginTop:8}},
    R("div",{style:{marginBottom:loc?.hasSnackShack?8:0}},
      R("div",{style:{fontSize:11,color:"#6B7394",fontWeight:700,marginBottom:5,textTransform:"uppercase"}},"Field crew ("+(d.fieldCrew||[]).length+"/"+FC+")"),
      R("div",{style:{display:"flex",gap:5,flexWrap:"wrap"}},fw.map(w=>{const sel=(d.fieldCrew||[]).includes(w.id),av=wa(w,date,null,"field");return R("button",{key:w.id,className:"btn btn-sm"+(sel?" btn-blue":""),style:{opacity:av?1:.3,fontSize:11},disabled:!av&&!sel,onClick:()=>tog("fieldCrew",w.id)},w.name.split(" ")[0])}))
    ),
    loc?.hasSnackShack&&R("div",null,
      R("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:5}},
        R("div",{style:{fontSize:11,color:"#6B7394",fontWeight:700,textTransform:"uppercase"}},ssOpen?"Snack shack ("+(d.concessions||[]).length+"/3)":"Snack shack"),
        R("button",{
          className:"btn btn-sm",
          style:ssOpen?{fontSize:10,padding:"2px 8px",background:"#13311F",color:"#7DDBA8",border:"1px solid #3DBA7B"}:{fontSize:10,padding:"2px 8px",background:"#3D2E10",color:"#F0C060",border:"1px solid #E0A030"},
          onClick:()=>updSnackShackOpen(date,locId,!ssOpen)
        },ssOpen?"Open":"Closed — tap to open")
      ),
      ssOpen
        ? R("div",{style:{display:"flex",gap:5,flexWrap:"wrap"}},cw.map(w=>{const sel=(d.concessions||[]).includes(w.id),av=wa(w,date,null,"concessions");return R("button",{key:w.id,className:"btn btn-sm"+(sel?" btn-blue":""),style:{opacity:av?1:.3,fontSize:11},disabled:!av&&!sel,onClick:()=>tog("concessions",w.id)},w.name.split(" ")[0])}))
        : R("div",{style:{fontSize:11,color:"#F0C060"}},"Closed today")
    )
  );
}
function RsvpBtns({wId,date,locId,getRsvp,setRsvpStatus}){
  const rs=getRsvp(wId,date,locId);
  return R("div",{className:"rsvp-row"},
    R("button",{className:"rsvp-btn rsvp-y"+(rs==="confirmed"?" on":""),onClick:()=>setRsvpStatus(wId,date,locId,"confirmed")},rs==="confirmed"?"✓ Confirmed":"Confirm — I'll be there"),
    R("button",{className:"rsvp-btn rsvp-n"+(rs==="declined"?" on":""),onClick:()=>setRsvpStatus(wId,date,locId,"declined")},rs==="declined"?"✗ Can't make it":"Can't make it")
  );
}
function Login({onLogin}){
  const[email,setE]=useState(""),[ pass,setP]=useState(""),[ tab,setTab]=useState("admin"),[err,setErr]=useState("");
  const go=()=>{
    if(tab==="admin"){if(email==="manager@field.com"&&pass==="admin")onLogin({id:0,name:"Field Manager",role:"overseer"});else setErr("manager@field.com / admin")}
    else{const w=WORKERS.find(w=>w.email===email&&w.password===pass);if(w)onLogin(w);else setErr("Try jordan@crew.com / ump")}
  };
  return R("div",{className:"login-wrap"},R("div",{className:"login-card"},
    R("div",{style:{textAlign:"center",marginBottom:24}},
      R("div",{style:{fontWeight:800,fontSize:22}},"Field",R("span",{style:{color:"#4F7EF7"}},"Sync")),
      R("p",{style:{color:"#9BA3BF",fontSize:13,marginTop:6}},"Workforce & Game Scheduling")
    ),
    R("div",{style:{display:"flex",gap:4,marginBottom:18}},
      R("button",{className:"btn"+(tab==="admin"?" btn-blue":""),style:{flex:1,justifyContent:"center"},onClick:()=>{setTab("admin");setErr("")}},"Admin"),
      R("button",{className:"btn"+(tab==="worker"?" btn-blue":""),style:{flex:1,justifyContent:"center"},onClick:()=>{setTab("worker");setErr("")}},"Worker")
    ),
    R("div",{className:"form-group"},R("label",{className:"form-label"},"Email"),R("input",{className:"form-input",type:"email",value:email,onChange:e=>setE(e.target.value),placeholder:tab==="admin"?"manager@field.com":"jordan@crew.com"})),
    R("div",{className:"form-group"},R("label",{className:"form-label"},"Password"),R("input",{className:"form-input",type:"password",value:pass,onChange:e=>setP(e.target.value),placeholder:tab==="admin"?"admin":"ump",onKeyDown:e=>e.key==="Enter"&&go()})),
    err&&R("div",{style:{color:"#F09090",fontSize:12,marginBottom:12}},err),
    R("button",{className:"btn btn-blue",style:{width:"100%",justifyContent:"center",padding:"10px"},onClick:go},"Sign in"),
    R("p",{style:{color:"#6B7394",fontSize:11,textAlign:"center",marginTop:12}},tab==="admin"?"manager@field.com / admin":"jordan@crew.com/ump · alex@crew.com/field · casey@crew.com/conc")
  ));
}
