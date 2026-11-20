/* ============ POps reference data and lookups. Names and records come from the server. ============ */
const {useState,useEffect,useMemo,useRef,useCallback,createContext,useContext}=React;
const html=htm.bind(React.createElement);
const Ctx=createContext(null);
const useApp=()=>useContext(Ctx);

const KES=n=>'KES '+Math.round(n).toLocaleString('en-US');
const KESk=n=>n>=1e6?'KES '+(n/1e6).toFixed(2)+'M':n>=1e4?'KES '+(n/1e3).toFixed(1)+'k':KES(n);
const pad=n=>String(n).padStart(2,'0');
const stamp=(d=new Date())=>`${pad(d.getDate())} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;

/* ---------- Iweni LMMA coordinates, exactly as supplied by the client ---------- */
const LMMA_PTS=[
 {n:1,lat:`02°12'37.94" S`,lon:`41°01'11.55" E`},
 {n:2,lat:`02°12'54.28" S`,lon:`41°01'18.63" E`,ref:true},
 {n:3,lat:`02°13'06.64" S`,lon:`41°00'54.3" E`},
 {n:4,lat:`02°13'14.3" S`,lon:`41°00'42.5" E`,ref:true},
 {n:5,lat:`02°13'02.9" S`,lon:`41°00'29.6" E`},
 {n:6,lat:`02°12'49.5" S`,lon:`41°00'02.28" E`},
 {n:7,lat:`02°12'44.42" S`,lon:`41°00'03.12" E`},
 {n:8,lat:`02°12'47.06" S`,lon:`41°00'16.08" E`},
 {n:9,lat:`02°12'48.5" S`,lon:`41°00'33.9" E`},
 {n:10,lat:`02°12'45.8" S`,lon:`41°00'49.5" E`},
 {n:11,lat:`02°12'32.8" S`,lon:`41°00'02" E`,ref:true},
 {n:12,lat:`02°12'14.5" S`,lon:`41°00'57.2" E`}
];
const parseDMS=s=>{const m=s.match(/(\d+)°(\d+)'([\d.]+)"\s*([NSEW])/);const v=+m[1]+(+m[2])/60+(+m[3])/3600;return (m[4]==='S'||m[4]==='W')?-v:v;};
LMMA_PTS.forEach(p=>{p.la=parseDMS(p.lat);p.lo=parseDMS(p.lon);});

/* ---------- map projection (equirectangular, 40000 px per degree) ---------- */
const MAP={W:960,H:800,lon0:40.999,lat0:-2.2015,k:40000};
const proj=(la,lo)=>[(lo-MAP.lon0)*MAP.k,(MAP.lat0-la)*MAP.k];
const unproj=(x,y)=>[MAP.lat0-y/MAP.k,MAP.lon0+x/MAP.k];
const toDMS=(v,pos,neg)=>{const h=v<0?neg:pos;v=Math.abs(v);const d=Math.floor(v);const m=Math.floor((v-d)*60);const s=((v-d)*60-m)*60;return `${pad(d)}°${pad(m)}'${s.toFixed(1)}" ${h}`;};
LMMA_PTS.forEach(p=>{[p.x,p.y]=proj(p.la,p.lo);});
const hull=pts=>{const P=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[];for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}const up=[];for(const p of P.reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}up.pop();lo.pop();return lo.concat(up);};
const OUTER=hull(LMMA_PTS.map(p=>[p.x,p.y]));
const CORE=hull(LMMA_PTS.filter(p=>[5,6,7,8,9,10].includes(p.n)).map(p=>[p.x,p.y]));

/* ---------- roles & permissions (w = create/edit, s = own or assigned records, r = read only) ---------- */
const MODS=[
 {id:'dashboard',label:'Dashboard',icon:'dashboard',group:'Overview',fn:'Organizational and role-specific overview'},
 {id:'live-map',label:'Live Operations Map',icon:'map',group:'Operations',fn:'Maps, patrols, incidents and conservation locations'},
 {id:'patrols',label:'Patrols & Field Activities',icon:'patrol',group:'Operations',fn:'Ranger patrol operations and field records'},
 {id:'incidents',label:'Events & Incidents',icon:'incident',group:'Operations',fn:'Incident reporting and follow-up'},
 {id:'iweni-lmma',label:'Iweni LMMA Management',icon:'lmma',group:'Conservation',fn:'LMMA boundaries, zones and activities'},
 {id:'projects',label:'Conservation Projects',icon:'projects',group:'Conservation',fn:'Project workspaces and progress'},
 {id:'staff',label:'Staff & Users',icon:'staff',group:'Organisation',fn:'Staff records and user management'},
 {id:'bmus',label:'BMUs & Governance',icon:'bmus',group:'Organisation',fn:'BMU and Board records'},
 {id:'partners',label:'Stakeholders & Partners',icon:'partners',group:'Organisation',fn:'Partner management'},
 {id:'boats',label:'Boats & Equipment',icon:'boat',group:'Organisation',fn:'Assets, boats and maintenance'},
 {id:'tourism',label:'Tourism & Finance',icon:'finance',group:'Income',fn:'Visitors, boat fees, payments, donations and approval by the Board Chair'},
 {id:'import',label:'Import Paper Logs',icon:'reports',group:'Admin',fn:'Type or paste historical paper logs'},
 {id:'reports',label:'Reports & Documents',icon:'reports',group:'Insight',fn:'Reporting and document archive'},
 {id:'permissions',label:'Settings & Permissions',icon:'settings',group:'Admin',fn:'Roles and system settings'},
 {id:'audit',label:'Audit Trail',icon:'audit',group:'Admin',fn:'Activity and access history'},
 {id:'guide',label:'Guide',icon:'reports',group:'Help',fn:'How to use POps, SOS and templates'}
];
const ROLES={
 admin:{label:'Super Admin',sub:'CBO Manager / LMMA Manager',user:'',ini:'',
  mods:{dashboard:'w','live-map':'w',patrols:'w',incidents:'w','iweni-lmma':'w',projects:'w',coral:'w',staff:'w',bmus:'w',partners:'w',boats:'w',tourism:'w',finance:'w',reports:'w',import:'w',permissions:'w',audit:'r'}},
 board:{label:'Board Chairperson',sub:'Governance and oversight',user:'',ini:'',approver:true,
  mods:{dashboard:'r','live-map':'r',incidents:'r','iweni-lmma':'r',projects:'r',bmus:'r',partners:'r',tourism:'r',finance:'r',reports:'r'}},
 ranger:{label:'Marine Ranger',sub:'Field operations',user:'',ini:'',
  mods:{dashboard:'s','live-map':'s',patrols:'s',incidents:'s'}},
 cox:{label:'Coxswain',sub:'Boat operations',user:'',ini:'',
  mods:{dashboard:'s','live-map':'r',patrols:'r',boats:'s'}},
 officer:{label:'Conservation Officer',sub:'Project-based access',user:'',ini:'',
  mods:{dashboard:'s','live-map':'s',projects:'s',coral:'s',reports:'s'}},
 fisheries:{label:'Fisheries Officer',sub:'Read-only access',user:'',ini:'',
  mods:{dashboard:'r','live-map':'r',patrols:'r','iweni-lmma':'r',projects:'r',coral:'r',reports:'r'}},
 bmu:{label:'BMU Representative',sub:'Restricted read-only access',user:'',ini:'',
  mods:{dashboard:'r','live-map':'r',patrols:'r','iweni-lmma':'r',reports:'r'}},
 tourfin:{label:'Tourism and Finance Officer',sub:'Tourism and finance entries',user:'',ini:'TF',
  mods:{dashboard:'s',tourism:'w',finance:'w',reports:'s'}}
};
const BMUS=[{id:'pate',name:'Pate BMU'},{id:'ishakani',name:'Shanga Ishakani BMU'},{id:'rubu',name:'Shanga Rubu BMU'}];
/* neighbouring BMUs. Used when a patrol is joint, in forms, and as map markers once an admin enters a position. */
const OTHER_BMUS=[['lamu','Lamu BMU'],['shela','Shela BMU'],['mokowe','Mokowe BMU'],['mtangawanda','Mtangawanda BMU'],['faza','Faza BMU'],['tchundwa','Tchundwa BMU'],['kizingitini','Kizingitini BMU'],['ndau','Ndau BMU'],['mbwajumwali','Mbwajumwali BMU']];
OTHER_BMUS.forEach(([id,name])=>BMUS.push({id,name,other:true}));
/* BMUs an admin adds later (BMUs & Governance, other BMUs). Called whenever the saved list changes. */
const applyBmuRows=rows=>{for(let i=BMUS.length-1;i>=0;i--)if(BMUS[i].custom)BMUS.splice(i,1);(rows||[]).filter(r=>r.kind==='bmu'&&r.name).forEach(r=>{const id=r.id;const ex=BMUS.find(b=>b.id===id);if(ex){if(r.lat&&r.lon){ex.lat=+r.lat;ex.lon=+r.lon;}return;}BMUS.push({id,name:/BMU$/i.test(r.name)?r.name:r.name+' BMU',other:true,custom:true,lat:+r.lat||null,lon:+r.lon||null});});
 /* positions entered for the built-in neighbours */
 (rows||[]).filter(r=>r.kind==='bmupos').forEach(r=>{const ex=BMUS.find(b=>b.id===r.bmu);if(ex&&r.lat&&r.lon){ex.lat=+r.lat;ex.lon=+r.lon;}});};
const bmuName=id=>(BMUS.find(b=>b.id===id)||{}).name||'';

/* ---------- projects ---------- */
const PROJECTS=[];
const OFFICERS=[];
const ASSIGN0={};

/* ---------- patrols ---------- */
const PATROLS0=[];

/* ---------- incidents (stage 0 Submitted .. 4 Closed) ---------- */
const STAGES=['Submitted','Under review','Referred','Monitoring','Closed'];
const INC_CATS=['Suspected illegal fishing','Spearguns and restricted fishing gear','LMMA violations','No Take Zone violations','Illegal logging observations','Marine wildlife incidents','Coral damage','Coral bleaching','Pollution','Habitat destruction','Other conservation incidents'];
const INC0=[];

/* ---------- map items ---------- */
const TRACKS=[];
const MAPITEMS=[];
const LAYERS=[
 {id:'patrols',label:'Patrols',shape:'line',color:'var(--c1)'},
 {id:'incidents',label:'Incidents',shape:'tri',color:'var(--coral)'},
 {id:'restoration',label:'Restoration',shape:'dia',color:'var(--good)'},
 {id:'zones',label:'LMMA zones',shape:'zone',color:'var(--zone-gear)'},
 {id:'boats',label:'Boats on patrol',shape:'sq',color:'var(--info)'},
 {id:'rangers',label:'Rangers live',shape:'circ',color:'var(--c3)'},
 {id:'activity',label:'Patrol activity',shape:'hex',color:'var(--c2)'},
 {id:'wildlife',label:'Marine wildlife',shape:'circ',color:'var(--c4)'},
 {id:'habitat',label:'Habitat observations',shape:'hex',color:'var(--warn)'},
 {id:'projects',label:'Conservation projects',shape:'flag',color:'var(--brand)'},
 {id:'staff',label:'Staff and members',shape:'circ',color:'var(--brand)'},
 {id:'sos',label:'SOS alerts',shape:'tri',color:'#c0262d'},
 {id:'bmus',label:'Other BMUs',shape:'flag',color:'var(--c4)'}
];
const LAYER_ACCESS={
 admin:['patrols','incidents','restoration','zones','boats','rangers','activity','wildlife','habitat','projects','staff','sos','bmus'],
 board:['patrols','incidents','restoration','zones','boats','rangers','wildlife','habitat','projects','staff','sos','bmus'],
 ranger:['patrols','incidents','zones','wildlife','habitat','boats','rangers','activity','sos','bmus'],
 cox:['patrols','zones','boats','rangers','sos','bmus'],
 officer:['restoration','zones','wildlife','habitat','projects','sos','bmus'],
 fisheries:['patrols','zones','restoration','wildlife','habitat','projects','rangers','activity','bmus'],
 bmu:['patrols','zones','projects'],
 tourfin:[]
};

/* ---------- tourism ---------- */
const TOUR0=[];
const TOUR_MONTHS=[];

/* ---------- finance ---------- */
const FIN0=[];
const DONORS=[];
const FIN_MONTHS=[];

/* ---------- staff, boats, equipment, board, partners ---------- */
const STAFF=[];
const BOATS=[];
const BOATS_SAMPLE_REMOVED=[
 {name:'MV Mlinzi',reg:'KMA-LAM-241',engine:'Outboard 60 HP, serial YM-60-3318',cox:'Said Famau',status:'In service',service:'22 Oct 2026',fuel:'120 L issued, 84 L used',trip:'Patrol, Iweni LMMA',defect:'None open',cost:41200},
 {name:'Jahazi Bahari',reg:'KMA-LAM-198',engine:'Outboard 40 HP, serial YM-40-2207',cox:'Famau Said',status:'In service',service:'06 Nov 2026',fuel:'60 L issued, 38 L used',trip:'Patrol, Shanga Ishakani',defect:'Engine vibration, reported 11 Nov',cost:34500},
 {name:'Kipepeo',reg:'KMA-LAM-305',engine:'Outboard 15 HP, serial HD-15-9042',cox:'Unassigned',status:'Under repair',service:'18 Sep 2026',fuel:'—',trip:'—',defect:'Propeller shaft seal',cost:12800}
];
const EQUIP=[];
const BOARD=[];
const MEETINGS=[];
const ACTIONS_BOARD=[];
const PARTNERS=[];

/* ---------- reports ---------- */
const REPORTS=[
 {id:'RPT-PAT-2026-10',name:'Patrol report, October 2026',type:'Patrol',bmu:'all',date:'01 Nov 2026',roles:['admin','board','fisheries','bmu','officer']},
 {id:'RPT-INC-2026-10',name:'Incident report, October 2026',type:'Incident',bmu:'all',date:'01 Nov 2026',roles:['admin','board']},
 {id:'RPT-LMA-2026-Q3',name:'Iweni LMMA quarterly report, Q3 2026',type:'LMMA',bmu:'all',date:'12 Oct 2026',roles:['admin','board','fisheries','bmu']},
 {id:'RPT-CRL-2026-10',name:'Coral restoration monitoring, October 2026',type:'Coral restoration',bmu:'all',date:'03 Nov 2026',roles:['admin','board','fisheries','officer']},
 {id:'RPT-PRJ-2026-Q3',name:'Project progress report, Q3 2026',type:'Project',bmu:'all',date:'10 Oct 2026',roles:['admin','board','fisheries','officer']},
 {id:'RPT-TOU-2026-10',name:'Tourism report, October 2026',type:'Tourism',bmu:'all',date:'02 Nov 2026',roles:['admin','board','tourism','finance']},
 {id:'RPT-BOA-2026-10',name:'Boat and equipment report, October 2026',type:'Boat and equipment',bmu:'all',date:'02 Nov 2026',roles:['admin','cox']},
 {id:'RPT-FIN-2026-10',name:'Financial report, October 2026',type:'Finance',bmu:'all',date:'04 Nov 2026',roles:['admin','board','finance']},
 {id:'RPT-DON-2026-Q3',name:'Donation report, Q3 2026',type:'Donation',bmu:'all',date:'09 Oct 2026',roles:['admin','board','finance']},
 {id:'RPT-BMU-2026-10',name:'BMU activity report, October 2026',type:'BMU',bmu:'all',date:'03 Nov 2026',roles:['admin','board','bmu']},
 {id:'RPT-GOV-2026-11',name:'Governance and Board report, November 2026',type:'Governance',bmu:'all',date:'07 Nov 2026',roles:['admin','board']},
 {id:'RPT-STF-2026-10',name:'Staff attendance report, October 2026',type:'Staff attendance',bmu:'all',date:'02 Nov 2026',roles:['admin']}
];
const DOCS=[];

/* ---------- notifications and audit seed ---------- */
const NOTES={};
const AUDIT0=[];

/* what each role may save to the server (the server enforces the same table) */
const COLL_W={patrols:['admin','ranger','cox'],incidents:['admin','ranger'],fin:['admin','tourfin','board'],tour:['admin','tourfin'],donors:['admin','tourfin'],fleet:['admin','cox'],vlog:['admin','cox'],projects:['admin'],projwork:['admin','officer'],coral:['admin','officer'],bmus:['admin'],partners:['admin'],assign:['admin'],sos:['admin','ranger','cox','officer'],settings:['admin']};
const ZONES_API=[];const PEOPLE=[];
const LOOK={infringements:[],fees:[],rangers:[],coxswains:[],bmu:null,today:''};
