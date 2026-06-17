function GamesView({games,locs,workers,setModal,setUmp,setGS,isPub}){
  const sorted=[...games].sort((a,b)=>new Date(a.date)-new Date(b.date));
  return R("div",null,
    R("div",{className:"ph"},
      R("div",null,R("h2",null,"Games"),R("p",null,sorted.length+" total")),
      R("div",{style:{display:"flex",gap:8}},
        R("button",{className:"btn",onClick:()=>setModal({type:"import"})},"Import CSV"),
        R("button",{className:"btn btn-blue",onClick:()=>setModal({type:"add_game"})},"+  Add game")
      )
    ),
    sorted.map(game=>{
      const loc=locs.find(l=>l.id===game.locId),p=isPub(game.date);
      return R("div",{key:game.id,style:{background:"#181C27",border:"1px solid #2E3450",borderRadius:10,padding:"12px 14px",marginBottom:10}},
        R("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}},
          R("span",{style:{fontWeight:700}},game.division),
          isDual(game.division)&&R("span",{className:"badge b-purple",style:{fontSize:9}},"2 umps"),
          R("span",{className:"badge b-blue",style:{fontSize:10}},loc?.name||"?"),
          R("span",{style:{color:"#9BA3BF",fontSize:12}},game.date+" · "+game.time+" · "+game.field),
          (game.away||game.home)&&R("span",{style:{color:"#6B7394",fontSize:11}},game.away+" vs "+game.home),
          R("span",{className:"badge "+(p?"b-green":"b-amber"),style:{fontSize:10,marginLeft:"auto"}},p?"Published":"Draft"),
          R("select",{className:"inline-sel",style:{fontSize:11},value:game.status,onChange:e=>setGS(game.id,e.target.value)},STATS.map(s=>R("option",{key:s,value:s},s))),
          R("button",{className:"btn btn-sm",onClick:()=>setModal({type:"edit_game",game})},"Edit"),
          R("button",{className:"btn btn-sm",style:{background:"#3D1A1A",color:"#F09090",borderColor:"#E05555"},onClick:()=>setModal({type:"confirm_del",gameId:game.id})},"Del")
        ),
        R(UmpSlots,{game,workers,setUmp})
      );
    })
  );
}
