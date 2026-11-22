/* ============ Guide: how to use POps, the SOS alert, and how to feed it records ============ */
const TEMPLATES={
 daily:{name:'Daily patrol log template',file:'daily-patrol-log-template.csv',head:['Date','Time Out','Time In','Location Patrolled','Observations','Challenges Encountered','Actions Taken',"Ranger's Name"],ex:['19/5/2025','4:00pm','6:30pm','Inside the closed area (Tengefu)','Fishers seen inside the closed area','No boundary markers','Awareness and warning given','Ali Shee']},
 entry:{name:'Entry (fisher check) log template',file:'entry-log-template.csv',head:['Date','Time','Location','Vessel Name','Boat Number','Person(s) Involved','Type of Infringement','Action Taken','Evidence Collected',"Ranger's Name"],ex:['19/5/2025','3:00pm','Inside closed area (LMMA)','Jiulize','463','Mohammed Badi; Said Ahmed','Fishing','Awareness and warning','Photo taken','Ali']}
};
const gCsvCell=v=>/[",\n]/.test(v)?'"'+String(v).replace(/"/g,'""')+'"':v;
const dlTemplate=t=>{const txt=[t.head,t.ex].map(r=>r.map(gCsvCell).join(',')).join('\n')+'\n';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv'}));a.download=t.file;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);};
const GUIDE=[
 ['sos','SOS emergency alert',[
  'Every ranger screen has a red SOS button at the top. Tap it from the home screen or in the middle of a patrol.',
  'Choose the emergency: medical or injury, boat problem, threat or violence, lost or overdue, or other. Add a note if there is time. Tap Send SOS now.',
  'The phone gets its position and sends it with your name, phone number and patrol. If there is no signal the alert waits on the phone and goes the moment the signal returns. Use "Send by SMS instead" to text the office number with the coordinates.',
  'The Super Admin, Board and officers see a red bar across every screen, hear a beep, and can open your position on the map and call you. Other rangers on the app also see it.',
  'When the office taps "I have seen it" your phone says so. If it was a mistake, tap SOS again and choose "False alarm, cancel it".',
  'The Super Admin sets the SMS number in Settings & Permissions, Field rules.']],
 ['patrol','Starting and running a patrol',[
  'On Start patrol the phone shows exactly where you are: inside or outside the Iweni LMMA, the zone, and your coordinates.',
  'While the patrol runs, the position is saved every 20 seconds. Crossing the LMMA edge is written into the patrol timeline (Entered the LMMA, Left the LMMA).',
  'The count of patrols inside the LMMA uses these recorded coordinates. A patrol that only says "Iweni" in its area name, but whose track stayed outside, is not counted as inside.',
  'The Super Admin chooses Single patrol or Joint patrol when creating a patrol. Joint patrols travel far and raise an alert after 30 minutes without an update. Single patrols wait 2 hours by default (up to 3). Both can be changed per patrol and in Settings.']],
 ['feed','Feeding records and templates',[
  'Open Import. Choose the sheet type: Daily patrol log or Entry (fisher check) log.',
  'Download the template below, or use your own table. Column names are matched by meaning, so extra or reordered columns are fine.',
  'Paste the table, or load the file (CSV or TSV). Photos of the pages can be attached by date range.',
  'Check the preview and fix the mapping, then import. Each import is a batch that you can undo.',
  'Imported patrols show on the timeline. They have no GPS track, so inside or outside the LMMA comes from the location text you typed.']],
 ['map','Using the map',[
  'Drag to move. Scroll with Ctrl held, pinch, or use + and − to zoom. Double-tap to zoom in.',
  'Turn the map with the two turn buttons, with Q and E on a keyboard, or by twisting two fingers. The compass shows north. Tap it to put north back up. Double-tap it on a phone to follow the phone compass.',
  'Press the full-screen button (or F) to fill the screen. Esc closes it.',
  'Tap anything for its details. Tap an empty spot for the coordinates and the zone. Layers: patrols, staff and members, SOS alerts and other BMUs can be switched on and off.',
  'Staff who press Share location (top bar) appear on the map for the Super Admin and the Board, with what they are doing.']],
 ['fin','Tourism and finance',[
  'Tourism and Finance are one place. Visitor entries show their guests, nationality, activity and boats.',
  'Prices can be per person, per group or per boat (speedboat, dhow, power boat). The Super Admin or the Tourism and Finance Officer sets the amounts in Prices.',
  'Reconcile a payment and it is sent to the Board Chairperson as a finance entry. The person who made the entry cannot approve it.']],
 ['notes','Notifications',[
  'The bell opens a panel that stays in view on phones. Tap an item to open the patrol, incident, boat or approval it is about.',
  'Mark all read quietly removes ordinary items. SOS alerts stay until resolved.']]
];
const Guide=()=>{
 const {role}=useApp();
 return html`<div><${PageHead} title="Guide" sub="How to use POps in the field and in the office"/>
 <div className="grid2">${GUIDE.map(g=>html`<${Card} key=${g[0]} title=${g[1]}><ol className="steps-l">${g[2].map((x,i)=>html`<li key=${i}>${x}</li>`)}</ol>${g[0]==='feed'&&html`<div className="btnrow">${Object.values(TEMPLATES).map(t=>html`<${Btn} key=${t.file} icon="download" onClick=${()=>dlTemplate(t)}>${t.name}</${Btn}>`)}</div>`}</${Card}>`)}</div></div>`;
};
