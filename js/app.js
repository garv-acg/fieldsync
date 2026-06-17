function getDragger(date,locId,da,workers,overrides){
  const k=dk(date,locId);
  if(overrides&&overrides[k]!=null)return overrides[k];
  const crew=(da[k]||{}).fieldCrew||[];
  if(!crew.length)return null;
  const sorted=[...crew].sort((a,b)=>{
    const wa=workers.find(w=>w.id===a),wb=workers.find(w=>w.id===b);
    return (wb?.yearsExp||0)-(wa?.yearsExp||0);
  });
  return sorted[0];
}

function App(){
  const[user,setUser]=useState(null),[view,setView]=useState("dashboard"),[locs,setLocs]=useState(LOCS),[workers,setWorkers]=useState(WORKERS),[games,setGames]=useState(INIT_GAMES),[da,setDA]=useState(INIT_DA),[pub,setPub]=useState(INIT_PUB),[rsvp,setRsvp]=useState(INIT_RSVP),[requests,setRequests]=useState(INIT_REQUESTS),[notifs,setNotifs]=useState(INIT_NOTIFS),[modal,setModal]=useState(null),[toast,setToast]=useState(null),[draggerOverrides,setDraggerOverrides]=useState({});
  const showToast=(msg,type)=>{setToast({msg,type:type||"info"});setTimeout(()=>setToast(null),3000)};
  const conf=useMemo(()=>detConf(games,workers,da),[games,workers,da]);
  const runAuto=()=>{const r=autoSched(games,workers,da);setGames(r.games);setDA(r.da);showToast("Auto-schedule complete","s")};
  const swapUmps=(aGid,aSlot,bGid,bSlot)=>{setGames(p=>{const wA=p.find(g=>g.id===aGid)?.[aSlot],wB=p.find(g=>g.id===bGid)?.[bSlot];return p.map(g=>{if(g.id===aGid)return{...g,[aSlot]:wB};if(g.id===bGid)return{...g,[bSlot]:wA};return g})});showToast("Umpires swapped","s")};
  const isPub=date=>pub.has(wkKey(date));
  const pubWeek=ws=>{
    setPub(p=>{const n=new Set(p);n.add(ws);return n});
    const aff=new Set();
    games.filter(g=>wkKey(g.date)===ws).forEach(g=>{[g.ump1,g.ump2].forEach(u=>{if(u&&u!==NONE)aff.add(u)})});
    Object.entries(da).filter(([k])=>wkKey(k.split("|")[0])===ws).forEach(([,v])=>{(v.fieldCrew||[]).forEach(u=>aff.add(u));(v.concessions||[]).forEach(u=>aff.add(u))});
    setNotifs(p=>[...[...aff].map(wId=>({id:Date.now()+wId,workerId:wId,msg:"Schedule published for week of "+ws+" — check your shifts.",time:"Just now",read:false,type:"info"})),...p]);
    showToast("Week published — "+aff.size+" workers notified","s");
  };
  const unpubWeek=ws=>{setPub(p=>{const n=new Set(p);n.delete(ws);return n});showToast("Moved back to draft")};

  // RSVP — fires manager notification on decline, with shift detail and available replacements
  const setRsvpStatus=(wId,date,locId,status)=>{
    setRsvp(p=>({...p,[rsvpKey(wId,date,locId)]:status}));
    if(status==="declined"){
      const w=workers.find(x=>x.id===wId),loc=locs.find(l=>l.id===locId);
      const game=games.find(g=>g.date===date&&g.locId===locId&&(g.ump1===wId||g.ump2===wId));
      let what;
      if(game){
        const slot=game.ump1===wId?"Ump 1":"Ump 2",oppo=(game.away||game.home)?(game.away+" vs "+game.home):"";
        what=game.division+" ("+slot+") "+game.time+" · "+game.field+(oppo?" — "+oppo:"");
      } else {
        what=rl(w?.role||"field")+" shift";
      }
      // Find same-role workers available that day who aren't already assigned anywhere
      const replacements=workers.filter(w2=>{
        if(w2.role!==w?.role||w2.id===wId)return false;
        if(!wa(w2,date))return false;
        if(w?.role==="umpire"){
          return!games.some(g2=>g2.status==="scheduled"&&g2.date===date&&(g2.ump1===w2.id||g2.ump2===w2.id));
        }
        return!Object.entries(da).some(([k,v])=>k.split("|")[0]===date&&((v.fieldCrew||[]).includes(w2.id)||(v.concessions||[]).includes(w2.id)));
      });
      const replText=replacements.length?"Available to cover: "+replacements.map(r=>r.name).join(", "):"No one else appears available that day.";
      setNotifs(p=>[{id:Date.now(),workerId:0,msg:"⚠ "+( w?.name||"A worker")+" declined "+what+" on "+date+" at "+(loc?.name||locId)+". "+replText,time:"Just now",read:false,type:"warn"},...p]);
    }
    showToast(status==="confirmed"?"Confirmed!":"Marked can't make it — manager notified",status==="confirmed"?"s":"w");
  };
  const getRsvp=(wId,date,locId)=>rsvp[rsvpKey(wId,date,locId)]||null;

  const addGame=g=>{setGames(p=>[...p,{...g,id:Date.now(),status:"scheduled",ump1:NONE,ump2:NONE}]);showToast("Game added","s");setModal(null)};
  const editGame=g=>{setGames(p=>p.map(x=>x.id===g.id?{...x,...g}:x));showToast("Updated","s");setModal(null)};
  const delGame=id=>{setGames(p=>p.filter(x=>x.id!==id));showToast("Removed");setModal(null)};
  const setGS=(id,s)=>setGames(p=>p.map(g=>g.id===id?{...g,status:s}:g));
  const setUmp=(gid,slot,wId)=>setGames(p=>p.map(g=>g.id===gid?{...g,[slot]:wId}:g));
  const rainout=(date,locId)=>{
    setGames(p=>p.map(g=>g.date===date&&g.locId===locId?{...g,status:"cancelled"}:g));
    const aff=new Set();
    games.filter(g=>g.date===date&&g.locId===locId).forEach(g=>{[g.ump1,g.ump2].forEach(u=>{if(u&&u!==NONE)aff.add(u)})});
    const loc=locs.find(l=>l.id===locId),d2=da[dk(date,locId)]||{};
    (d2.fieldCrew||[]).forEach(u=>aff.add(u));(d2.concessions||[]).forEach(u=>aff.add(u));
    setNotifs(p=>[...[...aff].map(wId=>({id:Date.now()+wId,workerId:wId,msg:"RAINOUT: "+date+" at "+(loc?.name||locId)+" — all games cancelled.",time:"Just now",read:false,type:"warn"})),...p]);
    showToast("Rainout — "+aff.size+" workers notified","w");setModal(null);
  };
  const updDA=(date,locId,role,arr)=>{const k=dk(date,locId);setDA(p=>({...p,[k]:{...(p[k]||{fieldCrew:[],concessions:[]}),[role]:arr}}))};

  // Send an in-app reminder notification to every worker scheduled on a given date
  const sendReminders=(date)=>{
    const aff=new Set();
    games.filter(g=>g.date===date&&g.status==="scheduled").forEach(g=>{[g.ump1,g.ump2].forEach(u=>{if(u&&u!==NONE)aff.add(u)})});
    Object.entries(da).filter(([k])=>k.split("|")[0]===date).forEach(([,v])=>{(v.fieldCrew||[]).forEach(u=>aff.add(u));(v.concessions||[]).forEach(u=>aff.add(u))});
    setNotifs(p=>[...[...aff].map(wId=>({id:Date.now()+wId,workerId:wId,msg:"🔔 Reminder: you're scheduled on "+date+" — check My Shifts for details.",time:"Just now",read:false,type:"info"})),...p]);
    showToast(aff.size>0?"Reminders sent to "+aff.size+" worker"+(aff.size>1?"s":""):"No one scheduled that day",aff.size>0?"s":"info");
  };

  // Update a worker's years of experience
  const updYears=(wId,years)=>{setWorkers(p=>p.map(w=>w.id===wId?{...w,yearsExp:Number(years)}:w));showToast("Experience updated","s")};

  // Manually override the dragger for a given date+location
  const setDraggerOverride=(date,locId,wId)=>{
    const k=dk(date,locId);
    setDraggerOverrides(p=>({...p,[k]:wId}));
    showToast("Dragger updated","s");
  };

  // Offer up a shift — creates a shift_offer request visible to same-role workers
  const offerShift=(wId,date,locId,role,label)=>{
    setRequests(p=>[{id:Date.now(),type:"shift_offer",workerId:wId,date,locId,role,label,claimedBy:null,status:"pending",created:new Date().toISOString().slice(0,10)},...p]);
    showToast("Shift offered up — teammates can now claim it");
  };

  // Claim an offered shift — manager sees it in requests and approves/denies
  const claimShift=(reqId,claimerId)=>{
    setRequests(p=>p.map(r=>r.id===reqId?{...r,claimedBy:claimerId,status:"pending_approval"}:r));
    const req=requests.find(r=>r.id===reqId),claimer=workers.find(w=>w.id===claimerId),offerer=workers.find(w=>w.id===req?.workerId),loc=locs.find(l=>l.id===req?.locId);
    setNotifs(p=>[{id:Date.now(),workerId:0,msg:"🔄 "+claimer?.name+" wants to take "+offerer?.name+"'s shift on "+req?.date+" at "+(loc?.name||"?")+" — approve in Requests.",time:"Just now",read:false,type:"info"},...p]);
    showToast("Claim submitted — waiting for manager approval");
  };

  // Approve/deny a shift offer claim
  const handleReq=(id,action)=>{
    const req=requests.find(r=>r.id===id);
    if(req?.type==="shift_offer"&&action==="approved"&&req.claimedBy){
      if(req.role==="umpire"){
        setGames(p=>p.map(g=>{
          if(g.date!==req.date||g.locId!==req.locId)return g;
          if(g.ump1===req.workerId)return{...g,ump1:req.claimedBy};
          if(g.ump2===req.workerId)return{...g,ump2:req.claimedBy};
          return g;
        }));
      } else {
        const k=dk(req.date,req.locId);
        setDA(p=>{const d={...(p[k]||{fieldCrew:[],concessions:[]})};const roleKey=req.role==="field"?"fieldCrew":"concessions";d[roleKey]=(d[roleKey]||[]).map(id=>id===req.workerId?req.claimedBy:id);return{...p,[k]:d}});
      }
      const claimer=workers.find(w=>w.id===req.claimedBy),loc=locs.find(l=>l.id===req.locId);
      setNotifs(p=>[
        {id:Date.now(),  workerId:req.claimedBy,msg:"✅ Your claim for "+req.date+" at "+(loc?.name||"?")+" was approved — you're on the schedule.",time:"Just now",read:false,type:"success"},
        {id:Date.now()+1,workerId:req.workerId, msg:"✅ "+claimer?.name+" is covering your shift on "+req.date+" at "+(loc?.name||"?")+".",time:"Just now",read:false,type:"success"},
        ...p
      ]);
    } else {
      if(req?.type==="shift_offer"&&action==="denied"&&req.claimedBy){
        const claimer=workers.find(w=>w.id===req.claimedBy),loc=locs.find(l=>l.id===req.locId);
        setNotifs(p=>[{id:Date.now(),workerId:req.claimedBy,msg:"❌ Your claim for "+req.date+" at "+(loc?.name||"?")+" was denied.",time:"Just now",read:false,type:"warn"},...p]);
      }
    }
    setRequests(p=>p.map(r=>r.id===id?{...r,status:action==="approved"?"approved":"denied"}:r));
    showToast("Request "+action,action==="approved"?"s":"info");
  };

  const subReq=req=>{setRequests(p=>[{...req,id:Date.now(),status:"pending",created:new Date().toISOString().slice(0,10)},...p]);showToast("Request submitted");setModal(null)};
  const addLoc=loc=>{setLocs(p=>[...p,{...loc,id:Date.now().toString()}]);showToast("Location added","s");setModal(null)};
  const addField=(lid,f)=>{setLocs(p=>p.map(l=>l.id===lid?{...l,fields:[...l.fields,f]}:l));showToast("Field added");setModal(null)};
  const updAvail=(wId,avail)=>{setWorkers(p=>p.map(w=>w.id===wId?{...w,avail}:w));showToast("Saved","s")};
  const importCSV=csv=>{
    const lines=csv.trim().split("\n"),ng=[];
    for(let i=1;i<lines.length;i++){const c=lines[i].split(",").map(x=>x.replace(/"/g,"").trim());if(c.length<5)continue;ng.push({id:Date.now()+i,locId:c[0].toLowerCase().includes("spring")?"sc":"mv",field:c[1]||"Field 1",division:normDiv(c[2]),date:c[3],time:c[4]||"9:00 AM",home:c[6]||"",away:c[5]||"",status:"scheduled",ump1:NONE,ump2:NONE})}
    setGames(p=>[...p,...ng]);showToast("Imported "+ng.length+" games","s");setModal(null);
  };

  if(!user)return R(Login,{onLogin:u=>{setUser(u);setView(u.role==="overseer"?"today":"worker_home")}});
  const myNotifs=user.role==="overseer"?notifs:notifs.filter(n=>n.workerId===user.id||n.workerId===0&&false);
  const unread=myNotifs.filter(n=>!n.read).length,pendingR=requests.filter(r=>r.status==="pending"||r.status==="pending_approval").length;
  const adminNav=[{id:"today",label:"Today"},{id:"dashboard",label:"Dashboard"},{id:"schedule",label:"Schedule"},{id:"games",label:"Games"},{id:"umpires",label:"Umpires",badge:conf.length},{id:"workers",label:"Workers"},{id:"requests",label:"Requests",badge:pendingR},{id:"timeoff",label:"Time Off"},{id:"locations",label:"Locations"},{id:"reports",label:"Reports"},{id:"notifications",label:"Notifications",badge:unread}];
  const workerNav=[{id:"worker_home",label:"Home"},{id:"my_shifts",label:"My shifts"},{id:"my_requests",label:"Requests"},{id:"availability",label:"My Profile"},{id:"notifications",label:"Notifications",badge:unread}];
  const nav=user.role==="overseer"?adminNav:workerNav;
  const sp={user,locs,workers,games,da,pub,rsvp,requests,notifs:myNotifs,conf,draggerOverrides,getDragger:(date,locId)=>getDragger(date,locId,da,workers,draggerOverrides),runAuto,swapUmps,setModal,isPub,pubWeek,unpubWeek,setRsvpStatus,getRsvp,setUmp,rainout,updDA,setGS,handleReq,addLoc,addField,updAvail,subReq,setNotifs,showToast,addGame,editGame,delGame,importCSV,offerShift,claimShift,updYears,setDraggerOverride,sendReminders};
  return R("div",{className:"app"},
    R("div",{className:"topbar"},
      R("div",{className:"logo"},"Field",R("span",null,"Sync")),
      R("div",{style:{display:"flex",alignItems:"center",gap:12}},
        conf.length>0&&R("span",{style:{background:"#3D1A1A",color:"#F09090",border:"1px solid #E05555",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer"},onClick:()=>setView("umpires")},"⚠ "+conf.length+" conflict"+(conf.length>1?"s":"")),
        unread>0&&R("span",{className:"badge b-amber"},unread+" new"),
        R("span",{className:"badge "+(user.role==="overseer"?"b-blue":"b-green")},user.role==="overseer"?"Admin":rl(user.role)),
        R("span",{style:{fontSize:13,fontWeight:600}},user.name),
        R("button",{className:"btn btn-sm",onClick:()=>setUser(null)},"Sign out")
      )
    ),
    R("div",{className:"layout"},
      R("div",{className:"sidebar"},
        nav.map(item=>R("div",{key:item.id,className:"nav-item"+(view===item.id?" active":""),onClick:()=>setView(item.id)},item.label,item.badge>0&&R("span",{className:"nav-badge"},item.badge))),
        R("div",{className:"nav-bottom"},R("div",{className:"nav-item",onClick:()=>exportCSV(games,locs,da,workers)},"↓ Export CSV"))
      ),
      R("div",{className:"content"},
        view==="today"&&R(TodayView,sp),view==="dashboard"&&R(DashView,sp),view==="schedule"&&R(SchedView,sp),view==="games"&&R(GamesView,sp),
        view==="umpires"&&R(UmpsView,sp),view==="workers"&&R(WorkersView,sp),view==="requests"&&R(ReqsView,sp),view==="timeoff"&&R(TimeOffView,sp),
        view==="locations"&&R(LocsView,sp),view==="reports"&&R(ReportsView,sp),view==="notifications"&&R(NotifsView,sp),
        view==="worker_home"&&R(WHome,sp),view==="my_shifts"&&R(MyShifts,sp),view==="my_requests"&&R(MyReqs,sp),view==="availability"&&R(AvailView,sp)
      )
    ),
    modal&&R(ModalRouter,{...sp,modal,onClose:()=>setModal(null)}),
    toast&&R("div",{className:"toast "+(toast.type==="s"?"toast-s":toast.type==="w"?"toast-w":"")},toast.msg)
  );
}
ReactDOM.render(R(App),document.getElementById("root"));