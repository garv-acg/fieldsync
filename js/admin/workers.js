function WorkersView({workers,games,da}){
  return R("div",null,
    R("div",{className:"ph"},R("div",null,R("h2",null,"Workers"))),
    R("div",{className:"card"},R("table",{className:"tbl"},
      R("thead",null,R("tr",null,R("th",null,"Name"),R("th",null,"Role"),R("th",null,"Email"),R("th",null,"Available"),R("th",null,"Assigned"))),
      R("tbody",null,workers.map(w=>{
        let cnt=0;
        if(w.role==="umpire")cnt=games.filter(g=>g.ump1===w.id||g.ump2===w.id).length;
        else if(w.role==="field")cnt=Object.values(da).filter(d=>(d.fieldCrew||[]).includes(w.id)).length;
        else cnt=Object.values(da).filter(d=>(d.concessions||[]).includes(w.id)).length;
        return R("tr",{key:w.id},
          R("td",null,R("span",{style:{fontWeight:700}},w.name)),
          R("td",null,R("span",{className:"badge "+rb(w.role)},rl(w.role))),
          R("td",null,R("span",{style:{color:"#9BA3BF",fontSize:12}},w.email)),
          R("td",null,R("div",{style:{display:"flex",gap:3,flexWrap:"wrap"}},w.avail.map(d=>R("span",{key:d,style:{padding:"1px 6px",borderRadius:4,fontSize:11,background:"#252A3D",color:"#9BA3BF"}},d)))),
          R("td",null,R("span",{style:{fontWeight:700}},cnt))
        );
      }))
    ))
  );
}
