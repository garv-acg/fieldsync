function getDragger(date,locId,da,workers,overrides,requests){
  const k=dk(date,locId);
  if(overrides&&overrides[k]!=null)return overrides[k];
  const crew=(da[k]||{}).fieldCrew||[];
  if(!crew.length)return null;
  const reqs=requests||[];
  const sorted=[...crew].sort((a,b)=>{
    const wa=workers.find(w=>w.id===a),wb=workers.find(w=>w.id===b);
    return (wb?.yearsExp||0)-(wa?.yearsExp||0);
  });
  // Skip anyone with approved time off that day
  const available=sorted.filter(id=>{
    const w=workers.find(x=>x.id===id);
    return w&&wa(w,date,reqs);
  });
  return available[0]??sorted[0];
}

// ── Supabase row <-> app shape converters ──────────────────────────
function rowToWorker(r){return{id:r.id,name:r.name,email:r.email,password:r.password,role:r.role,avail:r.avail||[],availByRole:r.avail_by_role||{},yearsExp:r.years_exp||0,phone:r.phone||"",roles:r.roles||null,payRates:r.pay_rates||{}}}
function rowToLoc(r){const seed=LOCS.find(l=>l.id===r.id);return{id:r.id,name:r.name,fields:r.fields||[],hasSnackShack:seed?.hasSnackShack??false}}
function rowToGame(r){return{id:r.id,locId:r.loc_id,field:r.field,division:r.division,date:r.date,time:r.time,home:r.home,away:r.away,status:r.status,ump1:r.ump1==null?NONE:r.ump1,ump2:r.ump2==null?NONE:r.ump2}}
function rowToReq(r){return{id:r.id,type:r.type,workerId:r.worker_id,date:r.date,dateStart:r.date_start,dateEnd:r.date_end,locId:r.loc_id,role:r.role,label:r.label,reason:r.reason,claimedBy:r.claimed_by,status:r.status,created:r.created}}
function rowToNotif(r){return{id:r.id,workerId:r.worker_id,msg:r.msg,time:r.time,read:r.read,type:r.type}}

// Fire-and-forget Supabase write with console visibility on failure
function swrite(promise){promise.then(({error})=>{if(error)console.error("Supabase write failed:",error)})}

function App(){
  const[user,setUser]=useState(null),[view,setView]=useState("today"),[locs,setLocs]=useState([]),[workers,setWorkers]=useState([]),[games,setGames]=useState([]),[da,setDA]=useState({}),[pub,setPub]=useState(new Set()),[rsvp,setRsvp]=useState({}),[requests,setRequests]=useState([]),[notifs,setNotifs]=useState([]),[modal,setModal]=useState(null),[toast,setToast]=useState(null),[draggerOverrides,setDraggerOverrides]=useState({}),[loaded,setLoaded]=useState(false);
  const[payConfig,setPayConfig]=useState(()=>{try{const s=localStorage.getItem('fsPayConfig');return s?JSON.parse(s):PAY_DEFAULTS}catch{return PAY_DEFAULTS}});
  const applyPayConfig=cfg=>{setPayConfig(cfg);try{localStorage.setItem('fsPayConfig',JSON.stringify(cfg))}catch{}};
  const[lockedWeeks,setLockedWeeks]=useState(new Set());

  // ── Initial load from Supabase + realtime subscriptions for multi-device sync ──
  React.useEffect(()=>{
    (async()=>{
      const[w,l,g,d,p,r,rq,n,dr]=await Promise.all([
        sb.from('workers').select('*'),
        sb.from('locations').select('*'),
        sb.from('games').select('*'),
        sb.from('day_assignments').select('*'),
        sb.from('published_weeks').select('*'),
        sb.from('rsvps').select('*'),
        sb.from('requests').select('*'),
        sb.from('notifications').select('*'),
        sb.from('dragger_overrides').select('*'),
      ]);
      setWorkers((w.data||[]).map(rowToWorker));
      setLocs((l.data||[]).map(rowToLoc));
      setGames((g.data||[]).map(rowToGame));
      const ndaMap={};(d.data||[]).forEach(row=>{ndaMap[row.date+"|"+row.loc_id]={fieldCrew:row.field_crew||[],concessions:row.concessions||[],concessionsHours:row.concessions_hours||{},concessionsShifts:row.concessions_shifts||{},snackShackOpen:row.snack_shack_open??true}});
      setDA(ndaMap);
      setPub(new Set((p.data||[]).map(row=>row.week_key)));
      const rsvpMap={};(r.data||[]).forEach(row=>{rsvpMap[row.worker_id+"_"+row.date+"_"+row.loc_id]=row.status});
      setRsvp(rsvpMap);
      setRequests((rq.data||[]).map(rowToReq));
      setNotifs((n.data||[]).map(rowToNotif));
      const drMap={};(dr.data||[]).forEach(row=>{drMap[row.date+"|"+row.loc_id]=row.worker_id});
      setDraggerOverrides(drMap);
      // Load pay config from Supabase (falls back to localStorage if table absent)
      const pc=await sb.from('settings').select('value').eq('key','pay_config').maybeSingle();
      if(pc.data?.value)applyPayConfig({...PAY_DEFAULTS,...pc.data.value});
      const lw=await sb.from('settings').select('value').eq('key','locked_weeks').maybeSingle();
      if(lw.data?.value)setLockedWeeks(new Set(lw.data.value));
      setLoaded(true);
    })();

    const ch=sb.channel('fieldsync-all')
      .on('postgres_changes',{event:'*',schema:'public',table:'workers'},({eventType,new:nw,old})=>{
        if(eventType==='DELETE')setWorkers(p=>p.filter(x=>x.id!==old.id));
        else setWorkers(p=>{const w=rowToWorker(nw);const i=p.findIndex(x=>x.id===w.id);if(i===-1)return[...p,w];const c=[...p];c[i]=w;return c});
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'locations'},({eventType,new:nw,old})=>{
        if(eventType==='DELETE')setLocs(p=>p.filter(x=>x.id!==old.id));
        else setLocs(p=>{const l=rowToLoc(nw);const i=p.findIndex(x=>x.id===l.id);if(i===-1)return[...p,l];const c=[...p];c[i]=l;return c});
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'games'},({eventType,new:nw,old})=>{
        if(eventType==='DELETE')setGames(p=>p.filter(x=>x.id!==old.id));
        else setGames(p=>{const g=rowToGame(nw);const i=p.findIndex(x=>x.id===g.id);if(i===-1)return[...p,g];const c=[...p];c[i]=g;return c});
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'day_assignments'},({eventType,new:nw,old})=>{
        const key=eventType==='DELETE'?old.date+"|"+old.loc_id:nw.date+"|"+nw.loc_id;
        if(eventType==='DELETE')setDA(p=>{const c={...p};delete c[key];return c});
        else setDA(p=>({...p,[key]:{fieldCrew:nw.field_crew||[],concessions:nw.concessions||[],concessionsHours:nw.concessions_hours||{},concessionsShifts:nw.concessions_shifts||{},snackShackOpen:nw.snack_shack_open??true}}));
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'published_weeks'},({eventType,new:nw,old})=>{
        if(eventType==='DELETE')setPub(p=>{const c=new Set(p);c.delete(old.week_key);return c});
        else setPub(p=>{const c=new Set(p);c.add(nw.week_key);return c});
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'rsvps'},({eventType,new:nw,old})=>{
        const key=eventType==='DELETE'?old.worker_id+"_"+old.date+"_"+old.loc_id:nw.worker_id+"_"+nw.date+"_"+nw.loc_id;
        if(eventType==='DELETE')setRsvp(p=>{const c={...p};delete c[key];return c});
        else setRsvp(p=>({...p,[key]:nw.status}));
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'requests'},({eventType,new:nw,old})=>{
        if(eventType==='DELETE')setRequests(p=>p.filter(x=>x.id!==old.id));
        else setRequests(p=>{const r=rowToReq(nw);const i=p.findIndex(x=>x.id===r.id);if(i===-1)return[r,...p];const c=[...p];c[i]=r;return c});
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications'},({eventType,new:nw,old})=>{
        if(eventType==='DELETE')setNotifs(p=>p.filter(x=>x.id!==old.id));
        else setNotifs(p=>{const n=rowToNotif(nw);const i=p.findIndex(x=>x.id===n.id);if(i===-1)return[n,...p];const c=[...p];c[i]=n;return c});
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'dragger_overrides'},({eventType,new:nw,old})=>{
        const key=eventType==='DELETE'?old.date+"|"+old.loc_id:nw.date+"|"+nw.loc_id;
        if(eventType==='DELETE')setDraggerOverrides(p=>{const c={...p};delete c[key];return c});
        else setDraggerOverrides(p=>({...p,[key]:nw.worker_id}));
      })
      .subscribe();

    return()=>{sb.removeChannel(ch)};
  },[]);

  const showToast=(msg,type)=>{setToast({msg,type:type||"info"});setTimeout(()=>setToast(null),3000)};
  const pushNotifs=arr=>{swrite(sb.from('notifications').insert(arr.map(n=>({id:n.id,worker_id:n.workerId,msg:n.msg,time:n.time,read:n.read,type:n.type}))))};

  // ── Web Push helpers ───────────────────────────────────────────────
  const VAPID_PUBLIC='BNIZohQ7q12o5w1j0MCLxqjvuKwjkyBiNgl0x_uXMcmhmfaCCWAW84DySKbo-hSYyCYtsbDipfog78mGC4Azvlk';

  const subscribeToPush=async()=>{
    if(!('serviceWorker' in navigator)||!('PushManager' in window))return null;
    const perm=await Notification.requestPermission();
    if(perm!=='granted')return null;
    const reg=await navigator.serviceWorker.ready;
    const existing=await reg.pushManager.getSubscription();
    if(existing)return existing;
    return reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:VAPID_PUBLIC});
  };

  const savePushSub=async(wId)=>{
    const sub=await subscribeToPush();
    if(!sub)return;
    await sb.from('push_subscriptions').upsert({worker_id:wId,sub:sub.toJSON()},{onConflict:'worker_id'});
  };

  const sendPush=async(workerIds,title,message,url='/')=>{
    if(!workerIds.length)return;
    const{data}=await sb.from('push_subscriptions').select('sub').in('worker_id',workerIds);
    const subs=(data||[]).map(r=>r.sub).filter(Boolean);
    if(!subs.length)return;
    fetch('/.netlify/functions/send-push',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-fieldsync-key':'fs-push-2026'},
      body:JSON.stringify({subscriptions:subs,title,message,url})
    }).catch(e=>console.warn('Push send failed:',e));
  };

  const conf=useMemo(()=>detConf(games,workers,da,locs),[games,workers,da,locs]);

  const runAuto=()=>{
    const r=autoSched(games,workers,da,requests,locs);
    setGames(r.games);setDA(r.da);
    swrite(sb.from('games').upsert(r.games.map(g=>({id:g.id,loc_id:g.locId,field:g.field,division:g.division,date:g.date,time:g.time,home:g.home,away:g.away,status:g.status,ump1:g.ump1===NONE?null:g.ump1,ump2:g.ump2===NONE?null:g.ump2}))));
    swrite(sb.from('day_assignments').upsert(Object.entries(r.da).map(([k,v])=>{const[date,locId]=k.split("|");return{date,loc_id:locId,field_crew:v.fieldCrew||[],concessions:v.concessions||[]}})));
    showToast("Auto-schedule complete","s");
  };

  const swapUmps=(aGid,aSlot,bGid,bSlot)=>{
    const wA=games.find(g=>g.id===aGid)?.[aSlot],wB=games.find(g=>g.id===bGid)?.[bSlot];
    setGames(p=>p.map(g=>{if(g.id===aGid)return{...g,[aSlot]:wB};if(g.id===bGid)return{...g,[bSlot]:wA};return g}));
    swrite(sb.from('games').update({[aSlot]:wB===NONE?null:wB}).eq('id',aGid));
    swrite(sb.from('games').update({[bSlot]:wA===NONE?null:wA}).eq('id',bGid));
    showToast("Umpires swapped","s");
  };

  const isPub=date=>pub.has(wkKey(date));
  const pubWeek=ws=>{
    const newPub=p=>{const n=new Set(p);n.add(ws);return n};
    setPub(newPub);
    swrite(sb.from('published_weeks').upsert({week_key:ws}));
    const aff=new Set();
    games.filter(g=>wkKey(g.date)===ws).forEach(g=>{[g.ump1,g.ump2].forEach(u=>{if(u&&u!==NONE)aff.add(u)})});
    Object.entries(da).filter(([k])=>wkKey(k.split("|")[0])===ws).forEach(([,v])=>{(v.fieldCrew||[]).forEach(u=>aff.add(u));(v.concessions||[]).forEach(u=>aff.add(u))});
    const n=[...aff].map(wId=>({id:Date.now()+wId,workerId:wId,msg:"Schedule published for week of "+ws+" — check your shifts.",time:new Date().toISOString(),read:false,type:"info"}));
    setNotifs(p=>[...n,...p]);pushNotifs(n);
    sendPush([...aff],"📅 FieldSync schedule published","Your shifts for the week of "+ws+" are ready — tap to view.","/");
    // Silently refresh ICS calendars for all affected workers
    const isPubFn=d=>{const s=newPub(pub);return s.has(wkKey(d));};
    const gd=(date,locId)=>getDragger(date,locId,da,workers,draggerOverrides,requests);
    workers.filter(w=>aff.has(w.id)).forEach(w=>{
      publishWorkerICS(w,games,da,locs,isPubFn,gd).catch(e=>console.warn("ICS refresh failed for",w.name,e));
    });
    showToast("Week published — "+aff.size+" workers notified","s");
  };
  const unpubWeek=ws=>{
    setPub(p=>{const n=new Set(p);n.delete(ws);return n});
    swrite(sb.from('published_weeks').delete().eq('week_key',ws));
    showToast("Moved back to draft");
  };
  const isLocked=ws=>lockedWeeks.has(ws);
  const lockWeek=ws=>{
    const next=new Set(lockedWeeks);next.add(ws);setLockedWeeks(next);
    sb.from('settings').upsert({key:'locked_weeks',value:[...next]})
      .then(({error})=>error?showToast("Lock save failed: "+error.message,"e"):showToast("Week locked — autoscheduler will skip it","s"));
  };
  const unlockWeek=ws=>{
    const next=new Set(lockedWeeks);next.delete(ws);setLockedWeeks(next);
    sb.from('settings').upsert({key:'locked_weeks',value:[...next]})
      .then(({error})=>error?showToast("Lock save failed: "+error.message,"e"):showToast("Week unlocked","s"));
  };

  // RSVP — fires manager notification on decline, with shift detail and available replacements
  const setRsvpStatus=(wId,date,locId,status)=>{
    setRsvp(p=>({...p,[rsvpKey(wId,date,locId)]:status}));
    swrite(sb.from('rsvps').upsert({worker_id:wId,date,loc_id:locId,status}));
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
      const replacements=workers.filter(w2=>{
        if(w2.role!==w?.role||w2.id===wId)return false;
        if(!wa(w2,date,requests))return false;
        if(w?.role==="umpire"){
          return!games.some(g2=>g2.status==="scheduled"&&g2.date===date&&(g2.ump1===w2.id||g2.ump2===w2.id));
        }
        return!Object.entries(da).some(([k,v])=>k.split("|")[0]===date&&((v.fieldCrew||[]).includes(w2.id)||(v.concessions||[]).includes(w2.id)));
      });
      const replText=replacements.length?"Available to cover: "+replacements.map(r=>r.name).join(", "):"No one else appears available that day.";
      const n=[{id:Date.now(),workerId:0,msg:"⚠ "+( w?.name||"A worker")+" declined "+what+" on "+date+" at "+(loc?.name||locId)+". "+replText,time:new Date().toISOString(),read:false,type:"warn"}];
      setNotifs(p=>[...n,...p]);pushNotifs(n);
    }
    showToast(status==="confirmed"?"Confirmed!":"Marked can't make it — manager notified",status==="confirmed"?"s":"w");
  };
  const getRsvp=(wId,date,locId)=>rsvp[rsvpKey(wId,date,locId)]||null;

  const addGame=g=>{
    const ng={...g,id:Date.now(),status:"scheduled",ump1:NONE,ump2:NONE};
    setGames(p=>[...p,ng]);
    swrite(sb.from('games').insert({id:ng.id,loc_id:ng.locId,field:ng.field,division:ng.division,date:ng.date,time:ng.time,home:ng.home,away:ng.away,status:ng.status,ump1:null,ump2:null}));
    showToast("Game added","s");setModal(null);
  };
  const editGame=g=>{
    setGames(p=>p.map(x=>x.id===g.id?{...x,...g}:x));
    swrite(sb.from('games').update({loc_id:g.locId,field:g.field,division:g.division,date:g.date,time:g.time,home:g.home,away:g.away,status:g.status}).eq('id',g.id));
    showToast("Updated","s");setModal(null);
  };
  const delGame=id=>{
    setGames(p=>p.filter(x=>x.id!==id));
    swrite(sb.from('games').delete().eq('id',id));
    showToast("Removed");setModal(null);
  };
  const setGS=(id,s)=>{
    setGames(p=>p.map(g=>g.id===id?{...g,status:s}:g));
    swrite(sb.from('games').update({status:s}).eq('id',id));
  };
  const setUmp=(gid,slot,wId)=>{
    setGames(p=>p.map(g=>g.id===gid?{...g,[slot]:wId}:g));
    swrite(sb.from('games').update({[slot]:wId===NONE?null:wId}).eq('id',gid));
  };
  const rainout=(date,locId)=>{
    setGames(p=>p.map(g=>g.date===date&&g.locId===locId?{...g,status:"cancelled"}:g));
    swrite(sb.from('games').update({status:'cancelled'}).eq('date',date).eq('loc_id',locId));
    const aff=new Set();
    games.filter(g=>g.date===date&&g.locId===locId).forEach(g=>{[g.ump1,g.ump2].forEach(u=>{if(u&&u!==NONE)aff.add(u)})});
    const loc=locs.find(l=>l.id===locId),d2=da[dk(date,locId)]||{};
    (d2.fieldCrew||[]).forEach(u=>aff.add(u));(d2.concessions||[]).forEach(u=>aff.add(u));
    const n=[...aff].map(wId=>({id:Date.now()+wId,workerId:wId,msg:"RAINOUT: "+date+" at "+(loc?.name||locId)+" — all games cancelled.",time:new Date().toISOString(),read:false,type:"warn"}));
    setNotifs(p=>[...n,...p]);pushNotifs(n);
    showToast("Rainout — "+aff.size+" workers notified","w");setModal(null);
  };
  const updDA=(date,locId,role,arr)=>{
    const k=dk(date,locId);
    setDA(p=>({...p,[k]:{...(p[k]||{fieldCrew:[],concessions:[],concessionsHours:{}}),[role]:arr}}));
    swrite(sb.from('day_assignments').upsert({date,loc_id:locId,[role==='fieldCrew'?'field_crew':'concessions']:arr}));
  };
  const updConcessionsHours=(date,locId,wId,hours)=>{
    const k=dk(date,locId);
    setDA(p=>{const prev=p[k]||{fieldCrew:[],concessions:[],concessionsHours:{}};const ch={...prev.concessionsHours,[wId]:hours};return{...p,[k]:{...prev,concessionsHours:ch}}});
    const ch={...(da[dk(date,locId)]?.concessionsHours||{}),[wId]:hours};
    swrite(sb.from('day_assignments').upsert({date,loc_id:locId,concessions_hours:ch}));
  };
  const updConcessionsShift=(date,locId,wId,start,end)=>{
    const k=dk(date,locId);
    const prev=da[k]||{fieldCrew:[],concessions:[],concessionsHours:{},concessionsShifts:{}};
    const cs={...prev.concessionsShifts,[wId]:{start,end}};
    setDA(p=>({...p,[k]:{...prev,concessionsShifts:cs}}));
    sb.from('day_assignments').upsert({date,loc_id:locId,field_crew:prev.fieldCrew||[],concessions:prev.concessions||[],concessions_hours:prev.concessionsHours||{},concessions_shifts:cs,snack_shack_open:prev.snackShackOpen??true})
      .then(({error})=>{if(error)showToast("Shift save failed: "+error.message,"e")});
  };
  const updSnackShackOpen=(date,locId,open)=>{
    const k=dk(date,locId);
    const prev=da[k]||{fieldCrew:[],concessions:[],concessionsHours:{},concessionsShifts:{}};
    setDA(p=>({...p,[k]:{...prev,snackShackOpen:open}}));
    sb.from('day_assignments').upsert({date,loc_id:locId,field_crew:prev.fieldCrew||[],concessions:prev.concessions||[],concessions_hours:prev.concessionsHours||{},concessions_shifts:prev.concessionsShifts||{},snack_shack_open:open})
      .then(({error})=>{if(error)showToast("Snack shack save failed: "+error.message,"e")});
  };
  const updPayConfig=cfg=>{const n={...payConfig,...cfg};applyPayConfig(n);swrite(sb.from('settings').upsert({key:'pay_config',value:n}));};
  const addWorker=({name,email,password,roles,avail})=>{
    const newId=Math.max(0,...workers.map(w=>w.id))+1;
    const primary=roles[0];
    const nw={id:newId,name,email,password,role:primary,roles,avail,availByRole:{},yearsExp:0,phone:"",payRates:{}};
    setWorkers(p=>[...p,nw]);
    swrite(sb.from('workers').insert({id:newId,name,email,password,role:primary,roles,avail,avail_by_role:{},years_exp:0,phone:"",pay_rates:{}}));
    showToast(name+" added","s");
    setModal(null);
  };
  const updWorkerRoles=(wId,roles)=>{
    setWorkers(p=>p.map(w=>w.id===wId?{...w,roles}:w));
    swrite(sb.from('workers').update({roles}).eq('id',wId));
    showToast("Roles updated","s");
  };
  const updWorkerPayRate=(wId,role,rate)=>{
    setWorkers(p=>p.map(w=>w.id===wId?{...w,payRates:{...w.payRates,[role]:rate}}:w));
    const pr={...(workers.find(w=>w.id===wId)?.payRates||{}),[role]:rate};
    swrite(sb.from('workers').update({pay_rates:pr}).eq('id',wId));
    showToast("Pay rate updated","s");
  };

  // Send an in-app reminder notification to every worker scheduled on a given date,
  // plus email/SMS via the send-reminder Edge Function for anyone with contact info on file
  const sendReminders=(date)=>{
    const aff=new Set();
    games.filter(g=>g.date===date&&g.status==="scheduled").forEach(g=>{[g.ump1,g.ump2].forEach(u=>{if(u&&u!==NONE)aff.add(u)})});
    Object.entries(da).filter(([k])=>k.split("|")[0]===date).forEach(([,v])=>{(v.fieldCrew||[]).forEach(u=>aff.add(u));(v.concessions||[]).forEach(u=>aff.add(u))});
    const n=[...aff].map(wId=>({id:Date.now()+wId,workerId:wId,msg:"🔔 Reminder: you're scheduled on "+date+" — check My Shifts for details.",time:new Date().toISOString(),read:false,type:"info"}));
    setNotifs(p=>[...n,...p]);pushNotifs(n);
    const recipients=workers.filter(w=>aff.has(w.id)&&(w.email||w.phone)).map(w=>({name:w.name,email:w.email||null,phone:w.phone||null}));
    if(recipients.length){
      sb.functions.invoke('send-reminder',{body:{recipients,subject:"FieldSync reminder",message:"Reminder: you're scheduled on "+date+" — check My Shifts in FieldSync for details."}})
        .then(({error})=>{if(error)console.error("Reminder dispatch failed:",error)});
    }
    showToast(aff.size>0?"Reminders sent to "+aff.size+" worker"+(aff.size>1?"s":""):"No one scheduled that day",aff.size>0?"s":"info");
  };

  // Update a worker's years of experience
  const updYears=(wId,years)=>{
    setWorkers(p=>p.map(w=>w.id===wId?{...w,yearsExp:Number(years)}:w));
    swrite(sb.from('workers').update({years_exp:Number(years)}).eq('id',wId));
    showToast("Experience updated","s");
  };

  // Update a worker's phone number (used for SMS reminders)
  const updPhone=(wId,phone)=>{
    setWorkers(p=>p.map(w=>w.id===wId?{...w,phone}:w));
    swrite(sb.from('workers').update({phone}).eq('id',wId));
    showToast("Phone updated","s");
  };

  const updWorkerPassword=(wId,newPass)=>{
    setWorkers(p=>p.map(w=>w.id===wId?{...w,password:newPass}:w));
    swrite(sb.from('workers').update({password:newPass}).eq('id',wId));
    showToast("Password updated","s");
  };

  // Manually override the dragger for a given date+location
  const setDraggerOverride=(date,locId,wId)=>{
    const k=dk(date,locId);
    setDraggerOverrides(p=>({...p,[k]:wId}));
    if(wId==null)swrite(sb.from('dragger_overrides').delete().eq('date',date).eq('loc_id',locId));
    else swrite(sb.from('dragger_overrides').upsert({date,loc_id:locId,worker_id:wId}));
    showToast("Dragger updated","s");
  };

  // Offer up a shift — creates a shift_offer request visible to same-role workers
  const offerShift=(wId,date,locId,role,label)=>{
    const nr={id:Date.now(),type:"shift_offer",workerId:wId,date,locId,role,label,claimedBy:null,status:"pending",created:new Date().toISOString().slice(0,10)};
    setRequests(p=>[nr,...p]);
    swrite(sb.from('requests').insert({id:nr.id,type:nr.type,worker_id:nr.workerId,date:nr.date,loc_id:nr.locId,role:nr.role,label:nr.label,claimed_by:null,status:nr.status,created:nr.created}));
    showToast("Shift offered up — teammates can now claim it");
  };

  // Claim an offered shift — manager sees it in requests and approves/denies
  const claimShift=(reqId,claimerId)=>{
    setRequests(p=>p.map(r=>r.id===reqId?{...r,claimedBy:claimerId,status:"pending_approval"}:r));
    swrite(sb.from('requests').update({claimed_by:claimerId,status:'pending_approval'}).eq('id',reqId));
    const req=requests.find(r=>r.id===reqId),claimer=workers.find(w=>w.id===claimerId),offerer=workers.find(w=>w.id===req?.workerId),loc=locs.find(l=>l.id===req?.locId);
    const n=[{id:Date.now(),workerId:0,msg:"🔄 "+claimer?.name+" wants to take "+offerer?.name+"'s shift on "+req?.date+" at "+(loc?.name||"?")+" — approve in Requests.",time:new Date().toISOString(),read:false,type:"info"}];
    setNotifs(p=>[...n,...p]);pushNotifs(n);
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
        const gMatch=games.find(g=>g.date===req.date&&g.locId===req.locId&&(g.ump1===req.workerId||g.ump2===req.workerId));
        if(gMatch){const slot=gMatch.ump1===req.workerId?'ump1':'ump2';swrite(sb.from('games').update({[slot]:req.claimedBy}).eq('id',gMatch.id))}
      } else {
        const k=dk(req.date,req.locId);
        let newArr;
        setDA(p=>{const d={...(p[k]||{fieldCrew:[],concessions:[]})};const roleKey=req.role==="field"?"fieldCrew":"concessions";newArr=(d[roleKey]||[]).map(id=>id===req.workerId?req.claimedBy:id);d[roleKey]=newArr;return{...p,[k]:d}});
        const dbRoleKey=req.role==="field"?"field_crew":"concessions";
        swrite(sb.from('day_assignments').upsert({date:req.date,loc_id:req.locId,[dbRoleKey]:newArr}));
      }
      const claimer=workers.find(w=>w.id===req.claimedBy),loc=locs.find(l=>l.id===req.locId);
      const n=[
        {id:Date.now(),  workerId:req.claimedBy,msg:"✅ Your claim for "+req.date+" at "+(loc?.name||"?")+" was approved — you're on the schedule.",time:new Date().toISOString(),read:false,type:"success"},
        {id:Date.now()+1,workerId:req.workerId, msg:"✅ "+claimer?.name+" is covering your shift on "+req.date+" at "+(loc?.name||"?")+".",time:new Date().toISOString(),read:false,type:"success"}
      ];
      setNotifs(p=>[...n,...p]);pushNotifs(n);
      sendPush([req.claimedBy],"✅ Shift claim approved","You're covering "+req.date+" at "+(loc?.name||"your location")+".");
      sendPush([req.workerId],"✅ Shift covered",claimer?.name+" is covering your shift on "+req.date+".");
    } else {
      if(req?.type==="shift_offer"&&action==="denied"&&req.claimedBy){
        const loc=locs.find(l=>l.id===req.locId);
        const n=[{id:Date.now(),workerId:req.claimedBy,msg:"❌ Your claim for "+req.date+" at "+(loc?.name||"?")+" was denied.",time:new Date().toISOString(),read:false,type:"warn"}];
        setNotifs(p=>[...n,...p]);pushNotifs(n);
      }
    }
    setRequests(p=>p.map(r=>r.id===id?{...r,status:action==="approved"?"approved":"denied"}:r));
    swrite(sb.from('requests').update({status:action==="approved"?"approved":"denied"}).eq('id',id));
    showToast("Request "+action,action==="approved"?"s":"info");
  };

  const subReq=req=>{
    const nr={...req,id:Date.now(),status:"pending",created:new Date().toISOString().slice(0,10)};
    setRequests(p=>[nr,...p]);
    swrite(sb.from('requests').insert({id:nr.id,type:nr.type,worker_id:nr.workerId,date:nr.date||null,date_start:nr.dateStart||null,date_end:nr.dateEnd||null,loc_id:nr.locId||null,role:nr.role||null,label:nr.label||null,reason:nr.reason||null,claimed_by:nr.claimedBy||null,status:nr.status,created:nr.created}));
    showToast("Request submitted");setModal(null);
  };
  const addLoc=loc=>{
    const nl={...loc,id:Date.now().toString()};
    setLocs(p=>[...p,nl]);
    swrite(sb.from('locations').insert({id:nl.id,name:nl.name,fields:nl.fields}));
    showToast("Location added","s");setModal(null);
  };
  const addField=(lid,f)=>{
    let newFields;
    setLocs(p=>p.map(l=>{if(l.id!==lid)return l;newFields=[...l.fields,f];return{...l,fields:newFields}}));
    swrite(sb.from('locations').update({fields:newFields}).eq('id',lid));
    showToast("Field added");setModal(null);
  };
  const updAvail=(wId,avail)=>{
    setWorkers(p=>p.map(w=>w.id===wId?{...w,avail}:w));
    swrite(sb.from('workers').update({avail}).eq('id',wId));
  };
  const updAvailByRole=(wId,role,days)=>{
    setWorkers(p=>p.map(w=>w.id===wId?{...w,availByRole:{...w.availByRole,[role]:days}}:w));
    const cur=workers.find(w=>w.id===wId)?.availByRole||{};
    swrite(sb.from('workers').update({avail_by_role:{...cur,[role]:days}}).eq('id',wId));
  };
  const updAvailByRoleAll=(wId,availByRole)=>{
    const allDays=[...new Set(Object.values(availByRole).flat())];
    setWorkers(p=>p.map(w=>w.id===wId?{...w,availByRole,avail:allDays}:w));
    swrite(sb.from('workers').update({avail_by_role:availByRole,avail:allDays}).eq('id',wId));
    showToast("Saved","s");
  };
  const importCSV=csv=>{
    // Robust CSV parser — handles quoted fields containing commas
    const parseRow=line=>{const cols=[];let cur="",inQ=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){inQ=!inQ}else if(ch===","&&!inQ){cols.push(cur.trim());cur=""}else{cur+=ch}}cols.push(cur.trim());return cols};
    const normDate=raw=>{
      const s=(raw||"").replace(/"/g,"").trim();
      if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
      // M/D/YY or MM/DD/YY → YYYY-MM-DD
      const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if(m){const y=m[3].length===2?"20"+m[3]:m[3];return y+"-"+m[1].padStart(2,"0")+"-"+m[2].padStart(2,"0");}
      return null;
    };
    const isValidDate=d=>!!d&&!isNaN(new Date(d+"T12:00:00").getTime());
    const lines=csv.trim().split(/\r?\n/),ng=[],skipped=[];
    for(let i=1;i<lines.length;i++){
      if(!lines[i].trim())continue;
      const c=parseRow(lines[i]);
      if(c.length<4){skipped.push(i+1);continue;}
      const date=normDate(c[3]);
      if(!isValidDate(date)){skipped.push(i+1);continue;}
      const locRaw=(c[0]||"").toLowerCase();
      ng.push({id:Date.now()+i,locId:locRaw.includes("spring")||locRaw.includes("sc")?"sc":"mv",field:c[1]||"Field 1",division:normDiv(c[2]||""),date,time:c[4]||"9:00 AM",away:c[5]||"",home:c[6]||"",status:"scheduled",ump1:NONE,ump2:NONE});
    }
    if(ng.length===0){showToast("No valid rows found — check date format (YYYY-MM-DD)","e");return;}
    setGames(p=>[...p,...ng]);
    swrite(sb.from('games').insert(ng.map(g=>({id:g.id,loc_id:g.locId,field:g.field,division:g.division,date:g.date,time:g.time,home:g.home,away:g.away,status:g.status,ump1:null,ump2:null}))));
    const msg="Imported "+ng.length+" game"+(ng.length>1?"s":"")+(skipped.length?" ("+skipped.length+" rows skipped — bad date/format)":"");
    showToast(msg,"s");setModal(null);
  };

  if(!loaded)return R("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#9BA3BF",fontSize:14}},"Loading FieldSync…");
  if(!user)return R(Login,{onLogin:u=>{setUser(u);setView(u.role==="overseer"?"today":"worker_home")},liveWorkers:workers});
  // Merge live worker record so multi-role assignments set by admin are always reflected.
  // Only overwrite fields that are non-null in the live record, so seed roles survive when the DB column doesn't exist yet.
  const effectiveUser=user.role==="overseer"?user:(()=>{const live=workers.find(w=>w.id===user.id)||{};const merged={...user};Object.entries(live).forEach(([k,v])=>{if(v!=null)merged[k]=v});return merged;})();
  const _rawNotifs=effectiveUser.role==="overseer"?notifs:notifs.filter(n=>n.workerId===effectiveUser.id||n.workerId===0&&false);
  // Deduplicate by message text — keep only the most recent copy of each unique message
  const myNotifs=_rawNotifs.filter((n,i)=>_rawNotifs.findIndex(x=>x.msg===n.msg)===i);
  const unread=myNotifs.filter(n=>!n.read).length,pendingR=requests.filter(r=>r.status==="pending"||r.status==="pending_approval").length;
  const adminNav=[{id:"today",label:"Today"},{id:"schedule",label:"Schedule"},{id:"staff",label:"Staff",badge:conf.length},{id:"requests",label:"Requests",badge:pendingR},{id:"reports",label:"Reports"},{id:"settings",label:"Settings"}];
  const workerNav=[{id:"worker_home",label:"Home"},{id:"my_shifts",label:"My shifts"},{id:"my_requests",label:"Requests"},{id:"availability",label:"My Profile"},{id:"resources",label:"Resources"},{id:"notifications",label:"Notifications",badge:unread}];
  const nav=effectiveUser.role==="overseer"?adminNav:workerNav;
  const sp={user:effectiveUser,locs,workers,games,da,pub,rsvp,requests,notifs:myNotifs,conf,draggerOverrides,getDragger:(date,locId)=>getDragger(date,locId,da,workers,draggerOverrides,requests),runAuto,swapUmps,setModal,isPub,pubWeek,unpubWeek,isLocked,lockWeek,unlockWeek,lockedWeeks,setRsvpStatus,getRsvp,setUmp,rainout,updDA,setGS,handleReq,addLoc,addField,updAvail,updAvailByRole,updAvailByRoleAll,subReq,setNotifs,showToast,addGame,editGame,delGame,importCSV,offerShift,claimShift,updYears,updPhone,setDraggerOverride,sendReminders,payConfig,updPayConfig,updConcessionsHours,updConcessionsShift,updSnackShackOpen,updWorkerRoles,updWorkerPayRate,addWorker,updWorkerPassword,savePushSub};
  const isWorker=effectiveUser.role!=="overseer";
  const workerBottomNav=[
    {id:"worker_home",label:"Home",icon:"🏠"},
    {id:"my_shifts",label:"Shifts",icon:"📅"},
    {id:"my_requests",label:"Requests",icon:"📋"},
    {id:"availability",label:"Profile",icon:"👤"},
    {id:"resources",label:"Resources",icon:"📖"},
    {id:"notifications",label:"Alerts",icon:"🔔",badge:unread},
  ];
  const adminBottomNav=[
    {id:"today",label:"Today",icon:"📋"},
    {id:"schedule",label:"Schedule",icon:"📅"},
    {id:"staff",label:"Staff",icon:"👥",badge:conf.length},
    {id:"requests",label:"Requests",icon:"✉️"},
    {id:"reports",label:"Reports",icon:"📊"},
  ];
  return R("div",{className:"app"},
    R("div",{className:"topbar"},
      R("div",{className:"logo"},"Field",R("span",null,"Sync")),
      R("div",{style:{display:"flex",alignItems:"center",gap:8}},
        conf.length>0&&R("span",{className:"conflict-pill",onClick:()=>setView("staff")},"⚠ "+conf.length),
        !isWorker&&R("span",{style:{position:"relative",cursor:"pointer",fontSize:18,lineHeight:1},onClick:()=>setView("notifications")},"🔔",unread>0&&R("span",{style:{position:"absolute",top:-4,right:-6,background:"#E05555",color:"#fff",borderRadius:"50%",fontSize:9,fontWeight:700,minWidth:14,height:14,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 2px"}},unread)),
        R("span",{className:"topbar-badges"},
          effectiveUser.role==="overseer"
            ?R("span",{className:"badge b-blue"},"Admin")
            :(effectiveUser.roles&&effectiveUser.roles.length>1?effectiveUser.roles:[effectiveUser.role]).map(r=>R("span",{key:r,className:"badge "+rb(r),style:{marginLeft:2}},rl(r)))
        ),
        R("span",{className:"topbar-name"},effectiveUser.name),
        R("button",{className:"btn btn-sm",onClick:()=>setUser(null)},"Sign out")
      )
    ),
    R("div",{className:"layout"},
      R("div",{className:"sidebar"},
        nav.map(item=>R("div",{key:item.id,className:"nav-item"+(view===item.id?" active":""),onClick:()=>setView(item.id)},item.label,item.badge>0&&R("span",{className:"nav-badge"},item.badge))),
        R("div",{className:"nav-bottom"},R("div",{className:"nav-item",style:{fontSize:12,color:"#6B7394"}},effectiveUser.name))
      ),
      R("div",{className:"content"+(isWorker?" content-worker":" content-admin")},
        view==="today"&&R(TodayView,sp),
        view==="schedule"&&R(SchedGamesView,sp),
        view==="staff"&&R(StaffView,sp),
        view==="requests"&&R(ReqsView,sp),
        view==="reports"&&R(ReportsView,sp),
        view==="settings"&&R(LocsView,sp),
        view==="notifications"&&R(NotifsView,sp),
        view==="worker_home"&&R(WHome,sp),view==="my_shifts"&&R(MyShifts,sp),view==="my_requests"&&R(MyReqs,sp),view==="availability"&&R(AvailView,sp),view==="resources"&&R(ResourcesView,{effectiveUser})
      )
    ),
    R("nav",{className:"bottom-nav"},
      (isWorker?workerBottomNav:adminBottomNav).map(item=>R("div",{key:item.id,className:"bn-item"+(view===item.id?" bn-active":""),onClick:()=>setView(item.id)},
        R("span",{className:"bn-icon",style:{position:"relative"}},item.icon,item.badge>0&&R("span",{className:"bn-badge"},item.badge)),
        R("span",{className:"bn-label"},item.label)
      ))
    ),
    modal&&R(ModalRouter,{...sp,modal,onClose:()=>setModal(null)}),
    toast&&R("div",{className:"toast "+(toast.type==="s"?"toast-s":toast.type==="w"?"toast-w":"")},toast.msg)
  );
}
ReactDOM.render(R(App),document.getElementById("root"));