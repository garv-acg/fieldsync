function NotifsView({notifs,setNotifs}){
  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Notifications")),R("button",{className:"btn btn-sm",onClick:()=>setNotifs(p=>p.map(n=>({...n,read:true})))},"Mark all read")),
    R("div",{className:"card"},notifs.length===0?R("div",{className:"empty"},"No notifications."):notifs.map(n=>R("div",{key:n.id,style:{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid #2E3450",opacity:n.read?.6:1}},
      R("div",{style:{width:8,height:8,borderRadius:"50%",background:n.type==="warn"?"#E05555":n.type==="success"?"#3DBA7B":"#4F7EF7",flexShrink:0,marginTop:5}}),
      R("div",{style:{flex:1}},n.msg,R("div",{style:{fontSize:11,color:"#6B7394",marginTop:2}},n.time))
    )))
  );
}
