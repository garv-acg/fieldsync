function ModalRouter(props){
  const{modal,onClose}=props;
  if(modal.type==="add_game"||modal.type==="edit_game")return R(GameModal,props);
  if(modal.type==="confirm_del")return R(ConfirmModal,{title:"Delete game?",body:"This cannot be undone.",confirm:"Delete",onClose,onConfirm:()=>props.delGame(modal.gameId)});
  if(modal.type==="rainout")return R(RainoutModal,props);
  if(modal.type==="add_loc")return R(AddLocModal,props);
  if(modal.type==="add_field")return R(AddFieldModal,props);
  if(modal.type==="import")return R(ImportModal,props);
  if(modal.type==="add_worker")return R(AddWorkerModal,props);
  return null;
}
function GameModal({modal,locs,onClose,addGame,editGame}){
  const g=modal.game||{};
  const[f,setF]=useState({locId:g.locId||locs[0]?.id||"",field:g.field||locs[0]?.fields[0]||"",division:g.division||DIVS[0],date:g.date||modal.prefillDate||"",time:g.time||"6:00 PM",home:g.home||"",away:g.away||"",status:g.status||"scheduled",id:g.id});
  const loc=locs.find(l=>l.id===f.locId);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const hloc=nId=>{const nl=locs.find(l=>l.id===nId);setF(p=>({...p,locId:nId,field:nl?.fields[0]||""}))};
  const isAdd=modal.type==="add_game";
  return R("div",{className:"modal-wrap",onClick:e=>e.target.className==="modal-wrap"&&onClose()},
    R("div",{className:"modal"},
      R("div",{className:"modal-hdr"},R("span",{className:"modal-title"},isAdd?"Add game":"Edit game"),R("button",{className:"btn btn-sm",onClick:onClose},"✕")),
      R("div",{className:"g2"},
        R("div",{className:"form-group"},R("label",{className:"form-label"},"Location"),R("select",{className:"form-input",value:f.locId,onChange:e=>hloc(e.target.value)},locs.map(l=>R("option",{key:l.id,value:l.id},l.name)))),
        R("div",{className:"form-group"},R("label",{className:"form-label"},"Field"),R("select",{className:"form-input",value:f.field,onChange:e=>set("field",e.target.value)},loc?loc.fields.map(ff=>R("option",{key:ff,value:ff},ff)):[])),
      ),
      R("div",{className:"form-group"},R("label",{className:"form-label"},"Division"),R("select",{className:"form-input",value:f.division,onChange:e=>set("division",e.target.value)},DIVS.map(d=>R("option",{key:d,value:d},d)))),
      isDual(f.division)&&R("div",{style:{background:"#2D1D5C",border:"1px solid #8B5CF6",borderRadius:8,padding:"7px 12px",marginBottom:12,fontSize:12,color:"#C4A8FC"}},f.division+" requires 2 umpires."),
      R("div",{className:"g2"},
        R("div",{className:"form-group"},R("label",{className:"form-label"},"Date"),R("input",{type:"date",className:"form-input",value:f.date,onChange:e=>set("date",e.target.value)})),
        R("div",{className:"form-group"},R("label",{className:"form-label"},"Time"),R("select",{className:"form-input",value:f.time,onChange:e=>set("time",e.target.value)},TIMES.map(t=>R("option",{key:t,value:t},t))))
      ),
      R("div",{className:"g2"},
        R("div",{className:"form-group"},R("label",{className:"form-label"},"Away"),R("input",{className:"form-input",value:f.away,onChange:e=>set("away",e.target.value),placeholder:"Away team"})),
        R("div",{className:"form-group"},R("label",{className:"form-label"},"Home"),R("input",{className:"form-input",value:f.home,onChange:e=>set("home",e.target.value),placeholder:"Home team"}))
      ),
      !isAdd&&R("div",{className:"form-group"},R("label",{className:"form-label"},"Status"),R("select",{className:"form-input",value:f.status,onChange:e=>set("status",e.target.value)},STATS.map(s=>R("option",{key:s,value:s},s)))),
      R("div",{style:{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}},
        R("button",{className:"btn",onClick:onClose},"Cancel"),
        R("button",{className:"btn btn-blue",disabled:!f.date,onClick:()=>f.date&&(isAdd?addGame(f):editGame(f))},isAdd?"Add game":"Save")
      )
    )
  );
}
function ConfirmModal({title,body,confirm,onClose,onConfirm}){
  return R("div",{className:"modal-wrap",onClick:e=>e.target.className==="modal-wrap"&&onClose()},
    R("div",{className:"modal",style:{maxWidth:380}},
      R("div",{className:"modal-hdr"},R("span",{className:"modal-title"},title),R("button",{className:"btn btn-sm",onClick:onClose},"✕")),
      R("p",{style:{color:"#9BA3BF",fontSize:13,marginBottom:20}},body),
      R("div",{style:{display:"flex",gap:8,justifyContent:"flex-end"}},R("button",{className:"btn",onClick:onClose},"Cancel"),R("button",{className:"btn btn-red",onClick:()=>{onConfirm();onClose()}},confirm||"Confirm"))
    )
  );
}
function RainoutModal({modal,rainout,onClose}){
  return R("div",{className:"modal-wrap",onClick:e=>e.target.className==="modal-wrap"&&onClose()},
    R("div",{className:"modal",style:{maxWidth:420}},
      R("div",{className:"modal-hdr"},R("span",{className:"modal-title"},"⛈ Rainout — "+modal.locName),R("button",{className:"btn btn-sm",onClick:onClose},"✕")),
      R("div",{style:{background:"#3D1A1A",border:"1px solid #E05555",borderRadius:8,padding:12,marginBottom:16,color:"#F09090",fontSize:13}},
        R("div",{style:{fontWeight:700,marginBottom:6}},"This will:"),
        "• Cancel all games on "+modal.date+" at "+modal.locName,R("br",null),
        "• Notify every assigned worker immediately"
      ),
      R("div",{style:{display:"flex",gap:8,justifyContent:"flex-end"}},
        R("button",{className:"btn",onClick:onClose},"Go back"),
        R("button",{className:"btn btn-red",style:{fontWeight:700},onClick:()=>rainout(modal.date,modal.locId)},"Cancel all & notify workers")
      )
    )
  );
}
function AddLocModal({onClose,addLoc}){
  const[name,setName]=useState(""),[fields,setFields]=useState(["Field 1","Field 2"]),[nf,setNf]=useState("");
  return R("div",{className:"modal-wrap",onClick:e=>e.target.className==="modal-wrap"&&onClose()},
    R("div",{className:"modal"},
      R("div",{className:"modal-hdr"},R("span",{className:"modal-title"},"Add location"),R("button",{className:"btn btn-sm",onClick:onClose},"✕")),
      R("div",{className:"form-group"},R("label",{className:"form-label"},"Name"),R("input",{className:"form-input",value:name,onChange:e=>setName(e.target.value),placeholder:"e.g. Oak Park"})),
      R("div",{className:"form-group"},R("label",{className:"form-label"},"Fields"),
        fields.map((f,i)=>R("div",{key:i,style:{display:"flex",gap:8,marginBottom:6}},R("span",{style:{flex:1,fontSize:13,paddingTop:4}},f),R("button",{className:"btn btn-sm btn-red",onClick:()=>setFields(p=>p.filter((_,j)=>j!==i))},"✕"))),
        R("div",{style:{display:"flex",gap:8}},
          R("input",{className:"form-input",value:nf,onChange:e=>setNf(e.target.value),placeholder:"New field",onKeyDown:e=>{if(e.key==="Enter"&&nf.trim()){setFields(p=>[...p,nf.trim()]);setNf("")}}}),
          R("button",{className:"btn btn-sm",onClick:()=>{if(nf.trim()){setFields(p=>[...p,nf.trim()]);setNf("")}}},"Add")
        )
      ),
      R("div",{style:{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}},R("button",{className:"btn",onClick:onClose},"Cancel"),R("button",{className:"btn btn-blue",onClick:()=>name&&addLoc({name,fields})},"Add location"))
    )
  );
}
function AddFieldModal({modal,onClose,addField}){
  const[name,setName]=useState("");
  return R("div",{className:"modal-wrap",onClick:e=>e.target.className==="modal-wrap"&&onClose()},
    R("div",{className:"modal",style:{maxWidth:380}},
      R("div",{className:"modal-hdr"},R("span",{className:"modal-title"},"Add field — "+modal.locName),R("button",{className:"btn btn-sm",onClick:onClose},"✕")),
      R("div",{className:"form-group"},R("label",{className:"form-label"},"Field name"),R("input",{className:"form-input",value:name,onChange:e=>setName(e.target.value),placeholder:"e.g. Field 5",onKeyDown:e=>e.key==="Enter"&&name&&addField(modal.locId,name)})),
      R("div",{style:{display:"flex",gap:8,justifyContent:"flex-end"}},R("button",{className:"btn",onClick:onClose},"Cancel"),R("button",{className:"btn btn-blue",onClick:()=>name&&addField(modal.locId,name)},"Add field"))
    )
  );
}
function AddWorkerModal({onClose,addWorker}){
  const ALL_ROLES=["umpire","field","concessions"];
  const ALL_DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const[f,setF]=useState({name:"",email:"",password:"",roles:["umpire"],avail:["Sat","Sun"]});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const toggleRole=r=>setF(p=>{const has=p.roles.includes(r);if(has&&p.roles.length===1)return p;return{...p,roles:has?p.roles.filter(x=>x!==r):[...p.roles,r]}});
  const toggleDay=d=>setF(p=>{const has=p.avail.includes(d);if(has&&p.avail.length===1)return p;return{...p,avail:has?p.avail.filter(x=>x!==d):[...p.avail,d]}});
  const valid=f.name.trim()&&f.email.trim()&&f.password.trim()&&f.roles.length>0&&f.avail.length>0;
  return R("div",{className:"modal-wrap",onClick:e=>e.target.className==="modal-wrap"&&onClose()},
    R("div",{className:"modal"},
      R("div",{className:"modal-hdr"},R("span",{className:"modal-title"},"Add worker"),R("button",{className:"btn btn-sm",onClick:onClose},"✕")),
      R("div",{className:"g2"},
        R("div",{className:"form-group"},R("label",{className:"form-label"},"Name"),R("input",{className:"form-input",value:f.name,onChange:e=>set("name",e.target.value),placeholder:"Full name",autoFocus:true})),
        R("div",{className:"form-group"},R("label",{className:"form-label"},"Email"),R("input",{type:"email",className:"form-input",value:f.email,onChange:e=>set("email",e.target.value),placeholder:"worker@example.com"}))
      ),
      R("div",{className:"form-group"},R("label",{className:"form-label"},"Temporary password"),R("input",{className:"form-input",value:f.password,onChange:e=>set("password",e.target.value),placeholder:"Worker uses this to log in"})),
      R("div",{className:"form-group"},
        R("label",{className:"form-label"},"Roles"),
        R("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
          ALL_ROLES.map(r=>R("button",{key:r,className:"btn btn-sm"+(f.roles.includes(r)?" btn-blue":""),onClick:()=>toggleRole(r)},rl(r)))
        )
      ),
      R("div",{className:"form-group"},
        R("label",{className:"form-label"},"Default availability"),
        R("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
          ALL_DAYS.map(d=>R("button",{key:d,className:"btn btn-sm"+(f.avail.includes(d)?" btn-blue":""),onClick:()=>toggleDay(d)},d))
        )
      ),
      R("div",{style:{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}},
        R("button",{className:"btn",onClick:onClose},"Cancel"),
        R("button",{className:"btn btn-blue",disabled:!valid,onClick:()=>valid&&addWorker(f)},"Add worker")
      )
    )
  );
}
function ImportModal({onClose,importCSV}){
  const[csv,setCsv]=useState("");
  return R("div",{className:"modal-wrap",onClick:e=>e.target.className==="modal-wrap"&&onClose()},
    R("div",{className:"modal"},
      R("div",{className:"modal-hdr"},R("span",{className:"modal-title"},"Import CSV"),R("button",{className:"btn btn-sm",onClick:onClose},"✕")),
      R("p",{style:{color:"#9BA3BF",fontSize:13,marginBottom:10}},"Columns: Location, Field, Division, Date (YYYY-MM-DD), Time, Away, Home. Division names auto-convert."),
      R("div",{style:{background:"#252A3D",borderRadius:8,padding:"8px 12px",fontFamily:"monospace",fontSize:11,color:"#9BA3BF",marginBottom:12,whiteSpace:"pre"}},"Location,Field,Division,Date,Time,Away,Home\nMission Viejo,Field 1,AA,2026-06-20,6:00 PM,Bears,Angels"),
      R("textarea",{className:"form-input",rows:6,value:csv,onChange:e=>setCsv(e.target.value),placeholder:"Paste CSV here...",style:{marginBottom:12}}),
      R("div",{style:{display:"flex",gap:8,justifyContent:"flex-end"}},R("button",{className:"btn",onClick:onClose},"Cancel"),R("button",{className:"btn btn-blue",onClick:()=>csv&&importCSV(csv)},"Import"))
    )
  );
}
