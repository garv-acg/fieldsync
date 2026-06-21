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
const wkKey=date=>{if(!date||typeof date!=="string")return null;const d=new Date(date+"T12:00:00");if(isNaN(d.getTime()))return null;const m=new Date(d);m.setDate(d.getDate()-d.getDay());return m.toISOString().slice(0,10)};
const hasRole=(w,role)=>(w.roles&&w.roles.length?w.roles:[w.role]).includes(role);
const wa=(w,date,requests,role)=>{
  const dow=WDAYS[new Date(date+"T12:00:00").getDay()];
  const avail=role&&w.availByRole&&w.availByRole[role]&&w.availByRole[role].length
    ?w.availByRole[role]:w.avail||[];
  if(!avail.includes(dow))return false;
  if(!requests)return true;
  return!requests.some(r=>{
    if(r.workerId!==w.id||r.status!=="approved")return false;
    if(r.type!=="time_off"&&r.type!=="vacation")return false;
    const start=r.dateStart||r.date,end=r.dateEnd||r.dateStart||r.date;
    return date>=start&&date<=end;
  });
};
const rsvpKey=(wId,date,locId)=>`${wId}_${date}_${locId}`;
const timeToMin=t=>{const m=(t||"").match(/(\d+):(\d+)\s*(AM|PM)/i);if(!m)return 0;let h=parseInt(m[1],10);const mn=parseInt(m[2],10),ap=m[3].toUpperCase();if(ap==="PM"&&h!==12)h+=12;if(ap==="AM"&&h===12)h=0;return h*60+mn};
const normDiv=raw=>{if(!raw)return"AA";if(raw.toLowerCase().includes("9-11")||raw.toLowerCase().includes("district"))return"Majors";return{"Minors AA":"AA","Minors AAA":"AAA","Minors A":"A","Teeball":"Tee Ball","T-Ball":"Tee Ball","8U":"Softball 8U","10U":"Softball 10U","12U":"Softball 12U"}[raw]||raw};
const PAY_DEFAULTS={umpireRate:45,fieldRate:34,concessionsRate:17};
const LOCS=[{id:"sc",name:"Spring Creek",fields:["Field 1","Field 2","Field 3"],hasSnackShack:false},{id:"mv",name:"Mission Viejo",fields:["Field 1","Field 2","Field 3","Field 4"],hasSnackShack:true}];
const WORKERS=[
  // ── Umpires (placeholder — real umpires TBD) ──────────────────────
  {id:1,name:"Jordan Lee",role:"umpire",roles:["umpire","field","concessions"],email:"jordan@crew.com",avail:["Mon","Wed","Fri","Sat","Sun"],password:"ump"},
  {id:2,name:"Sam Rivera",role:"umpire",email:"sam@crew.com",avail:["Tue","Thu","Sat","Sun"],password:"ump2"},
  {id:3,name:"Riley Stone",role:"umpire",email:"riley@crew.com",avail:["Wed","Thu","Sat","Sun"],password:"ump3"},
  {id:4,name:"Taylor Brooks",role:"umpire",email:"taylor@crew.com",avail:["Mon","Tue","Fri","Sat"],password:"ump4"},
  // ── Field crew ────────────────────────────────────────────────────
  {id:5,name:"Aidan Garver",role:"field",roles:["field","concessions"],email:"aidan.garver@crew.com",avail:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],yearsExp:6,password:"aidan"},
  {id:6,name:"Brennan Niewinski",role:"field",email:"brennan.niewinski@crew.com",avail:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],yearsExp:6,password:"brennan"},
  {id:7,name:"Brock Benedict",role:"field",email:"brock.benedict@crew.com",avail:["Mon","Wed"],yearsExp:1,password:"brock"},
  {id:8,name:"Trey Felts",role:"field",email:"trey.felts@crew.com",avail:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],yearsExp:1,password:"trey"},
  {id:9,name:"Amelia Deatherage",role:"field",email:"amelia.deatherage@crew.com",avail:["Mon","Wed","Fri","Sat"],yearsExp:1,password:"amelia"},
  {id:10,name:"Dylan Keisler",role:"field",email:"dylan.keisler@crew.com",avail:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],yearsExp:3,password:"dylan"},
  // NOTE: Caroline and Lucy should be scheduled on the same shifts when possible
  {id:11,name:"Caroline Pavlisko",role:"field",email:"caroline.pavlisko@crew.com",avail:["Mon","Wed","Fri"],yearsExp:1,password:"caroline"},
  {id:18,name:"Emerson Hain",role:"field",email:"emerson.hain@crew.com",avail:["Mon","Tue"],yearsExp:0,password:"emerson"},
  {id:12,name:"Lucy Davis",role:"field",email:"lucy.davis@crew.com",avail:["Mon","Wed","Sat"],yearsExp:1,password:"lucy"},
  // ── Snack shack (concessions) ────────────────────────────────────
  // NOTE: Ben and Jack must be scheduled together on the same shift
  {id:14,name:"Ben Stith",role:"concessions",email:"ben.stith@crew.com",avail:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],yearsExp:0,password:"ben"},
  {id:15,name:"Jack Stith",role:"concessions",email:"jack.stith@crew.com",avail:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],yearsExp:0,password:"jack"},
  {id:16,name:"Juliana Stith",role:"concessions",email:"juliana.stith@crew.com",avail:[],yearsExp:0,password:"juliana"}, // Cashier — manual only
];
const INIT_GAMES=[];
const INIT_DA={};
const INIT_PUB=new Set([]);
const INIT_RSVP={};
const INIT_REQUESTS=[
  // ── Field crew vacations (pre-approved) ───────────────────────────
  {id:301,type:"vacation",workerId:7,dateStart:"2026-06-08",dateEnd:"2026-06-21",reason:"Vacation",status:"approved",created:"2026-06-01"},   // Brock
  {id:302,type:"vacation",workerId:9,dateStart:"2026-06-19",dateEnd:"2026-06-27",reason:"Vacation",status:"approved",created:"2026-06-01"},   // Amelia
  {id:303,type:"time_off",workerId:10,dateStart:"2026-06-27",dateEnd:"2026-06-27",reason:"Time off",status:"approved",created:"2026-06-01"}, // Dylan Jun 27
  {id:304,type:"time_off",workerId:12,dateStart:"2026-06-21",dateEnd:"2026-06-21",reason:"Time off",status:"approved",created:"2026-06-01"}, // Lucy Jun 21
  {id:305,type:"vacation",workerId:9,dateStart:"2026-07-06",dateEnd:"2026-07-09",reason:"Vacation",status:"approved",created:"2026-06-01"},   // Amelia Jul 6–9
  {id:306,type:"vacation",workerId:9,dateStart:"2026-07-13",dateEnd:"2026-07-16",reason:"Vacation",status:"approved",created:"2026-06-01"},   // Amelia Jul 13–16
  {id:307,type:"vacation",workerId:8,dateStart:"2026-07-19",dateEnd:"2026-07-31",reason:"Vacation",status:"approved",created:"2026-06-01"},   // Trey Jul 19–31
  {id:308,type:"time_off",workerId:11,dateStart:"2026-07-22",dateEnd:"2026-07-22",reason:"Time off",status:"approved",created:"2026-06-01"}, // Caroline Jul 22
  {id:309,type:"vacation",workerId:9,dateStart:"2026-07-29",dateEnd:"2026-08-02",reason:"Vacation",status:"approved",created:"2026-06-01"},   // Amelia Jul 29–Aug 2
  {id:310,type:"time_off",workerId:10,dateStart:"2026-08-13",dateEnd:"2026-08-13",reason:"Time off",status:"approved",created:"2026-06-01"}, // Dylan Aug 13
  // ── Snack shack specific-date blocks ─────────────────────────────
  {id:311,type:"time_off",workerId:14,dateStart:"2026-07-15",dateEnd:"2026-07-15",reason:"Unavailable",status:"approved",created:"2026-06-01"}, // Ben Jul 15
  {id:312,type:"time_off",workerId:16,dateStart:"2026-07-20",dateEnd:"2026-07-20",reason:"Not available",status:"approved",created:"2026-06-01"}, // Juliana Jul 20
  {id:313,type:"time_off",workerId:16,dateStart:"2026-07-27",dateEnd:"2026-07-27",reason:"Not available",status:"approved",created:"2026-06-01"}, // Juliana Jul 27
];
const INIT_NOTIFS=[];
