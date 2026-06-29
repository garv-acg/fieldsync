// ── Field Crew Reference ────────────────────────────────────────────
const BASEBALL_LINING=[
  {div:"Tee Ball",   base:"60'", mound:"-",      bb:"Y",foul:"Y",coach:"N",runner:"N",mnd:"N",rubber:"Y",pitch:"N",deck:"N"},
  {div:"Minors A",   base:"60'", mound:"-",      bb:"Y",foul:"Y",coach:"N",runner:"N",mnd:"N",rubber:"Y",pitch:"N",deck:"N"},
  {div:"Minors AA",  base:"60'", mound:"40'",    bb:"Y",foul:"Y",coach:"Y",runner:"Y",mnd:"Y",rubber:"N",pitch:"N",deck:"N"},
  {div:"Minors AAA", base:"60'", mound:"46'",    bb:"Y",foul:"Y",coach:"Y",runner:"Y",mnd:"Y",rubber:"N",pitch:"N",deck:"N"},
  {div:"Majors",     base:"60'", mound:"46'",    bb:"Y",foul:"Y",coach:"Y",runner:"Y",mnd:"Y",rubber:"N",pitch:"N",deck:"N"},
  {div:"Intermediates",base:"70'",mound:"50'",   bb:"Y",foul:"Y",coach:"Y",runner:"Y",mnd:"Y",rubber:"N",pitch:"N",deck:"Y"},
  {div:"Seniors",    base:"90'", mound:"60' 6\"",bb:"Y",foul:"Y",coach:"Y",runner:"Y",mnd:"Y",rubber:"N",pitch:"N",deck:"Y"},
];
const SOFTBALL_LINING=[
  {div:"8U Minors",  base:"60'", mound:"30'", bb:"Y",foul:"Y",coach:"N",runner:"N",mnd:"N",rubber:"Y",pitch:"Y",deck:"N"},
  {div:"10U Minors", base:"60'", mound:"35'", bb:"Y",foul:"Y",coach:"Y",runner:"Y",mnd:"N",rubber:"Y",pitch:"Y",deck:"N"},
  {div:"12U Majors", base:"60'", mound:"40'", bb:"Y",foul:"Y",coach:"Y",runner:"Y",mnd:"N",rubber:"Y",pitch:"Y",deck:"N"},
  {div:"16U Seniors",base:"60'", mound:"43'", bb:"Y",foul:"Y",coach:"Y",runner:"Y",mnd:"N",rubber:"Y",pitch:"Y",deck:"Y"},
];
const STEMS=[
  {field:"Field 1",s1:"Long", s2:"Long",s3:"Short"},
  {field:"Field 2",s1:"Short",s2:"Long",s3:"Long"},
  {field:"Field 3",s1:"Long", s2:"Long",s3:"Short"},
  {field:"Field 4",s1:"Long", s2:"Long",s3:"Long"},
];
const LINING_COLS=["Batters Box","Foul Lines","Coaches Box","Runner's Line","Mound","Rubber","Pitching Circle","On Deck Circle"];
const LINING_KEYS=["bb","foul","coach","runner","mnd","rubber","pitch","deck"];

function LiningTable({title,rows}){
  const th=s=>R("th",{key:s,style:{padding:"7px 9px",background:"#1e3a5f",color:"#fff",fontSize:10,fontWeight:700,textAlign:"center",whiteSpace:"nowrap"}},s);
  const yes=v=>v==="Y";
  return R("div",{style:{marginBottom:20}},
    R("div",{style:{fontSize:12,fontWeight:700,color:"#1e3a5f",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.8px"}},title),
    R("div",{style:{overflowX:"auto"}},
      R("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:11,border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}},
        R("thead",null,R("tr",null,
          R("th",{style:{padding:"7px 9px",background:"#1e3a5f",color:"#fff",fontSize:10,fontWeight:700,textAlign:"left",whiteSpace:"nowrap"}},"Division"),
          R("th",{style:{padding:"7px 9px",background:"#1e3a5f",color:"#fff",fontSize:10,fontWeight:700,textAlign:"center",whiteSpace:"nowrap"}},"Base Dist."),
          R("th",{style:{padding:"7px 9px",background:"#1e3a5f",color:"#fff",fontSize:10,fontWeight:700,textAlign:"center",whiteSpace:"nowrap"}},"Mound Dist."),
          ...LINING_COLS.map(th)
        )),
        R("tbody",null,rows.map((row,i)=>R("tr",{key:row.div,style:{background:i%2===0?"#fff":"#f8faff"}},
          R("td",{style:{padding:"7px 9px",fontWeight:600,color:"#111827",whiteSpace:"nowrap"}},row.div),
          R("td",{style:{padding:"7px 9px",textAlign:"center",color:"#374151"}},row.base),
          R("td",{style:{padding:"7px 9px",textAlign:"center",color:"#374151"}},row.mound),
          ...LINING_KEYS.map(k=>R("td",{key:k,style:{padding:"7px 9px",textAlign:"center"}},
            R("span",{style:{
              display:"inline-block",padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700,
              background:yes(row[k])?"#dcfce7":"#fee2e2",
              color:yes(row[k])?"#166534":"#991b1b"
            }},yes(row[k])?"YES":"NO")
          ))
        )))
      )
    )
  );
}

function FieldCrewResources(){
  return R("div",{style:{padding:"0 0 24px"}},
    R("div",{style:{marginBottom:20}},
      R("div",{style:{fontSize:11,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:3}},"Field Crew Reference"),
      R("h2",{style:{fontSize:20,fontWeight:700,color:"#111827",marginBottom:4}},"Lining Guide"),
      R("p",{style:{fontSize:12,color:"#6b7280"}},"Measurements and chalk lines required per division.")
    ),
    R(LiningTable,{title:"Baseball",rows:BASEBALL_LINING}),
    R(LiningTable,{title:"Softball",rows:SOFTBALL_LINING}),
    R("div",{style:{marginBottom:6,fontSize:12,fontWeight:700,color:"#1e3a5f",textTransform:"uppercase",letterSpacing:"0.8px"}},"Stem Lengths"),
    R("table",{style:{borderCollapse:"collapse",fontSize:11,border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden",minWidth:260}},
      R("thead",null,R("tr",null,
        ["Field","1st Base","2nd Base","3rd Base"].map(h=>R("th",{key:h,style:{padding:"7px 12px",background:"#1e3a5f",color:"#fff",fontSize:10,fontWeight:700,textAlign:h==="Field"?"left":"center"}},h))
      )),
      R("tbody",null,STEMS.map((row,i)=>R("tr",{key:row.field,style:{background:i%2===0?"#fff":"#f8faff"}},
        R("td",{style:{padding:"7px 12px",fontWeight:600,color:"#111827"}},row.field),
        [row.s1,row.s2,row.s3].map((v,j)=>R("td",{key:j,style:{padding:"7px 12px",textAlign:"center",color:"#374151"}},v))
      )))
    )
  );
}

// ── Snack Shack Interactive Checklist ────────────────────────────────
const ARRIVAL_CHECKLIST=[
  "Put out trash cans",
  "Turn on cheese",
  "Put on hot dogs",
  "Put up flag",
  "Restock back fridge",
  "Restock front fridge",
  "Prep nachos",
  "Sort otter pops",
];
const OPEN_CHECKLIST=[
  "Unlock and open snack shack doors",
  "Turn on lights",
  "Check cash drawer",
  "Set out price list / menu board",
  "Stock napkins and cups at counter",
  "Verify cooler temps (drinks ≤ 40°F)",
  "Wipe down prep surfaces and counter",
  "Confirm trash bags are in place",
];
const CLOSE_CHECKLIST=[
  "Take out trash",
  "Empty and clean cheese cans",
  "Take down flag",
  "Turn off and clean microwaves",
  "Sweep floor",
  "Clean hot dog roller",
  "Clean counters",
  "Restock fridges",
  "Restock chips",
  "Clean cheese spoon",
  "Unplug everything",
  "Lock all doors and windows",
];
const INVENTORY=[
  {cat:"Hot Food",     items:["Hot dogs","Hot dog buns","Jalapeños","Burgers","Burger buns","Sliced cheese","Pretzels","Nacho chips","Nacho cheese","Pickles","Ketchup","Mustard"]},
  {cat:"Cold & Frozen",items:["Icee","Otter pops","Ice cream","Ice cream Snickers"]},
  {cat:"Snacks & Candy",items:["Chips","Variety chips","Snickers","Skittles","Starburst","Twix","M&Ms","Peanut M&Ms"]},
  {cat:"Drinks",       items:["Water","Coke","Coke Zero","Sprite","Root beer","Dr Pepper","Diet","Mtn Dew","Gatorade"]},
  {cat:"Supplies",     items:["Napkins","Paper towels","Nacho trays","Little cups","Little lids","Plates","Gloves","Tin foil","Clorox wipes","Burger grease tray"]},
];

function SnackShackResources({effectiveUser}){
  const[tab,setTab]=useState("arrival");
  const[arrivalChecked,setArrivalChecked]=useState({});
  const[closeChecked,setCloseChecked]=useState({});
  const[needed,setNeeded]=useState({});

  const toggle=(setFn,key)=>setFn(p=>({...p,[key]:!p[key]}));
  const toggleNeeded=item=>setNeeded(p=>({...p,[item]:!p[item]}));

  const orderList=INVENTORY.flatMap(c=>c.items.filter(i=>needed[i]));
  const arrivalDone=Object.values(arrivalChecked).filter(Boolean).length;
  const closeDone=Object.values(closeChecked).filter(Boolean).length;

  const copyOrder=()=>{
    const text="📦 Snack Shack Order Request\n\nItems needed:\n"+orderList.map(i=>"• "+i).join("\n");
    navigator.clipboard.writeText(text).then(()=>alert("Order list copied to clipboard!")).catch(()=>alert(text));
  };

  const tabBtn=(id,label,done,total)=>R("button",{
    onClick:()=>setTab(id),
    style:{flex:1,padding:"9px 4px",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:600,
      background:tab===id?"#1e3a5f":"#f1f5f9",color:tab===id?"#fff":"#374151",transition:"all 0.15s"}
  },label,done>0&&R("span",{style:{marginLeft:4,fontSize:9,opacity:0.8}},"("+done+"/"+total+")"));

  const makeList=(list,checked,setChecked,doneMsg)=>R("div",null,
    R("div",{style:{fontSize:12,color:"#6b7280",marginBottom:10}},
      Object.values(checked).filter(Boolean).length+" of "+list.length+" tasks complete"
    ),
    R("div",{style:{display:"flex",flexDirection:"column",gap:4}},
      list.map((item,i)=>{
        const on=!!checked[i];
        return R("div",{key:i,onClick:()=>toggle(setChecked,i),
          style:{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",
            background:on?"#f0fdf4":"#fff",border:"1px solid",
            borderColor:on?"#86efac":"#e5e7eb",borderRadius:8,cursor:"pointer",transition:"all 0.15s"}},
          R("div",{style:{width:20,height:20,borderRadius:5,border:"2px solid",flexShrink:0,
            borderColor:on?"#16a34a":"#d1d5db",background:on?"#16a34a":"#fff",
            display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700}},
            on?"✓":""),
          R("span",{style:{fontSize:13,color:on?"#166534":"#374151",
            textDecoration:on?"line-through":"none",textDecorationColor:"#86efac"}},item)
        );
      })
    ),
    Object.values(checked).filter(Boolean).length===list.length&&R("div",{style:{marginTop:14,padding:"12px 16px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,textAlign:"center",fontSize:13,fontWeight:600,color:"#166534"}},
      doneMsg
    )
  );

  return R("div",{style:{paddingBottom:24}},
    R("div",{style:{marginBottom:16}},
      R("div",{style:{fontSize:11,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:3}},"Snack Shack"),
      R("h2",{style:{fontSize:20,fontWeight:700,color:"#111827",marginBottom:4}},"Checklists & Inventory"),
      R("p",{style:{fontSize:12,color:"#6b7280"}},"Check off tasks as you go. Mark inventory items as needed to build an order list.")
    ),

    // Tab bar
    R("div",{style:{display:"flex",gap:6,marginBottom:16}},
      tabBtn("arrival","Arrival",arrivalDone,ARRIVAL_CHECKLIST.length),
      tabBtn("close","Nightly",closeDone,CLOSE_CHECKLIST.length),
      tabBtn("inventory","Inventory",orderList.length,0)
    ),

    tab==="arrival"&&makeList(ARRIVAL_CHECKLIST,arrivalChecked,setArrivalChecked,"✓ Arrival setup complete — ready to open!"),
    tab==="close"&&makeList(CLOSE_CHECKLIST,closeChecked,setCloseChecked,"✓ Nightly chores done — good work tonight!"),

    // Inventory
    tab==="inventory"&&R("div",null,
      R("div",{style:{fontSize:12,color:"#6b7280",marginBottom:10}},
        "Tap any item that is low or out of stock. When done, generate an order list to send to the manager."
      ),
      INVENTORY.map(cat=>R("div",{key:cat.cat,style:{marginBottom:14}},
        R("div",{style:{fontSize:11,fontWeight:700,color:"#1e3a5f",textTransform:"uppercase",
          letterSpacing:"0.8px",marginBottom:6,paddingBottom:4,borderBottom:"1px solid #e5e7eb"}},cat.cat),
        R("div",{style:{display:"flex",flexDirection:"column",gap:4}},
          cat.items.map(item=>{
            const isNeeded=!!needed[item];
            return R("div",{key:item,onClick:()=>toggleNeeded(item),
              style:{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",
                background:isNeeded?"#fff7ed":"#fff",border:"1px solid",
                borderColor:isNeeded?"#fed7aa":"#e5e7eb",borderRadius:8,cursor:"pointer",
                transition:"all 0.15s"}},
              R("div",{style:{width:20,height:20,borderRadius:5,border:"2px solid",flexShrink:0,
                borderColor:isNeeded?"#f97316":"#d1d5db",background:isNeeded?"#f97316":"#fff",
                display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700}},
                isNeeded?"!":""),
              R("span",{style:{fontSize:13,color:isNeeded?"#c2410c":"#374151",fontWeight:isNeeded?600:400}},item),
              isNeeded&&R("span",{style:{marginLeft:"auto",fontSize:10,color:"#f97316",fontWeight:600}},"NEEDED")
            );
          })
        )
      )),

      orderList.length>0&&R("div",{style:{marginTop:8,padding:"14px 16px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10}},
        R("div",{style:{fontSize:13,fontWeight:700,color:"#92400e",marginBottom:10}},
          "📦 Order List ("+orderList.length+" item"+(orderList.length!==1?"s":"")+")"
        ),
        R("div",{style:{display:"flex",flexDirection:"column",gap:5,marginBottom:12}},
          orderList.map(item=>R("div",{key:item,style:{fontSize:12,color:"#374151",paddingLeft:8,borderLeft:"3px solid #f97316"}},item))
        ),
        R("button",{onClick:copyOrder,
          style:{width:"100%",padding:"11px",background:"#f97316",color:"#fff",border:"none",borderRadius:8,
            fontSize:13,fontWeight:700,cursor:"pointer"}},
          "📋 Copy order list to clipboard"
        )
      ),
      orderList.length===0&&R("div",{style:{marginTop:8,padding:"12px 16px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,fontSize:12,color:"#166534",textAlign:"center"}},
        "✓ No items marked as needed"
      )
    )
  );
}

// ── Resources view (role-aware) ──────────────────────────────────────
function ResourcesView({effectiveUser}){
  const isConcessions=hasRole(effectiveUser,"concessions");
  const isField=hasRole(effectiveUser,"field");
  const isUmp=hasRole(effectiveUser,"umpire")&&!isConcessions&&!isField;

  // Workers with multiple roles see both sections
  return R("div",{className:"view-wrap"},
    (isField||isUmp)&&R(FieldCrewResources,null),
    isConcessions&&(isField||isUmp)&&R("div",{style:{height:2,background:"#e5e7eb",margin:"8px 0 24px"}}),
    isConcessions&&R(SnackShackResources,{effectiveUser}),
    !isField&&!isConcessions&&!isUmp&&R("div",{style:{padding:"32px 0",textAlign:"center",color:"#9ca3af",fontSize:14}},"No resources available for your role.")
  );
}
