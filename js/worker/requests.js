function MyReqs({user,requests,subReq}){
  const[type,setType]=useState("time_off"),[ds,setDs]=useState(""),[de,setDe]=useState(""),[reason,setR]=useState(""),[tab,setTab]=useState("list");
  const mine=requests.filter(r=>r.workerId===user.id);
  const submit=()=>{if(!ds||!reason)return;subReq({type,workerId:user.id,dateStart:ds,dateEnd:type==="vacation"?de:ds,reason});setTab("list");setDs("");setDe("");setR("")};
  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"My requests"))),
    R("div",{style:{display:"flex",gap:4,marginBottom:14}},R("button",{className:"btn btn-sm"+(tab==="list"?" btn-blue":""),onClick:()=>setTab("list")},"My requests"),R("button",{className:"btn btn-sm"+(tab==="new"?" btn-blue":""),onClick:()=>setTab("new")},"New request")),
    tab==="list"?R("div",{className:"card"},mine.length===0?R("div",{className:"empty"},"No requests yet."):mine.map(r=>{
      const tl=r.type==="vacation"?"Vacation":r.type==="time_off"?"Time off":"Shift swap",dl=r.type==="vacation"&&r.dateEnd&&r.dateEnd!==r.dateStart?r.dateStart+" → "+r.dateEnd:r.dateStart||r.date||"";
      return R("div",{key:r.id,style:{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #2E3450"}},
        R("div",{style:{flex:1}},R("div",{style:{fontWeight:700}},tl),dl&&R("div",{style:{fontSize:12,color:"#9BA3BF",marginTop:2}},dl),r.reason&&R("div",{style:{fontSize:12,color:"#6B7394"}},r.reason)),
        R("span",{className:"badge "+(r.status==="pending"?"b-amber":r.status==="approved"?"b-green":"b-red")},r.status)
      );
    })):
    R("div",{className:"card"},
      R("div",{style:{display:"flex",gap:6,marginBottom:14}},
        R("button",{className:"btn btn-sm"+(type==="time_off"?" btn-blue":""),onClick:()=>setType("time_off")},"Single day"),
        R("button",{className:"btn btn-sm"+(type==="vacation"?" btn-blue":""),onClick:()=>setType("vacation")},"Vacation"),
        R("button",{className:"btn btn-sm"+(type==="swap"?" btn-blue":""),onClick:()=>setType("swap")},"Shift swap")
      ),
      type==="vacation"&&R("div",{style:{background:"#2D1D5C",border:"1px solid #8B5CF6",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:13,color:"#C4A8FC"}},"Select your first and last day off."),
      R("div",{className:type==="vacation"?"g2":""},
        R("div",{className:"form-group"},R("label",{className:"form-label"},type==="vacation"?"Start date":"Date"),R("input",{type:"date",className:"form-input",value:ds,onChange:e=>setDs(e.target.value)})),
        type==="vacation"&&R("div",{className:"form-group"},R("label",{className:"form-label"},"End date"),R("input",{type:"date",className:"form-input",value:de,onChange:e=>setDe(e.target.value)}))
      ),
      R("div",{className:"form-group"},R("label",{className:"form-label"},"Reason"),R("textarea",{className:"form-input",rows:3,value:reason,onChange:e=>setR(e.target.value),placeholder:"e.g. Family vacation..."})),
      R("button",{className:"btn btn-blue",style:{width:"100%",justifyContent:"center",padding:"10px"},disabled:!ds||!reason,onClick:submit},"Submit request")
    )
  );
}
