const {useState,useEffect,useMemo}=React;
const R=React.createElement;
const DIVS=["Tee Ball","A","AA","AAA","Majors","Intermediates","Seniors","Softball 8U","Softball 10U","Softball 12U"];
const DUAL=["AAA","Majors","Intermediates","Seniors","Softball 10U","Softball 12U"];
const TIMES=["7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","6:30 PM","7:00 PM"];
const WDAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const NONE=0,FC=4;
const STATS=["scheduled","cancelled","postponed","completed"];
const ini=n=>n.split(" ").map(x=>x[0]).join("");
const rl=r=>r==="umpire"?"Umpire":r==="field"?"Field Crew":"Concessions";
const rb=r=>r==="umpire"?"b-purple":r==="field"?"b-green":"b-amber";
const isDual=d=>DUAL.includes(d);
const dk=(date,locId)=>date+"|"+locId;
const wkKey=date=>{const d=new Date(date+"T12:00:00"),m=new Date(d);m.setDate(d.getDate()-d.getDay());return m.toISOString().slice(0,10)};
const wa=(w,date,requests)=>{
  if(!w.avail.includes(WDAYS[new Date(date+"T12:00:00").getDay()]))return false;
  if(!requests)return true;
  return!requests.some(r=>{
    if(r.workerId!==w.id||r.status!=="approved")return false;
    if(r.type!=="time_off"&&r.type!=="vacation")return false;
    const start=r.dateStart||r.date,end=r.dateEnd||r.dateStart||r.date;
    return date>=start&&date<=end;
  });
};
const rsvpKey=(wId,date,locId)=>`${wId}_${date}_${locId}`;
const normDiv=raw=>{if(!raw)return"AA";if(raw.toLowerCase().includes("9-11")||raw.toLowerCase().includes("district"))return"Majors";return{"Minors AA":"AA","Minors AAA":"AAA","Minors A":"A","Teeball":"Tee Ball","T-Ball":"Tee Ball","8U":"Softball 8U","10U":"Softball 10U","12U":"Softball 12U"}[raw]||raw};
const PAY_DEFAULTS={umpireRate:45,fieldRate:34,concessionsRate:17};
const LOCS=[{id:"sc",name:"Spring Creek",fields:["Field 1","Field 2","Field 3"]},{id:"mv",name:"Mission Viejo",fields:["Field 1","Field 2","Field 3","Field 4"]}];
const WORKERS=[
  {id:1,name:"Jordan Lee",role:"umpire",email:"jordan@crew.com",avail:["Mon","Wed","Fri","Sat","Sun"],password:"ump"},
  {id:2,name:"Sam Rivera",role:"umpire",email:"sam@crew.com",avail:["Tue","Thu","Sat","Sun"],password:"ump2"},
  {id:3,name:"Riley Stone",role:"umpire",email:"riley@crew.com",avail:["Wed","Thu","Sat","Sun"],password:"ump3"},
  {id:4,name:"Taylor Brooks",role:"umpire",email:"taylor@crew.com",avail:["Mon","Tue","Fri","Sat"],password:"ump4"},
  {id:5,name:"Alex Kim",role:"field",email:"alex@crew.com",avail:["Mon","Tue","Wed","Sat","Sun"],password:"field"},
  {id:6,name:"Morgan Chase",role:"field",email:"morgan@crew.com",avail:["Thu","Fri","Sat","Sun"],password:"field2"},
  {id:7,name:"Quinn Davis",role:"field",email:"quinn@crew.com",avail:["Mon","Tue","Thu","Sat"],password:"field3"},
  {id:8,name:"Jamie Reed",role:"field",email:"jamie@crew.com",avail:["Wed","Fri","Sat","Sun"],password:"field4"},
  {id:9,name:"Casey Park",role:"concessions",email:"casey@crew.com",avail:["Fri","Sat","Sun"],password:"conc"},
  {id:10,name:"Drew Walsh",role:"concessions",email:"drew@crew.com",avail:["Mon","Wed","Sat","Sun"],password:"conc2"},
  {id:11,name:"Skyler Moss",role:"concessions",email:"skyler@crew.com",avail:["Tue","Thu","Sat","Sun"],password:"conc3"},
];
const INIT_GAMES=[
  {id:1001,locId:"sc",field:"Field 1",division:"AA",date:"2026-06-13",time:"9:00 AM",home:"Angels",away:"Bears",status:"scheduled",ump1:1,ump2:NONE},
  {id:1002,locId:"sc",field:"Field 2",division:"AAA",date:"2026-06-13",time:"11:00 AM",home:"Cardinals",away:"Dodgers",status:"scheduled",ump1:2,ump2:3},
  {id:1003,locId:"mv",field:"Field 1",division:"Majors",date:"2026-06-14",time:"10:00 AM",home:"Eagles",away:"Falcons",status:"scheduled",ump1:1,ump2:4},
  {id:1004,locId:"mv",field:"Field 3",division:"Softball 12U",date:"2026-06-14",time:"1:00 PM",home:"Giants",away:"Hawks",status:"scheduled",ump1:3,ump2:NONE},
  {id:1005,locId:"sc",field:"Field 3",division:"AA",date:"2026-06-15",time:"9:00 AM",home:"Indians",away:"Jets",status:"scheduled",ump1:NONE,ump2:NONE},
  {id:1006,locId:"mv",field:"Field 2",division:"Tee Ball",date:"2026-06-15",time:"8:00 AM",home:"Kings",away:"Lions",status:"scheduled",ump1:NONE,ump2:NONE},
  {id:1007,locId:"sc",field:"Field 2",division:"Majors",date:"2026-06-13",time:"9:00 AM",home:"Sox",away:"Tigers",status:"scheduled",ump1:4,ump2:NONE},
];
const INIT_DA={"2026-06-13|sc":{fieldCrew:[5,6,7,8],concessions:[9,10]},"2026-06-14|mv":{fieldCrew:[6,8],concessions:[10,11]},"2026-06-14|sc":{fieldCrew:[5,7],concessions:[9]}};
const INIT_PUB=new Set(["2026-06-08"]);
const INIT_RSVP={[rsvpKey(1,"2026-06-13","sc")]:"confirmed",[rsvpKey(5,"2026-06-13","sc")]:"confirmed"};
const INIT_REQUESTS=[{id:201,type:"time_off",workerId:1,dateStart:"2026-06-20",dateEnd:"2026-06-20",reason:"Family event",status:"pending",created:"2026-06-05"}];
const INIT_NOTIFS=[{id:1,workerId:1,msg:"Week of June 8 published — check your shifts.",time:"Today",read:false,type:"info"}];
