function StaffView(sp){
  const[tab,setTab]=useState("umpires");
  const tabs=[{id:"umpires",label:"Umpires",badge:sp.conf.length},{id:"workers",label:"Workers"},{id:"timeoff",label:"Time Off"}];
  return R("div",null,
    R("div",{style:{display:"flex",gap:4,padding:"16px 20px 0",borderBottom:"1px solid #2E3450"}},
      tabs.map(t=>R("div",{key:t.id,onClick:()=>setTab(t.id),style:{padding:"10px 18px",cursor:"pointer",fontWeight:600,fontSize:13,borderBottom:tab===t.id?"2px solid #5B7FFF":"2px solid transparent",color:tab===t.id?"#E8ECF8":"#6B7394",display:"flex",alignItems:"center",gap:6}},
        t.label,t.badge>0&&R("span",{className:"nav-badge"},t.badge)
      ))
    ),
    tab==="umpires"&&R(UmpsView,{...sp,hidePage:true}),
    tab==="workers"&&R(WorkersView,sp),
    tab==="timeoff"&&R(TimeOffView,sp)
  );
}
