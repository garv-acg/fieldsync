function LocsView({locs,games,setModal}){
  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Locations")),R("button",{className:"btn btn-blue",onClick:()=>setModal({type:"add_loc"})},"+  Add location")),
    R("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}},locs.map(loc=>{
      const lg=games.filter(g=>g.locId===loc.id);
      return R("div",{key:loc.id,className:"card"},
        R("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},R("span",{style:{fontWeight:700,fontSize:15}},loc.name),R("button",{className:"btn btn-sm",onClick:()=>setModal({type:"add_field",locId:loc.id,locName:loc.name})},"+  Field")),
        R("div",{style:{fontSize:12,color:"#9BA3BF",marginBottom:10}},lg.length+" games"),
        loc.fields.map(field=>R("div",{key:field,style:{display:"flex",justifyContent:"space-between",padding:"7px 0",borderTop:"1px solid #2E3450"}},R("span",null,field),R("span",{style:{color:"#9BA3BF",fontSize:12}},lg.filter(g=>g.field===field).length+" games")))
      );
    }))
  );
}
