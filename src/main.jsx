import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LayoutDashboard, CalendarDays, CalendarRange, History, Settings, Plus, ChevronLeft, ChevronRight, Check, Clock3, Trash2, Pencil, Download, Upload, Search, Sparkles, CircleCheck, ListTodo, Target, X, Save, Sun, Moon, Menu, MoreHorizontal} from 'lucide-react';
import './style.css';

const DB_NAME='daymark_local_v1';
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;['days','months','meta'].forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'});});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function getAll(store){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function put(store,obj){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(obj);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}
async function del(store,id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}
const pad=n=>String(n).padStart(2,'0');
const localDate=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const monthKey=d=>d.slice(0,7);
const prettyDate=s=>new Date(`${s}T12:00:00`).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const prettyMonth=s=>new Date(`${s}-01T12:00:00`).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
const uid=()=>crypto.randomUUID();
const emptyDay=id=>({id,tasks:[],extra:[],pending:[],notes:'',updatedAt:new Date().toISOString()});
const defaultTemplates=[{id:uid(),name:'Exercise',target:20},{id:uid(),name:'Read',target:15},{id:uid(),name:'Coding practice',target:20},{id:uid(),name:'NPTEL / learning',target:16}];

function App(){
 const today=localDate(); const [page,setPage]=useState('dashboard');
 const [theme, setTheme] = useState(
  () => localStorage.getItem('daymark-theme') || 'light'
);
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('daymark-theme', theme);
}, [theme]);

const toggleTheme = () => {
  setTheme(prev => prev === 'light' ? 'dark' : 'light');
};
 const [days,setDays]=useState([]); const [months,setMonths]=useState([]); const [templates,setTemplates]=useState(defaultTemplates); const [dayDate,setDayDate]=useState(today); const [monthDate,setMonthDate]=useState(monthKey(today)); const [search,setSearch]=useState(''); const [toast,setToast]=useState(''); const [mobileNav,setMobileNav]=useState(false); const [ready,setReady]=useState(false);
 useEffect(()=>{(async()=>{try{const [d,m,meta]=await Promise.all([getAll('days'),getAll('months'),getAll('meta')]);setDays(d);setMonths(m);const t=meta.find(x=>x.id==='templates');if(t?.items)setTemplates(t.items);else await put('meta',{id:'templates',items:defaultTemplates});}catch(e){console.error(e);notify('Could not open local storage. Please use a modern browser.');}setReady(true);})();},[]);
 function notify(msg){setToast(msg);setTimeout(()=>setToast(''),2600);}
 const day=days.find(x=>x.id===dayDate)||emptyDay(dayDate);
 async function saveDay(next){const value={...next,id:dayDate,updatedAt:new Date().toISOString()};await put('days',value);setDays(old=>[...old.filter(x=>x.id!==dayDate),value]);}
 const month=months.find(x=>x.id===monthDate)||{id:monthDate,rows:templates.map(t=>({...t,checks:[]}))};
 async function saveMonth(next){const value={...next,id:monthDate,updatedAt:new Date().toISOString()};await put('months',value);setMonths(old=>[...old.filter(x=>x.id!==monthDate),value]);}
 async function saveTemplates(items){setTemplates(items);await put('meta',{id:'templates',items});}
 async function exportData(){const data={format:'daymark-backup-v1',exportedAt:new Date().toISOString(),days,months,templates};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`daymark-backup-${today}.json`;a.click();URL.revokeObjectURL(a.href);notify('Backup downloaded');}
 async function importData(file){try{const data=JSON.parse(await file.text());if(data.format!=='daymark-backup-v1')throw Error('Invalid backup');for(const x of data.days||[])await put('days',x);for(const x of data.months||[])await put('months',x);if(data.templates)await saveTemplates(data.templates);setDays(await getAll('days'));setMonths(await getAll('months'));notify('Backup restored successfully');}catch(e){notify('That backup file could not be read');}}
 const nav=[['dashboard','Overview',LayoutDashboard],['daily','Daily planner',CalendarDays],['monthly','Monthly tracker',CalendarRange],['history','History',History],['settings','Settings',Settings]];
 const completed=day.tasks.filter(t=>t.done).length; const pct=day.tasks.length?Math.round(completed/day.tasks.length*100):0;
 if(!ready)return <div className="loading"><div className="brand-mark">d</div><p>Preparing your planner…</p></div>;
 return <div className="app-shell">
  <aside className={`sidebar ${mobileNav?'open':''}`}><div className="brand"><div className="brand-mark">d</div><div><b>daymark</b><span>PERSONAL PLANNER</span></div><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
   <div className="nav-label">WORKSPACE</div><nav>{nav.map(([id,label,Icon])=><button key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>{setPage(id);setMobileNav(false)}}><Icon size={18}/><span>{label}</span>{id==='daily'&&<span className="nav-date">{new Date().getDate()}</span>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="quote-card"><Sparkles size={17}/><p>Small steps, consistently taken, create meaningful progress.</p></div><div className="local-status"><span className="live-dot"/> Saved on this device</div></div>
  </aside>
  <main className="main-area"><header className="topbar"><button className="menu-btn" onClick={()=>setMobileNav(true)}><Menu/></button><div className="crumb">Workspace <span>/</span> {nav.find(n=>n[0]===page)?.[1]}</div><div className="top-actions">
  <span className="today-label">
    <Sun size={15}/>
    {new Date().toLocaleDateString('en-IN',{
      weekday:'short',
      day:'numeric',
      month:'short'
    })}
  </span>

  <button
    className="theme-toggle"
    onClick={toggleTheme}
    title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    aria-label="Toggle theme"
  >
    {theme === 'light' ? <Moon size={19}/> : <Sun size={19}/>}
  </button>

  <button className="avatar" title="Personal workspace">KT</button>
</div></header>
   <div className="content">
    {page==='dashboard'&&<Dashboard day={day} days={days} month={month} monthDate={monthDate} setPage={setPage} setDayDate={setDayDate} pct={pct} completed={completed} today={today}/>}
    {page==='daily'&&<DailyPage date={dayDate} setDate={setDayDate} day={day} save={saveDay} notify={notify} today={today}/>}
    {page==='monthly'&&<MonthlyPage date={monthDate} setDate={setMonthDate} month={month} save={saveMonth} templates={templates} saveTemplates={saveTemplates} months={months} setMonths={setMonths} notify={notify}/>}
    {page==='history'&&<HistoryPage days={days} setDate={setDayDate} setPage={setPage} search={search} setSearch={setSearch}/>}
    {page==='settings'&&<SettingsPage exportData={exportData} importData={importData} days={days} months={months}/>}
   </div>
   <footer className="footer"><span>DAYMARK · YOUR SPACE, YOUR PACE</span><span>Private by design · Stored locally in this browser</span></footer>
  </main>
  {toast&&<div className="toast"><CircleCheck size={17}/>{toast}</div>}
 </div>
}

function PageTitle({eyebrow,title,sub,action}){return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{sub}</p></div>{action}</div>}
function Dashboard({day,days,month,monthDate,setPage,setDayDate,pct,completed,today}){const todayTasks=days.find(x=>x.id===today)?.tasks||[];const monthChecks=(month.rows||[]).reduce((a,r)=>a+(r.checks||[]).filter(c=>c?.done).length,0);const monthTarget=(month.rows||[]).reduce((a,r)=>a+Number(r.target||0),0);const upcoming=days.filter(d=>d.id>=today).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,4);
 return <><PageTitle eyebrow="YOUR PERSONAL SPACE" title="A little progress, every day." sub="A calm place to plan your days and keep track of what matters." action={<button className="primary-btn" onClick={()=>setPage('daily')}><Plus size={17}/> Plan a day</button>}/>
 <div className="welcome-strip"><div><span className="welcome-tag">TODAY'S CHECK-IN</span><h2>{new Date(`${today}T12:00:00`).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</h2><p>{todayTasks.length?`${todayTasks.length} tasks planned for today. Keep your focus on one thing at a time.`:'Your day is open. Add a few meaningful tasks to get started.'}</p></div><div className="welcome-illustration"><div className="sun-orb"/><div className="plant">✳</div></div></div>
 <div className="stats-grid"><Stat icon={ListTodo} label="Today's tasks" value={todayTasks.length} detail={`${todayTasks.filter(t=>t.done).length} completed`}/><Stat icon={Target} label="Daily progress" value={`${todayTasks.length?Math.round(todayTasks.filter(t=>t.done).length/todayTasks.length*100):0}%`} detail="Based on planned tasks"/><Stat icon={CalendarRange} label="Monthly check-ins" value={monthChecks} detail={`${monthTarget} total target · ${prettyMonth(monthDate)}`}/><Stat icon={History} label="Days in history" value={days.length} detail="Your saved daily pages"/></div>
 <div className="section-heading"><div><h3>Pick up where you left off</h3><p>Your recent daily pages</p></div><button className="text-btn" onClick={()=>setPage('history')}>View history <ChevronRight size={15}/></button></div>
 <div className="recent-list">{upcoming.length?upcoming.map(d=><button className="recent-row" key={d.id} onClick={()=>{setDayDate(d.id);setPage('daily')}}><div className="date-tile"><b>{new Date(`${d.id}T12:00:00`).getDate()}</b><span>{new Date(`${d.id}T12:00:00`).toLocaleDateString('en-IN',{month:'short'})}</span></div><div className="recent-info"><b>{prettyDate(d.id)}</b><span>{d.tasks.length} planned tasks · {d.tasks.filter(t=>t.done).length} completed</span></div><div className="mini-progress"><div><span style={{width:`${d.tasks.length?d.tasks.filter(t=>t.done).length/d.tasks.length*100:0}%`}}/></div></div><ChevronRight size={17}/></button>):<div className="empty-state">No daily pages yet. Create your first plan to see it here.</div>}</div>
 <div className="tip-card"><Sparkles size={18}/><div><b>Make tomorrow easier tonight</b><p>Spend a few minutes adding tomorrow's priorities. Your plan will be waiting when the day begins.</p></div><button className="text-btn" onClick={()=>{setDayDate(localDate(new Date(Date.now()+86400000)));setPage('daily')}}>Plan tomorrow <ChevronRight size={15}/></button></div>
 </>}
function Stat({icon:Icon,label,value,detail}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={17}/></div></div><strong>{value}</strong><small>{detail}</small></div>}

function DailyPage({date,setDate,day,save,notify,today}){const [taskText,setTaskText]=useState('');const [taskTime,setTaskTime]=useState('');
const [taskEndTime,setTaskEndTime]=useState('');const [extraText,setExtraText]=useState('');const [extraTime,setExtraTime]=useState('');const [pendingText,setPendingText]=useState('');const [remarks,setRemarks]=useState(day.notes||'');
 useEffect(()=>setRemarks(day.notes||''),[date,day.notes]);
 const update=(key,val)=>save({...day,[key]:val});
const addTask=()=>{
  if(!taskText.trim())return;

  update('tasks',[
    ...day.tasks,
    {
      id:uid(),
      text:taskText.trim(),
      time:taskTime,
      endTime:taskEndTime,
      done:false,
      remark:''
    }
  ]);

  setTaskText('');
  setTaskTime('');
  setTaskEndTime('');
  notify('Task added and saved');
}; const editTask=(id,field,value)=>update('tasks',day.tasks.map(t=>t.id===id?{...t,[field]:value}:t));
 const remove=(key,id)=>update(key,day[key].filter(x=>x.id!==id));
 const addSimple=(key,text,time)=>{if(!text.trim())return;update(key,[...day[key],{id:uid(),text:text.trim(),time,remark:''}]);if(key==='extra'){setExtraText('');setExtraTime('')}else setPendingText('');notify('Entry saved');};
 const done=day.tasks.filter(t=>t.done).length;const progress=day.tasks.length?Math.round(done/day.tasks.length*100):0;
 const shift=(n)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);setDate(localDate(d));};
 return <><PageTitle eyebrow="DAILY PLANNER" title="Your day, thoughtfully planned." sub="Plan ahead, check things off, and keep a record of the day." action={<button className="soft-btn" onClick={()=>setDate(localDate(new Date(Date.now()+86400000)))}>Plan tomorrow <ChevronRight size={16}/></button>}/>
 <div className="date-toolbar"><button className="icon-btn" onClick={()=>shift(-1)}><ChevronLeft/></button><div className="date-heading"><span>{date===today?'TODAY':date>today?'UPCOMING DAY':'PAST DAY'}</span><h2>{prettyDate(date)}</h2></div><button className="icon-btn" onClick={()=>shift(1)}><ChevronRight/></button><input aria-label="Choose date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
 <div className="daily-progress card"><div><span className="muted-label">DAILY COMPLETION</span><h3>{progress}% <small>completed</small></h3></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div><span className="progress-count">{done} of {day.tasks.length} tasks</span></div>
 <section className="card section-card"><div className="section-heading inside"><div><h3>Planned work</h3><p>Your priorities for this date</p></div><span className="count-pill">{day.tasks.length} tasks</span></div>
<div className="task-add">
  <input
    value={taskText}
    onChange={e=>setTaskText(e.target.value)}
    onKeyDown={e=>e.key==='Enter'&&addTask()}
    placeholder="What do you want to get done?"
  />

  <div className="time-group">
    <label>Start</label>
    <input
      className="time-input"
      type="time"
      value={taskTime}
      onChange={e=>setTaskTime(e.target.value)}
    />
  </div>

  <div className="time-group">
    <label>End</label>
    <input
      className="time-input"
      type="time"
      value={taskEndTime}
      onChange={e=>setTaskEndTime(e.target.value)}
    />
  </div>

  <button className="primary-btn" onClick={addTask}>
    <Plus size={16}/> Add task
  </button>
</div> <div className="task-list">{day.tasks.map((t,i)=><div className={`task-row ${t.done?'is-done':''}`} key={t.id}><button className="check-btn" onClick={()=>editTask(t.id,'done',!t.done)} aria-label="Toggle completion">{t.done&&<Check size={15}/>}</button><span className="task-number">{pad(i+1)}</span><input className="task-name" value={t.text} onChange={e=>editTask(t.id,'text',e.target.value)} aria-label="Task name"/>
<div className="task-time">
  <Clock3 size={14}/>
  <input
    type="time"
    title="Start time"
    value={t.time||''}
    onChange={e=>editTask(t.id,'time',e.target.value)}
  />
  <span>–</span>
  <input
    type="time"
    title="End time"
    value={t.endTime||''}
    onChange={e=>editTask(t.id,'endTime',e.target.value)}
  />
</div><input className="remark-input" value={t.remark||''} onChange={e=>editTask(t.id,'remark',e.target.value)} placeholder="Add a remark…"/><button className="icon-btn tiny danger" onClick={()=>remove('tasks',t.id)}><Trash2 size={15}/></button></div>)}{!day.tasks.length&&<div className="empty-inline">No tasks added yet. Add the first thing you'd like to accomplish.</div>}</div>
 </section>
 <div className="two-col"><SimpleSection title="Extra work done" subtitle="Good things that weren't on the original plan." items={day.extra} text={extraText} setText={setExtraText} time={extraTime} setTime={setExtraTime} add={()=>addSimple('extra',extraText,extraTime)} remove={id=>remove('extra',id)} placeholder="Something extra you completed…"/><SimpleSection title="Pending work" subtitle="Keep unfinished work visible for your next plan." items={day.pending} text={pendingText} setText={setPendingText} add={()=>addSimple('pending',pendingText,'')} remove={id=>remove('pending',id)} placeholder="Work to carry forward…"/></div>
 <section className="card notes-card"><div><h3>Daily remarks</h3><p>Anything worth remembering about this day?</p></div><textarea value={remarks} onChange={e=>{setRemarks(e.target.value);save({...day,notes:e.target.value})}} placeholder="Write a reflection, a note, or a reminder…" rows="3"/></section>
 <div className="save-hint"><span className="live-dot"/> Changes save automatically on this device.</div>
 </>}
function SimpleSection({title,subtitle,items,text,setText,time,setTime,add,remove,placeholder}){return <section className="card simple-section"><div className="section-heading inside"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="count-pill">{items.length}</span></div><div className="simple-add"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder={placeholder}/>{setTime&&<input type="time" value={time} onChange={e=>setTime(e.target.value)}/>}<button className="icon-primary" onClick={add}><Plus size={17}/></button></div><div className="simple-items">{items.map(x=><div className="simple-item" key={x.id}><span className="bullet"/><span>{x.text}</span>{x.time&&<small>{x.time}</small>}<button className="icon-btn tiny danger" onClick={()=>remove(x.id)}><X size={14}/></button></div>)}{!items.length&&<div className="empty-small">Nothing added here yet.</div>}</div></section>}

function MonthlyPage({date,setDate,month,save,templates,saveTemplates,months,setMonths,notify}){const [editing,setEditing]=useState(false);const [draft,setDraft]=useState([]);const rows=month.rows||[];const done=rows.reduce((a,r)=>a+(r.checks||[]).filter(c=>c?.done).length,0);const total=rows.reduce((a,r)=>a+Number(r.target||0),0);const shift=n=>{const d=new Date(`${date}-01T12:00:00`);d.setMonth(d.getMonth()+n);setDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}`)};
 const startEdit=()=>{setDraft(rows.map(r=>({...r})));setEditing(true)};
 const saveEdit=async(mode)=>{const clean=draft.filter(r=>r.name.trim()).map(r=>({...r,target:Math.max(1,Number(r.target)||1),checks:r.checks||[]}));if(mode==='all'){await saveTemplates(clean.map(({id,name,target})=>({id,name,target})));const updated=[];for(const m of months){const next=clean.map(t=>{const old=m.rows?.find(r=>r.id===t.id);return {...t,checks:old?.checks||[]};});const obj={...m,rows:next};await put('months',obj);updated.push(obj);}setMonths(old=>[...old.filter(m=>!updated.some(u=>u.id===m.id)),...updated]); }const nextRows=clean.map(t=>{const old=rows.find(r=>r.id===t.id);return {...t,checks:old?.checks||t.checks||[]};});await save({id:date,rows:nextRows});if(mode==='this')notify('Changes applied to this month only');else notify('Monthly list updated across all months');setEditing(false);};
 const toggle=(rowId,index)=>{const next=rows.map(r=>{if(r.id!==rowId)return r;const checks=[...(r.checks||[])];const old=checks[index];checks[index]=old?.done?{done:false,date:null,remark:''}:{done:true,date:localDate(),remark:old?.remark||''};return {...r,checks};});save({id:date,rows:next});};
 const remark=(rowId,index)=>{const r=rows.find(x=>x.id===rowId);const current=r?.checks?.[index]?.remark||'';const value=window.prompt('Add a note for this check-in:',current);if(value===null)return;const next=rows.map(x=>x.id!==rowId?x:{...x,checks:(x.checks||[]).map((c,i)=>i===index?{...(c||{}),remark:value}:c)});save({id:date,rows:next});};
 const addDraft=()=>setDraft([...draft,{id:uid(),name:'',target:10,checks:[]}]);
 return <><PageTitle eyebrow="MONTHLY TRACKER" title="Build consistency, one check-in at a time." sub="Set a target for each activity and track every completion through the month." action={<button className="primary-btn" onClick={startEdit}><Pencil size={16}/> Edit activities</button>}/>
 <div className="date-toolbar month-toolbar"><button className="icon-btn" onClick={()=>shift(-1)}><ChevronLeft/></button><div className="date-heading"><span>MONTHLY OVERVIEW</span><h2>{prettyMonth(date)}</h2></div><button className="icon-btn" onClick={()=>shift(1)}><ChevronRight/></button><input type="month" value={date} onChange={e=>setDate(e.target.value)}/></div>
 <div className="monthly-summary"><div><span className="muted-label">CHECK-INS COMPLETED</span><h2>{done}<small> / {total}</small></h2><p>{total?Math.round(done/total*100):0}% of your monthly targets</p></div><div className="summary-ring" style={{'--progress':`${total?done/total*100:0}%`}}><div><b>{total?Math.round(done/total*100):0}%</b><span>complete</span></div></div></div>
 <section className="card month-card"><div className="section-heading inside"><div><h3>Monthly activities</h3><p>Tap a numbered box when you complete an activity. Select its note icon to add details.</p></div><span className="count-pill">{rows.length} activities</span></div>
 <div className="month-table-wrap"><table className="month-table"><thead><tr><th>ACTIVITY</th><th>TARGET</th><th colSpan="20">CHECK-INS <span className="table-hint">· Each square is one occurrence</span></th><th>DONE</th></tr></thead><tbody>{rows.map(r=>{const checks=r.checks||[];const count=checks.filter(c=>c?.done).length;return <tr key={r.id}><td className="activity-name">{r.name}</td><td><span className="target-pill">{r.target}×</span></td><td colSpan="20"><div className="check-grid">{Array.from({length:Math.min(Number(r.target)||1,40)},(_,i)=>{const c=checks[i];return <div className="check-cell" key={i}><button title={c?.done?`Completed ${c.date||''} · Click to undo`:`Mark occurrence ${i+1} complete`} className={`month-check ${c?.done?'checked':''}`} onClick={()=>toggle(r.id,i)}>{c?.done?<Check size={13}/>:<span>{i+1}</span>}</button><button className="note-dot" title="Add or view note" onClick={()=>remark(r.id,i)}>{c?.remark?'●':'·'}</button></div>})}</div></td><td><b className="done-count">{count}/{r.target}</b></td></tr>})}{!rows.length&&<tr><td colSpan="4" className="empty-inline">No activities yet. Use “Edit activities” to create your monthly list.</td></tr>}</tbody></table></div>
 <div className="month-foot"><span><span className="legend-box checked-legend"><Check size={11}/></span> Completed <span className="legend-box"/> Not completed</span><span>Progress is saved as you check in.</span></div></section>
 {editing&&<div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><span className="eyebrow">MONTHLY SETUP</span><h2>Edit activities</h2><p>Choose the activities and the number of times you want to complete each one.</p></div><button className="icon-btn" onClick={()=>setEditing(false)}><X/></button></div><div className="edit-rows">{draft.map((r,i)=><div className="edit-row" key={r.id}><input value={r.name} onChange={e=>setDraft(draft.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="Activity name"/><label>Target<input type="number" min="1" max="40" value={r.target} onChange={e=>setDraft(draft.map((x,j)=>j===i?{...x,target:e.target.value}:x))}/></label><button className="icon-btn danger" onClick={()=>setDraft(draft.filter((_,j)=>j!==i))}><Trash2 size={16}/></button></div>)}</div><button className="add-row-btn" onClick={addDraft}><Plus size={16}/> Add activity</button><div className="modal-actions"><button className="soft-btn" onClick={()=>saveEdit('this')}>This month only</button><button className="primary-btn" onClick={()=>saveEdit('all')}>Apply to all months</button></div><small className="modal-note">Existing check-ins are preserved. Applying to all months updates activity lists while keeping each month's saved completion history.</small></div></div>}
 </>}

function HistoryPage({days,setDate,setPage,search,setSearch}){const filtered=days.filter(d=>d.id.includes(search)||d.tasks.some(t=>t.text.toLowerCase().includes(search.toLowerCase()))||d.notes?.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.id.localeCompare(a.id));return <><PageTitle eyebrow="YOUR HISTORY" title="Every day leaves a trace." sub="Revisit your plans, progress, and notes from previous days."/><div className="history-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search dates, tasks, or remarks…"/></div><div className="history-list">{filtered.map(d=>{const n=d.tasks.length,c=d.tasks.filter(t=>t.done).length;return <button className="history-card" key={d.id} onClick={()=>{setDate(d.id);setPage('daily')}}><div className="history-date"><b>{new Date(`${d.id}T12:00:00`).getDate()}</b><span>{new Date(`${d.id}T12:00:00`).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span></div><div className="history-detail"><b>{prettyDate(d.id)}</b><span>{n} planned · {c} completed · {d.extra.length} extra work · {d.pending.length} pending</span>{d.notes&&<small>{d.notes}</small>}</div><div className="history-percent">{n?Math.round(c/n*100):0}%</div><ChevronRight size={18}/></button>})}{!filtered.length&&<div className="empty-state">{days.length?'No matching days found. Try another search.':'Your history will appear here after you create daily plans.'}</div>}</div></>}
function SettingsPage({exportData,importData,days,months}){return <><PageTitle eyebrow="PREFERENCES" title="Your planner, your way." sub="Manage your local data and keep a safe backup of your progress."/><div className="settings-grid"><section className="card setting-card"><div className="setting-icon"><Download/></div><h3>Back up your planner</h3><p>Download a JSON file containing all daily pages, monthly check-ins, and activity templates. Keep it somewhere safe.</p><button className="primary-btn" onClick={exportData}><Download size={16}/> Download backup</button></section><section className="card setting-card"><div className="setting-icon"><Upload/></div><h3>Restore from backup</h3><p>Import a previous Daymark backup. Restored records are merged with the data already on this device.</p><label className="soft-btn upload-label"><Upload size={16}/> Choose backup file<input type="file" accept="application/json,.json" onChange={e=>e.target.files[0]&&importData(e.target.files[0])}/></label></section><section className="card setting-card storage-card"><div className="setting-icon"><Save/></div><h3>Local storage</h3><p>Your information is stored in this browser using IndexedDB. No account or server is required.</p><div className="storage-stats"><span><b>{days.length}</b> daily pages</span><span><b>{months.length}</b> monthly records</span></div><div className="storage-note"><span className="live-dot"/> Automatic saving is active</div></section></div><div className="privacy-note"><Sparkles size={18}/><div><b>A note about keeping your data safe</b><p>Browser data can be lost if site data is cleared, the browser profile is removed, or the device is damaged. Export a backup regularly. For access across multiple devices, a cloud-sync option would be needed in a future version.</p></div></div></>}

createRoot(document.getElementById('root')).render(<App/>);
