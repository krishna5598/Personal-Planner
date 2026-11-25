import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Wallet, TrendingUp, TrendingDown, IndianRupee, LayoutDashboard, CalendarDays, CalendarRange, History, Settings, Plus, ChevronLeft, ChevronRight, Check, Clock3, Trash2, Pencil, Download, Upload, Search, Sparkles, CircleCheck, ListTodo, Target, X, Save, Sun, Moon, Menu, MoreHorizontal} from 'lucide-react';
import './style.css';
import {cloudConfigured, getSession, signIn, signUp, sendPasswordReset, signOut, cloudRead, cloudWrite, updatePassword} from './supabase.js';

const DB_NAME='daymark_local_v1';
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,2);req.onupgradeneeded=()=>{const db=req.result;['days','months','meta','budget'].forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'});});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function getAll(store){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function put(store,obj){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(obj);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}
async function del(store,id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}
async function clearStore(store){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).clear();tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}
async function replaceStore(store,items){await clearStore(store);for(const item of items||[])await put(store,item);}
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
 const [days,setDays]=useState([]); const [months,setMonths]=useState([]); const [budgetEntries,setBudgetEntries]=useState([]); const [templates,setTemplates]=useState(defaultTemplates); const [dayDate,setDayDate]=useState(today); const [monthDate,setMonthDate]=useState(monthKey(today)); const [search,setSearch]=useState(''); const [toast,setToast]=useState(''); const [mobileNav,setMobileNav]=useState(false); const [ready,setReady]=useState(false);
 const [session,setSession]=useState(null); const lastLocalEdit=useRef(Date.now()); const [recoveryMode,setRecoveryMode]=useState(()=>window.location.hash.includes('type=recovery')); const [authReady,setAuthReady]=useState(!cloudConfigured); const [cloudHydrated,setCloudHydrated]=useState(false); const [cloudStatus,setCloudStatus]=useState(cloudConfigured?'Connecting…':'Not configured');
 useEffect(()=>{(async()=>{try{const [d,m,meta,b]=await Promise.all([getAll('days'),getAll('months'),getAll('meta'),getAll('budget')]);setDays(d);setMonths(m);setBudgetEntries(b);const t=meta.find(x=>x.id==='templates');if(t?.items)setTemplates(t.items);else await put('meta',{id:'templates',items:defaultTemplates});}catch(e){console.error(e);notify('Could not open local storage. Please use a modern browser.');}setReady(true);})();},[]);
 useEffect(()=>{if(!cloudConfigured)return;let active=true;(async()=>{try{const current=await getSession();if(active)setSession(current);}catch(e){console.error(e);}finally{if(active)setAuthReady(true);}})();return()=>{active=false};},[]);
 useEffect(()=>{if(!cloudConfigured||!ready||!session?.user?.id)return;let active=true;(async()=>{setCloudHydrated(false);setCloudStatus('Syncing…');try{const remoteRow=await cloudRead(session);const remote=remoteRow?.data??null;const ownerKey='daymark-local-owner';if(remoteRow?.updated_at)localStorage.setItem(`daymark-cloud-updated-${session.user.id}`,String(Date.parse(remoteRow.updated_at))); const owner=localStorage.getItem(ownerKey);if(remote){await replaceStore('days',remote.days||[]);await replaceStore('months',remote.months||[]);await replaceStore('budget',remote.budgetEntries||[]);await replaceStore('meta',[{id:'templates',items:remote.templates||defaultTemplates}]);if(!active)return;setDays(remote.days||[]);setMonths(remote.months||[]);setBudgetEntries(remote.budgetEntries||[]);setTemplates(remote.templates||defaultTemplates);}else{if(owner&&owner!==session.user.id){await Promise.all(['days','months','budget','meta'].map(clearStore));setDays([]);setMonths([]);setBudgetEntries([]);setTemplates(defaultTemplates);}localStorage.setItem(ownerKey,session.user.id);const [d,m,b]=await Promise.all([getAll('days'),getAll('months'),getAll('budget')]);const meta=await getAll('meta');const t=meta.find(x=>x.id==='templates')?.items||defaultTemplates;await cloudWrite(session,{days:d,months:m,budgetEntries:b,templates:t});}localStorage.setItem(ownerKey,session.user.id);if(active){setCloudStatus('Cloud synced');setCloudHydrated(true);}}catch(e){console.error(e);if(active){setCloudStatus('Sync issue');notify(`Cloud sync: ${e.message}`);setCloudHydrated(true);}}})();return()=>{active=false};},[ready,session?.user?.id]);
 useEffect(()=>{if(!cloudConfigured||!session?.user?.id||!cloudHydrated||!ready)return;lastLocalEdit.current=Date.now();const timer=setTimeout(async()=>{try{await cloudWrite(session,{days,months,budgetEntries,templates});setCloudStatus('Cloud synced');}catch(e){console.error(e);setCloudStatus('Sync issue');}},900);return()=>clearTimeout(timer);},[days,months,budgetEntries,templates,session?.user?.id,cloudHydrated,ready]);
 useEffect(()=>{if(!cloudConfigured||!session?.user?.id||!cloudHydrated)return;const timer=setInterval(async()=>{if(Date.now()-lastLocalEdit.current<6000)return;try{const row=await cloudRead(session);if(!row?.data)return;const key=`daymark-cloud-updated-${session.user.id}`;const known=Number(localStorage.getItem(key)||0);const remoteTime=Date.parse(row.updated_at||'');if(remoteTime>known+1200){const data=row.data;await replaceStore('days',data.days||[]);await replaceStore('months',data.months||[]);await replaceStore('budget',data.budgetEntries||[]);await replaceStore('meta',[{id:'templates',items:data.templates||defaultTemplates}]);setDays(data.days||[]);setMonths(data.months||[]);setBudgetEntries(data.budgetEntries||[]);setTemplates(data.templates||defaultTemplates);localStorage.setItem(key,String(remoteTime));setCloudStatus('Updated from cloud');}}catch(e){console.error(e);setCloudStatus('Sync issue');}},12000);return()=>clearInterval(timer);},[session?.user?.id,cloudHydrated]);
 async function handleSignOut(){signOut();setSession(null);setCloudHydrated(false);setCloudStatus('Signed out');}
 function notify(msg){setToast(msg);setTimeout(()=>setToast(''),2600);}
 const day=days.find(x=>x.id===dayDate)||emptyDay(dayDate);
 async function saveDay(next){const value={...next,id:dayDate,updatedAt:new Date().toISOString()};await put('days',value);setDays(old=>[...old.filter(x=>x.id!==dayDate),value]);}
 const month=months.find(x=>x.id===monthDate)||{id:monthDate,rows:templates.map(t=>({...t,checks:[]}))};
 async function saveMonth(next){const value={...next,id:monthDate,updatedAt:new Date().toISOString()};await put('months',value);setMonths(old=>[...old.filter(x=>x.id!==monthDate),value]);}
 async function saveTemplates(items){setTemplates(items);await put('meta',{id:'templates',items});}
 async function exportData(){const data={format:'daymark-backup-v2',exportedAt:new Date().toISOString(),days,months,templates,budgetEntries};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`daymark-backup-${today}.json`;a.click();URL.revokeObjectURL(a.href);notify('Backup downloaded');}
 async function importData(file){try{const data=JSON.parse(await file.text());if(!['daymark-backup-v1','daymark-backup-v2'].includes(data.format))throw Error('Invalid backup');for(const x of data.days||[])await put('days',x);for(const x of data.months||[])await put('months',x);for(const x of data.budgetEntries||[])await put('budget',x);if(data.templates)await saveTemplates(data.templates);setDays(await getAll('days'));setMonths(await getAll('months'));setBudgetEntries(await getAll('budget'));notify('Backup restored successfully');}catch(e){notify('That backup file could not be read');}}
 const nav=[['dashboard','Overview',LayoutDashboard],['daily','Daily planner',CalendarDays],['monthly','Monthly tracker',CalendarRange],['budget','Budget',Wallet],['history','History',History],['settings','Settings',Settings]];
 const completed=day.tasks.filter(t=>t.done).length; const pct=day.tasks.length?Math.round(completed/day.tasks.length*100):0;
 if(!ready||!authReady||(cloudConfigured&&session&&!cloudHydrated))return <div className="loading"><div className="brand-mark">d</div><p>{cloudConfigured?'Connecting your secure workspace…':'Preparing your planner…'}</p></div>;
 if(cloudConfigured&&!session)return <AuthScreen onSession={setSession}/>;
 if(cloudConfigured&&session&&recoveryMode)return <PasswordRecoveryScreen session={session} onComplete={()=>setRecoveryMode(false)}/>;
 return <div className="app-shell">
  <aside className={`sidebar ${mobileNav?'open':''}`}><div className="brand"><div className="brand-mark">d</div><div><b>daymark</b><span>PERSONAL PLANNER</span></div><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
   <div className="nav-label">WORKSPACE</div><nav>{nav.map(([id,label,Icon])=><button key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>{setPage(id);setMobileNav(false)}}><Icon size={18}/><span>{label}</span>{id==='daily'&&<span className="nav-date">{new Date().getDate()}</span>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="quote-card"><Sparkles size={17}/><p>Small steps, consistently taken, create meaningful progress.</p></div><div className="local-status"><span className="live-dot"/> {cloudConfigured?'Cloud sync · '+cloudStatus:'Saved on this device'}</div></div>
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

  <span className="account-email">{session?.user?.email||'Local workspace'}</span>{cloudConfigured&&<button className="soft-btn signout-btn" onClick={handleSignOut}>Sign out</button>}
</div></header>
   <div className="content">
    {page==='dashboard'&&<Dashboard day={day} days={days} month={month} monthDate={monthDate} setPage={setPage} setDayDate={setDayDate} pct={pct} completed={completed} today={today}/>}
    {page==='daily'&&<DailyPage date={dayDate} setDate={setDayDate} day={day} save={saveDay} notify={notify} today={today}/>}
    {page==='budget'&&<BudgetPage entries={budgetEntries} setEntries={setBudgetEntries} notify={notify}/>}
    {page==='monthly'&&<MonthlyPage date={monthDate} setDate={setMonthDate} month={month} save={saveMonth} templates={templates} saveTemplates={saveTemplates} months={months} setMonths={setMonths} notify={notify}/>}
    {page==='history'&&<HistoryPage days={days} setDate={setDayDate} setPage={setPage} search={search} setSearch={setSearch}/>}
    {page==='settings'&&<SettingsPage exportData={exportData} importData={importData} days={days} months={months} cloudConfigured={cloudConfigured} email={session?.user?.email}/>}
   </div>
   <footer className="footer"><span>DAYMARK · YOUR SPACE, YOUR PACE</span><span>{cloudConfigured?'Private account · Encrypted connection · Cloud sync':'Stored locally in this browser'}</span></footer>
  </main>
  {toast&&<div className="toast"><CircleCheck size={17}/>{toast}</div>}
 </div>
}

function AuthScreen({onSession}){const [mode,setMode]=useState('signin');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
 const submit=async e=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{if(mode==='signin'){const session=await signIn(email.trim(),password);onSession(session);}else if(mode==='signup'){const result=await signUp(email.trim(),password);if(result.session)onSession(result.session);else setMessage('Account created. Check your email to confirm your address, then sign in.');}else{await sendPasswordReset(email.trim());setMessage('Password reset email sent. Check your inbox.');}}catch(err){setError(err.message||'Something went wrong.');}finally{setBusy(false);}};
 return <div className="auth-screen"><div className="auth-card"><div className="brand auth-brand"><div className="brand-mark">d</div><div><b>daymark</b><span>PERSONAL PLANNER</span></div></div><div className="eyebrow">YOUR PERSONAL SPACE</div><h1>{mode==='signin'?'Welcome back.':mode==='signup'?'Create your account.':'Reset your password.'}</h1><p className="auth-sub">{mode==='signin'?'Sign in to access your planner from any device.':mode==='signup'?'Create a private account for your plans and budget.':'We will email you a secure password reset link.'}</p><form onSubmit={submit}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>{mode!=='reset'&&<label>Password<input type="password" required minLength={6} autoComplete={mode==='signin'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>}<button className="primary-btn auth-submit" disabled={busy}>{busy?'Please wait…':mode==='signin'?'Sign in':mode==='signup'?'Create account':'Send reset link'}</button></form>{error&&<div className="auth-error">{error}</div>}{message&&<div className="auth-message">{message}</div>}<div className="auth-links">{mode==='signin'?<><button onClick={()=>setMode('signup')}>Create an account</button><button onClick={()=>setMode('reset')}>Forgot password?</button></>:<button onClick={()=>{setMode('signin');setMessage('');setError('');}}>Back to sign in</button>}</div><div className="auth-privacy"><span className="live-dot"/> Your data is private to your account.</div></div></div>
}

function PasswordRecoveryScreen({session,onComplete}){const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const submit=async e=>{e.preventDefault();setError('');if(password.length<6){setError('Use at least 6 characters.');return;}if(password!==confirm){setError('Passwords do not match.');return;}setBusy(true);try{await updatePassword(password,session);onComplete();}catch(err){setError(err.message||'Could not update password.');}finally{setBusy(false);}};return <div className="auth-screen"><div className="auth-card"><div className="brand auth-brand"><div className="brand-mark">d</div><div><b>daymark</b><span>PERSONAL PLANNER</span></div></div><div className="eyebrow">ACCOUNT SECURITY</div><h1>Choose a new password.</h1><p className="auth-sub">Set a new password for your Daymark account.</p><form onSubmit={submit}><label>New password<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} /></label><label>Confirm password<input type="password" minLength={6} required value={confirm} onChange={e=>setConfirm(e.target.value)} /></label><button className="primary-btn auth-submit" disabled={busy}>{busy?'Saving…':'Update password'}</button></form>{error&&<div className="auth-error">{error}</div>}</div></div>}

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

function BudgetPage({entries,setEntries,notify}){
 const [mode,setMode]=useState('daily'); const [anchor,setAnchor]=useState(localDate());
 const [kind,setKind]=useState('expense'); const [reason,setReason]=useState(''); const [amount,setAmount]=useState(''); const [category,setCategory]=useState('Other'); const [editing,setEditing]=useState(null);
 const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n)||0);
 const startOfWeek=d=>{const x=new Date(`${d}T12:00:00`);x.setDate(x.getDate()-((x.getDay()+6)%7));return localDate(x)};
 const endOfWeek=d=>{const x=new Date(`${startOfWeek(d)}T12:00:00`);x.setDate(x.getDate()+6);return localDate(x)};
 const periodStart=mode==='daily'?anchor:mode==='weekly'?startOfWeek(anchor):`${anchor.slice(0,7)}-01`;
 const periodEnd=mode==='daily'?anchor:mode==='weekly'?endOfWeek(anchor):localDate(new Date(Number(anchor.slice(0,4)),Number(anchor.slice(5,7)),0));
 const visible=entries.filter(e=>e.date>=periodStart&&e.date<=periodEnd).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const income=visible.filter(e=>e.kind==='income').reduce((a,e)=>a+Number(e.amount),0); const expenses=visible.filter(e=>e.kind==='expense').reduce((a,e)=>a+Number(e.amount),0);
 const reset=()=>{setReason('');setAmount('');setCategory('Other');setKind('expense');setEditing(null)};
 const save=async()=>{if(!reason.trim()||!(Number(amount)>0)){notify('Enter a reason and a valid amount');return;}const old=editing?entries.find(e=>e.id===editing):null;const item={id:editing||uid(),kind,reason:reason.trim(),amount:Number(amount),category,date:old?.date||localDate(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};await put('budget',item);const all=await getAll('budget');setEntries(all);reset();notify(editing?'Entry updated':'Entry saved');};
 const edit=e=>{setEditing(e.id);setKind(e.kind);setReason(e.reason);setAmount(String(e.amount));setCategory(e.category||'Other')};
 const remove=async id=>{if(!window.confirm('Delete this budget entry?'))return;await del('budget',id);setEntries(await getAll('budget'));notify('Entry deleted')};
 const shift=n=>{if(mode==='daily'){const d=new Date(`${anchor}T12:00:00`);d.setDate(d.getDate()+n);setAnchor(localDate(d));}else if(mode==='weekly'){const d=new Date(`${anchor}T12:00:00`);d.setDate(d.getDate()+7*n);setAnchor(localDate(d));}else{const d=new Date(`${anchor}T12:00:00`);d.setMonth(d.getMonth()+n);setAnchor(localDate(d));}};
 const grouped=Object.values(visible.reduce((acc,e)=>{(acc[e.date]??={date:e.date,income:0,expense:0,items:0})[e.kind]+=Number(e.amount);acc[e.date].items++;return acc;},{})).sort((a,b)=>a.date.localeCompare(b.date));
 const max=Math.max(1,...grouped.flatMap(x=>[x.income,x.expense]));
 const categoryTotals=Object.entries(visible.filter(e=>e.kind==='expense').reduce((a,e)=>{a[e.category||'Other']=(a[e.category||'Other']||0)+Number(e.amount);return a;},{})).sort((a,b)=>b[1]-a[1]);
 const label=mode==='daily'?prettyDate(anchor):mode==='weekly'?`${prettyDate(periodStart)} – ${prettyDate(periodEnd)}`:prettyMonth(anchor.slice(0,7));
 return <><PageTitle eyebrow="MONEY TRACKER" title="Know where your money goes." sub="Track income and expenses with automatic timestamps and clear summaries."/>
 <div className="budget-switch"><div className="budget-tabs">{[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']].map(([v,t])=><button key={v} className={mode===v?'selected':''} onClick={()=>setMode(v)}>{t}</button>)}</div><div className="budget-period"><button className="icon-btn" onClick={()=>shift(-1)}><ChevronLeft/></button><b>{label}</b><button className="icon-btn" onClick={()=>shift(1)}><ChevronRight/></button><input aria-label="Select budget date" type={mode==='monthly'?'month':'date'} value={mode==='monthly'?anchor.slice(0,7):anchor} onChange={e=>setAnchor(mode==='monthly'?`${e.target.value}-01`:e.target.value)}/></div></div>
 <div className="budget-stats"><div className="budget-stat"><span><TrendingUp size={16}/> INCOME</span><strong>{money(income)}</strong></div><div className="budget-stat"><span><TrendingDown size={16}/> EXPENSES</span><strong>{money(expenses)}</strong></div><div className="budget-stat balance"><span><IndianRupee size={16}/> NET BALANCE</span><strong>{money(income-expenses)}</strong></div></div>
 <div className="budget-layout"><section className="card budget-form"><div className="section-heading inside"><div><h3>{editing?'Edit entry':'Add a transaction'}</h3><p>Transaction date and time are recorded automatically.</p></div></div><div className="budget-kind"><button className={kind==='expense'?'expense-active':''} onClick={()=>setKind('expense')}><TrendingDown size={15}/> Expense</button><button className={kind==='income'?'income-active':''} onClick={()=>setKind('income')}><TrendingUp size={15}/> Income / profit</button></div><label>Reason<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Groceries, freelance payment"/></label><div className="budget-input-row"><label>Amount (₹)<input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{['Food','Travel','Shopping','Bills','Health','Education','Salary','Freelance','Business','Other'].map(c=><option key={c}>{c}</option>)}</select></label></div><div className="budget-form-actions"><button className="primary-btn" onClick={save}><Save size={15}/>{editing?'Update entry':'Save entry'}</button>{editing&&<button className="soft-btn" onClick={reset}>Cancel</button>}</div></section>
 <section className="card budget-chart"><div className="section-heading inside"><div><h3>Daily breakdown</h3><p>Income versus expenses for this {mode==='daily'?'day':mode==='weekly'?'week':'month'}.</p></div></div>{grouped.length?<div className="budget-bars">{grouped.map(d=><div className="budget-bar-row" key={d.date}><span>{new Date(`${d.date}T12:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span><div className="bar-pair"><i className="bar-income" style={{width:`${d.income/max*100}%`}}/><i className="bar-expense" style={{width:`${d.expense/max*100}%`}}/></div><small>{money(d.income-d.expense)}</small></div>)}</div>:<div className="empty-small">Add transactions to see your breakdown.</div>}<div className="budget-legend"><span><i className="bar-income"/> Income</span><span><i className="bar-expense"/> Expenses</span></div></section></div>
 <section className="card budget-entries"><div className="section-heading inside"><div><h3>Transactions</h3><p>{visible.length} entries in this period</p></div><span className="count-pill">{label}</span></div>{visible.length?visible.map(e=><div className="budget-entry" key={e.id}><div className={`budget-entry-icon ${e.kind}`} >{e.kind==='income'?<TrendingUp size={17}/>:<TrendingDown size={17}/>}</div><div className="budget-entry-info"><b>{e.reason}</b><span>{e.category} · {new Date(e.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</span></div><strong className={e.kind==='income'?'positive':'negative'}>{e.kind==='income'?'+':'−'}{money(e.amount)}</strong><button className="icon-btn tiny" title="Edit" onClick={()=>edit(e)}><Pencil size={14}/></button><button className="icon-btn tiny danger" title="Delete" onClick={()=>remove(e.id)}><Trash2 size={14}/></button></div>):<div className="empty-state">No transactions in this period yet. Add your first income or expense above.</div>}</section>
 {categoryTotals.length>0&&<section className="card budget-categories"><div className="section-heading inside"><div><h3>Expense categories</h3><p>Where your spending is concentrated.</p></div></div>{categoryTotals.map(([name,value])=><div className="category-row" key={name}><span>{name}</span><div><i style={{width:`${value/expenses*100}%`}}/></div><b>{money(value)}</b></div>)}</section>}
 </>;
}

function HistoryPage({days,setDate,setPage,search,setSearch}){const filtered=days.filter(d=>d.id.includes(search)||d.tasks.some(t=>t.text.toLowerCase().includes(search.toLowerCase()))||d.notes?.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.id.localeCompare(a.id));return <><PageTitle eyebrow="YOUR HISTORY" title="Every day leaves a trace." sub="Revisit your plans, progress, and notes from previous days."/><div className="history-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search dates, tasks, or remarks…"/></div><div className="history-list">{filtered.map(d=>{const n=d.tasks.length,c=d.tasks.filter(t=>t.done).length;return <button className="history-card" key={d.id} onClick={()=>{setDate(d.id);setPage('daily')}}><div className="history-date"><b>{new Date(`${d.id}T12:00:00`).getDate()}</b><span>{new Date(`${d.id}T12:00:00`).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span></div><div className="history-detail"><b>{prettyDate(d.id)}</b><span>{n} planned · {c} completed · {d.extra.length} extra work · {d.pending.length} pending</span>{d.notes&&<small>{d.notes}</small>}</div><div className="history-percent">{n?Math.round(c/n*100):0}%</div><ChevronRight size={18}/></button>})}{!filtered.length&&<div className="empty-state">{days.length?'No matching days found. Try another search.':'Your history will appear here after you create daily plans.'}</div>}</div></>}
function SettingsPage({exportData,importData,days,months,cloudConfigured,email}){return <><PageTitle eyebrow="PREFERENCES" title="Your planner, your way." sub="Manage your data, account, and backups."/><div className="settings-grid"><section className="card setting-card"><div className="setting-icon"><Download/></div><h3>Back up your planner</h3><p>Download a JSON file containing all daily pages, monthly check-ins, budget transactions, and activity templates.</p><button className="primary-btn" onClick={exportData}><Download size={16}/> Download backup</button></section><section className="card setting-card"><div className="setting-icon"><Upload/></div><h3>Restore from backup</h3><p>Import a previous Daymark backup. Restored records are merged with the data already on this device.</p><label className="soft-btn upload-label"><Upload size={16}/> Choose backup file<input type="file" accept="application/json,.json" onChange={e=>e.target.files[0]&&importData(e.target.files[0])}/></label></section><section className="card setting-card storage-card"><div className="setting-icon"><Save/></div><h3>{cloudConfigured?'Cloud account':'Local storage'}</h3><p>{cloudConfigured?`Signed in as ${email||'your account'}. Your planner is synced to your private cloud account.`:'Your information is stored in this browser using IndexedDB. Configure Supabase to enable account login and cloud sync.'}</p><div className="storage-stats"><span><b>{days.length}</b> daily pages</span><span><b>{months.length}</b> monthly records</span></div><div className="storage-note"><span className="live-dot"/> {cloudConfigured?'Automatic cloud sync is active':'Automatic local saving is active'}</div></section></div><div className="privacy-note"><Sparkles size={18}/><div><b>Keep your data safe</b><p>{cloudConfigured?'Your account can only access its own data. You can still download a JSON backup at any time.':'Browser data can be lost if site data is cleared. Export a backup regularly. Cloud access becomes available after Supabase is configured.'}</p></div></div></>}

createRoot(document.getElementById('root')).render(<App/>);
