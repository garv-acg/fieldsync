function timeAgo(ts){
  if(!ts||ts==="Just now")return"Just now";
  const diff=Date.now()-new Date(ts).getTime();
  if(isNaN(diff)||diff<0)return"Just now";
  const m=Math.floor(diff/60000),h=Math.floor(diff/3600000),d=Math.floor(diff/86400000);
  if(m<1)return"Just now";
  if(m<60)return m+"m ago";
  if(h<24)return h+"h ago";
  if(d<7)return d+"d ago";
  return new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

function NotifsView({notifs,setNotifs}){
  const markAllRead=()=>{
    setNotifs(p=>p.map(n=>({...n,read:true})));
    notifs.filter(n=>!n.read).forEach(n=>swrite(sb.from('notifications').update({read:true}).eq('id',n.id)));
  };
  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Notifications")),R("button",{className:"btn btn-sm",onClick:markAllRead},"Mark all read")),
    R("div",{className:"card"},notifs.length===0?R("div",{className:"empty"},"No notifications."):notifs.map(n=>R("div",{key:n.id,style:{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid #2E3450",opacity:n.read?.6:1}},
      R("div",{style:{width:8,height:8,borderRadius:"50%",background:n.type==="warn"?"#E05555":n.type==="success"?"#3DBA7B":"#4F7EF7",flexShrink:0,marginTop:5}}),
      R("div",{style:{flex:1}},n.msg,R("div",{style:{fontSize:11,color:"#6B7394",marginTop:2}},timeAgo(n.time)))
    )))
  );
}
