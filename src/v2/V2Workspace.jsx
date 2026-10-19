import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, History, RefreshCw, Save, Sparkles, Trash2, ShieldCheck, LogIn, UserPlus, LogOut, Database } from 'lucide-react';
import './V2Workspace.css';

const MODEL = 'gemini-3.5-flash-lite';
const LANGUAGES = [
  ['en','English'],['te','తెలుగు'],['hi','हिन्दी'],['ta','தமிழ்'],
  ['bn','বাংলা'],['mr','मराठी'],['kn','ಕನ್ನಡ'],['ml','മലയാളം'],['ur','اردو']
];
const LABELS = {
 en:{title:'Insight Assistant · V2.0.1.1',subtitle:'Private report history, local data checks and secure AI-powered insights. Your imported raw rows stay in this browser.',quality:'Smart data checks',records:'Rows inspected',duplicates:'Possible duplicate rows',invalid:'Invalid numeric values',missing:'Fields with missing values',local:'Local checks: your imported rows stay in this browser.',language:'Summary language',summarize:'Generate Gemini summary',apiKey:'Gemini API key',saveKey:'Use key in this browser',remember:'Remember on this browser',forget:'Forget key',keyHint:'Paste your own Gemini API key. It is never written to GitHub or sent to an InsightBoard server.',warning:'Only the sanitized aggregate snapshot is sent to Google Gemini for this summary. Raw imported rows and account credentials are not sent. Do not submit confidential or sensitive data.',consent:'I understand that clicking Generate sends only this aggregate KPI/chart snapshot and category/field labels to Google Gemini—not the raw rows. Free-tier prompts may be used by Google to improve products. I will not send confidential or sensitive data.',ai:'AI summary',none:'No summary yet. Confirm the data-sharing note, then generate an AI summary.',save:'Save snapshot to account',history:'Saved report history (MongoDB)',historyNote:'Account-specific aggregate snapshots sync across devices. Raw imported rows are not uploaded.',noHistory:'No saved reports in this account yet.',saved:'Aggregate snapshot saved to your account.',cleared:'Account report history cleared.',missingKey:'Enter your Gemini API key first.',consentErr:'Confirm the data-sharing note before requesting a summary.',keySaved:'Key is available in this browser session only.',keyRemembered:'Key remembered in this browser. Clear browser storage to remove it.',forgot:'Gemini key removed from this browser.',storage:'Browser-only storage',notSent:'No data has been sent to Gemini yet.',setup:'Get a Gemini API key',delete:'Delete saved report',clear:'Clear account history',apiError:'Gemini request failed'},
 hi:{title:'इनसाइट सहायक · V2.0.1.1',subtitle:'निजी खाते और MongoDB में सहेजी गई रिपोर्ट। मूल आयातित पंक्तियाँ ब्राउज़र में रहती हैं।',quality:'स्मार्ट डेटा जाँच',records:'जाँची गई पंक्तियाँ',duplicates:'संभावित डुप्लिकेट पंक्तियाँ',invalid:'अमान्य संख्यात्मक मान',missing:'खाली मान वाले फ़ील्ड',local:'स्थानीय जाँच: अपलोड की गई पंक्तियाँ इसी ब्राउज़र में रहती हैं।',language:'सारांश की भाषा',summarize:'Gemini सारांश बनाएँ',apiKey:'Gemini API key',saveKey:'इस ब्राउज़र में उपयोग करें',remember:'इस ब्राउज़र में याद रखें',forget:'कुंजी हटाएँ',keyHint:'अपनी Gemini API key पेस्ट करें। यह GitHub पर नहीं लिखी जाएगी और InsightBoard सर्वर पर नहीं भेजी जाएगी।',warning:'ब्राउज़र-आधारित डेमो: यह ब्राउज़र Google को सीधे कॉल करता है। सार्वजनिक वेबसाइट पर साझा करने के लिए बनी कुंजी का उपयोग न करें।',consent:'मैं समझता/समझती हूँ कि Generate दबाने पर केवल समेकित KPI/चार्ट आँकड़े और फ़ील्ड/श्रेणी नाम Google Gemini को भेजे जाएँगे, पूरी पंक्तियाँ नहीं। मुफ़्त टियर के प्रॉम्प्ट का उपयोग Google उत्पाद सुधारने के लिए कर सकता है। मैं गोपनीय डेटा नहीं भेजूँगा/भेजूँगी।',ai:'AI सारांश',none:'अभी सारांश नहीं है। कुंजी डालें, डेटा साझा करने की सहमति दें और सारांश बनाएँ।',save:'स्नैपशॉट स्थानीय रूप से सहेजें',history:'सहेजे गए रिपोर्ट (यह ब्राउज़र)',historyNote:'केवल आँकड़े, फ़िल्टर और वैकल्पिक AI पाठ स्थानीय रूप से सहेजे जाते हैं।',noHistory:'इस ब्राउज़र में कोई स्नैपशॉट नहीं है।',saved:'स्नैपशॉट इस ब्राउज़र में सहेजा गया।',cleared:'इतिहास हटाया गया।',missingKey:'पहले Gemini API key डालें।',consentErr:'सारांश बनाने से पहले डेटा-साझाकरण नोट स्वीकार करें।',keySaved:'कुंजी केवल इस ब्राउज़र सत्र में उपलब्ध है।',keyRemembered:'कुंजी इस ब्राउज़र में याद रखी गई है।',forgot:'कुंजी हटा दी गई।',storage:'ब्राउज़र-स्थानीय स्टोरेज',notSent:'Gemini को अभी डेटा नहीं भेजा गया है।',setup:'Gemini API key प्राप्त करें',delete:'स्नैपशॉट हटाएँ',clear:'इतिहास हटाएँ',apiError:'Gemini अनुरोध विफल'},
 te:{title:'ఇన్‌సైట్ అసిస్టెంట్ · V2.0.1.1',subtitle:'Private accounts మరియు MongoDBలో saved reports. అసలు imported rows ఈ browserలోనే ఉంటాయి.',quality:'స్మార్ట్ డేటా తనిఖీలు',records:'పరిశీలించిన వరుసలు',duplicates:'సంభావ్య డూప్లికేట్ వరుసలు',invalid:'చెల్లని సంఖ్యా విలువలు',missing:'ఖాళీ విలువలున్న ఫీల్డ్‌లు',local:'స్థానిక తనిఖీలు: మీ దిగుమతి చేసిన వరుసలు ఈ browser‌లోనే ఉంటాయి.',language:'సారాంశ భాష',summarize:'Gemini సారాంశం రూపొందించు',apiKey:'Gemini API key',saveKey:'ఈ browser‌లో ఉపయోగించు',remember:'ఈ browser‌లో గుర్తుంచుకో',forget:'Key తొలగించు',keyHint:'మీ Gemini API keyను పేస్ట్ చేయండి. ఇది GitHub‌లో రాయబడదు లేదా InsightBoard server‌కు పంపబడదు.',warning:'Browser-only demo: ఈ browser Google APIని నేరుగా పిలుస్తుంది. పబ్లిక్ వెబ్‌సైట్‌లో అందరికీ పంచుకునే key ఉపయోగించవద్దు.',consent:'Generate నొక్కితే సమగ్ర KPI/chart గణాంకాలు, field/category పేర్లు మాత్రమే Google Geminiకి పంపబడతాయని అర్థం చేసుకున్నాను; raw rows పంపబడవు. ఉచిత API promptలను Google ఉత్పత్తులను మెరుగుపరచడానికి ఉపయోగించవచ్చు. గోప్యమైన డేటాను పంపను.',ai:'AI సారాంశం',none:'ఇంకా సారాంశం లేదు. key నమోదు చేసి, డేటా పంపేందుకు అంగీకరించి, సారాంశం రూపొందించండి.',save:'స్నాప్‌షాట్‌ను స్థానికంగా సేవ్ చేయి',history:'సేవ్ చేసిన రిపోర్టులు (ఈ browser)',historyNote:'సారాంశ గణాంకాలు, ఫిల్టర్లు, ఐచ్ఛిక AI పాఠ్యం మాత్రమే స్థానికంగా నిల్వ అవుతాయి.',noHistory:'ఈ browser‌లో స్నాప్‌షాట్‌లు లేవు.',saved:'స్నాప్‌షాట్ ఈ browser‌లో సేవ్ అయింది.',cleared:'చరిత్ర తొలగించబడింది.',missingKey:'ముందుగా Gemini API key నమోదు చేయండి.',consentErr:'సారాంశానికి ముందు డేటా-షేరింగ్ నోటును అంగీకరించండి.',keySaved:'Key ఈ browser session‌లో మాత్రమే ఉంటుంది.',keyRemembered:'Key ఈ browser‌లో గుర్తుంచబడింది.',forgot:'Gemini key తొలగించబడింది.',storage:'Browser-only storage',notSent:'ఇంకా Geminiకి డేటా పంపలేదు.',setup:'Gemini API key పొందండి',delete:'స్నాప్‌షాట్ తొలగించు',clear:'చరిత్ర తొలగించు',apiError:'Gemini అభ్యర్థన విఫలమైంది'}
};
const blank = value => value === null || value === undefined || (typeof value === 'string' && !value.trim());
function rowFingerprint(row, fields) {
  return JSON.stringify(fields.map(field => {
    const value = row?.[field];
    return value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value).slice(0,160) : String(value).trim().slice(0,160);
  }));
}
function checkData(rows, fields, numericFields) {
  const list = Array.isArray(rows) ? rows : [];
  const subset = list.slice(0,10000);
  const checkedFields = (fields || []).slice(0,40);
  const missing = checkedFields.map(field => {
    const count = subset.filter(row => blank(row?.[field])).length;
    return { field, count, percent: subset.length ? Math.round(count / subset.length * 100) : 0 };
  }).filter(item => item.count).sort((a,b) => b.percent-a.percent).slice(0,6);
  const seen = new Set(); let duplicates = 0;
  for (const row of subset) {
    const key = rowFingerprint(row, checkedFields.slice(0,20));
    if (seen.has(key)) duplicates++; else seen.add(key);
  }
  const invalid = (numericFields || []).slice(0,20).reduce((total, field) =>
    total + subset.filter(row => !blank(row?.[field]) && Number.isNaN(Number(row[field]))).length, 0);
  return { scanned:subset.length, total:list.length, limited:list.length>subset.length, missing, duplicates, invalid };
}
function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a'); anchor.href=url; anchor.download=filename; anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function V2Workspace({analytics,rows,fields,numericFields}) {
  const [uiLanguage,setUiLanguage]=useState('en');
  const [summaryLanguage,setSummaryLanguage]=useState('en');
  const [consent,setConsent]=useState(false);
  const [aiStatus,setAiStatus]=useState({state:'checking',model:MODEL});
  const [busy,setBusy]=useState(false);
  const [summary,setSummary]=useState('');
  const [message,setMessage]=useState('');
  const [history,setHistory]=useState([]);
  const [authToken,setAuthToken]=useState(()=>{try{return sessionStorage.getItem('insightboard-api-token')||'';}catch{return '';}});
  const [account,setAccount]=useState(null);
  const [authMode,setAuthMode]=useState('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [authBusy,setAuthBusy]=useState(false);
  const [reportsBusy,setReportsBusy]=useState(false);
  const [reportSaveBusy,setReportSaveBusy]=useState(false);
  const [backendStatus,setBackendStatus]=useState('Checking backend and database…');
  const copy=LABELS[uiLanguage]||LABELS.en;
  const quality=useMemo(()=>checkData(rows,fields,numericFields),[rows,fields,numericFields]);

  const fetchReports = useCallback(async (token) => {
    if(!token){setHistory([]);return;}
    setReportsBusy(true);
    try {
      const response=await fetch('/api/reports',{headers:{Authorization:`Bearer ${token}`}});
      const result=await response.json().catch(()=>({}));
      if(response.status===401){
        try{sessionStorage.removeItem('insightboard-api-token');}catch{}
        setAuthToken('');setAccount(null);setHistory([]);
        throw new Error(result.error||'Please sign in again.');
      }
      if(!response.ok)throw new Error(result.error||'Could not load saved reports.');
      setHistory(Array.isArray(result.reports)?result.reports:[]);
      setBackendStatus('Backend and database connected');
    } catch(error) {
      setMessage(error?.message||'Could not load account reports.');
      if(String(error?.message||'').includes('Failed to fetch'))setBackendStatus('Backend connection unavailable');
    } finally {setReportsBusy(false);}
  },[]);

  async function submitAuth(event) {
    event?.preventDefault?.();
    const cleanEmail=email.trim().toLowerCase();
    if(!cleanEmail||!password){setMessage('Enter your email and password.');return;}
    setAuthBusy(true);setMessage('');
    const controller=new AbortController();
    const requestTimeout=setTimeout(()=>controller.abort(),60000);
    try {
      const response=await fetch('/api/auth/'+(authMode==='register'?'register':'login'),{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:cleanEmail,password}),
        signal:controller.signal
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Account request failed.');
      if(!result.token||!result.user)throw new Error('The server returned an incomplete account response. Check the Render deployment and logs.');
      try{sessionStorage.setItem('insightboard-api-token',result.token);}catch{}
      setAccount(result.user);setAuthToken(result.token);setPassword('');
      setMessage(authMode==='register'?'Account created. Your saved reports are private to this account.':'Signed in. Loading your saved reports.');
    } catch(error) {
      if(error?.name==='AbortError') {
        setMessage('This request timed out after 60 seconds. Render may be waking from sleep, or the database may still be reconnecting. Check /api/health and the Render logs before trying again.');
      } else if(error instanceof TypeError) {
        setMessage('Could not reach the account API. Check that the latest V2 deployment is running, then open /api/health.');
      } else {
        setMessage(error?.message||'Could not connect to the account service.');
      }
    } finally {
      clearTimeout(requestTimeout);
      setAuthBusy(false);
    }
  }

  function signOut() {
    try{sessionStorage.removeItem('insightboard-api-token');}catch{}
    setAuthToken('');setAccount(null);setHistory([]);
    setMessage('Signed out. Saved reports remain in your account.');
  }

  useEffect(()=>{
    let alive=true;
    fetch('/api/health').then(async response=>{
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Database not ready');
      return data;
    }).then(data=>{if(alive)setBackendStatus(data.database?'Backend and database connected':'Backend online; database not connected');})
      .catch(()=>{if(alive)setBackendStatus('Backend not ready yet — check hosting and database settings');});
    return ()=>{alive=false;};
  },[]);
  useEffect(()=>{
    let alive=true;
    fetch('/api/ai/status').then(async response=>{
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'AI status unavailable');
      return data;
    }).then(data=>{
      if(alive)setAiStatus({state:data.available?'ready':'setup',model:data.model||MODEL});
    }).catch(()=>{if(alive)setAiStatus({state:'offline',model:MODEL});});
    return ()=>{alive=false;};
  },[]);

  useEffect(()=>{
    let alive=true;
    if(!authToken){setAccount(null);setHistory([]);return ()=>{alive=false;};}
    (async()=>{
      try {
        const response=await fetch('/api/auth/me',{headers:{Authorization:`Bearer ${authToken}`}});
        const data=await response.json().catch(()=>({}));
        if(response.status===401){
          try{sessionStorage.removeItem('insightboard-api-token');}catch{}
          if(alive){setAuthToken('');setAccount(null);setHistory([]);setMessage(data.error||'Sign in again to access saved reports.');}
          return;
        }
        if(!response.ok)throw new Error(data.error||'Could not validate your account session.');
        if(alive){setAccount(data.user);await fetchReports(authToken);}
      } catch(error) {if(alive)setMessage(error?.message||'Could not connect to your account.');}
    })();
    return ()=>{alive=false;};
  },[authToken,fetchReports]);



  async function generateSummary() {
    if(!consent){setMessage(copy.consentErr);return;}
    if(aiStatus.state!=='ready'){
      setMessage('The shared AI service is not configured yet. The site owner must add GEMINI_API_KEY in Render and redeploy V2.');
      return;
    }
    setBusy(true);setMessage('');setSummary('');
    try {
      const response=await fetch('/api/ai/summary',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({snapshot:analytics,language:summaryLanguage})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'AI summary request failed.');
      const text=typeof result.summary==='string'?result.summary.trim():'';
      if(!text)throw new Error('The AI service returned no summary. Please try again.');
      setSummary(text);
      setMessage('AI summary generated. Cross-check important findings against the original dataset.');
    } catch(error) {
      setMessage(error?.message||'Could not generate an AI summary. Try again later.');
    } finally {setBusy(false);}
  }

  async function saveSnapshot() {
    if(!authToken){setMessage('Sign in or create an account below before saving reports.');return;}
    const entry={
      title:(String(analytics?.datasetName||'InsightBoard report').slice(0,90)+' · '+new Date().toLocaleString()),
      datasetName:String(analytics?.datasetName||'Current dataset').slice(0,120),
      recordCount:Number(analytics?.recordCount)||0,
      filters:analytics?.filters||{},
      snapshot:analytics||{},
      summary:summary||''
    };
    setReportSaveBusy(true);setMessage('');
    try {
      const response=await fetch('/api/reports',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${authToken}`},
        body:JSON.stringify(entry)
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Could not save this report.');
      await fetchReports(authToken);
      setMessage(copy.saved);
    } catch(error) {setMessage(error?.message||'Could not save the report.');}
    finally {setReportSaveBusy(false);}
  }

  async function deleteSnapshot(id) {
    if(!authToken)return;
    try {
      const response=await fetch('/api/reports/'+encodeURIComponent(id),{method:'DELETE',headers:{Authorization:`Bearer ${authToken}`}});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Could not delete the report.');
      await fetchReports(authToken);setMessage('Saved report deleted from your account.');
    } catch(error) {setMessage(error?.message||'Could not delete the report.');}
  }

  async function clearHistory() {
    if(!authToken||!history.length)return;
    if(!window.confirm('Delete all saved reports from this account? This cannot be undone.'))return;
    try {
      const response=await fetch('/api/reports',{method:'DELETE',headers:{Authorization:`Bearer ${authToken}`}});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Could not clear report history.');
      setHistory([]);setMessage(copy.cleared);
    } catch(error) {setMessage(error?.message||'Could not clear report history.');}
  }

  function exportSnapshot(item){downloadText(JSON.stringify(item.snapshot,null,2),'insightboard-snapshot.json');}

  return <section className="v2-workspace" aria-labelledby="v2-title">
    <div className="v2-heading">
      <div><div className="v2-eyebrow"><Sparkles size={15}/> V2 LAB · VERSION 2.0.2 BETA</div><h2 id="v2-title">{copy.title}</h2><p>{copy.subtitle}</p></div>
      <label className="v2-language"><span>UI</span><select value={uiLanguage} onChange={event=>setUiLanguage(event.target.value)} aria-label="Workspace language"><option value="en">English</option><option value="hi">हिन्दी</option><option value="te">తెలుగు</option></select></label>
    </div>
      <div className="v2-account-panel v2-account-hero">
        <div className="v2-account-intro">
          <div className="v2-account-mark"><Sparkles size={19}/></div>
          <div><span className="v2-overline">YOUR PRIVATE WORKSPACE</span><h3>Welcome to InsightBoard</h3><p>Sign in to keep your report history, or create an account to get started. Your imported raw data remains in your browser.</p></div>
        </div>
        <div className="v2-account-content">
        <div className="v2-account-status"><span className={backendStatus.includes('connected')?'v2-status-online':'v2-status-waiting'}></span><span>{backendStatus}</span></div>
        {account?<>
          <div className="v2-account-signed">
            <div><strong><Database size={15}/> {account.email}</strong><small>Signed in · Report history belongs to this account</small></div>
            <div className="v2-button-row">
              <button type="button" className="v2-button secondary" onClick={()=>void fetchReports(authToken)} disabled={reportsBusy}><RefreshCw size={14}/>{reportsBusy?'Refreshing…':'Refresh reports'}</button>
              <button type="button" className="v2-text-button" onClick={signOut}><LogOut size={14}/>Sign out</button>
            </div>
          </div>
        </>:<>
          <p className="v2-muted">Create an account or sign in to save aggregate reports to MongoDB and access them from another device. Imported raw rows stay in your browser.</p>
          <div className="v2-auth-tabs">
            <button type="button" className={authMode==='login'?'active':''} onClick={()=>setAuthMode('login')}><LogIn size={14}/> Sign in</button>
            <button type="button" className={authMode==='register'?'active':''} onClick={()=>setAuthMode('register')}><UserPlus size={14}/> Create account</button>
          </div>
          <form key={authMode} className="v2-auth-form" onSubmit={submitAuth}>
            <label className="v2-field"><span>Email</span><input type="email" autoComplete="email" maxLength={254} required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/></label>
            <label className="v2-field"><span>Password (10–128 characters)</span><input type="password" autoComplete={authMode==='register'?'new-password':'current-password'} minLength={10} maxLength={128} required value={password} onChange={event=>setPassword(event.target.value)} placeholder="At least 10 characters"/></label>
            <button className="v2-button primary" type="submit" disabled={authBusy}>{authBusy?<RefreshCw size={14} className="v2-spin"/>:authMode==='register'?<UserPlus size={14}/>:<LogIn size={14}/>} {authBusy?'Please wait…':authMode==='register'?'Create account':'Sign in'}</button>
          </form>
          <p className="v2-note">Use a unique password. Password hashes—not plaintext passwords—are stored. Account session ends when this browser session is cleared.</p>
        </>}
        </div>
      </div>
    <div className="v2-grid">
      <article className="v2-card v2-quality">
        <div className="v2-card-title"><AlertTriangle size={18}/><h3>{copy.quality}</h3><span className="v2-local-pill">LOCAL</span></div>
        <p className="v2-muted">{copy.local}</p>
        <div className="v2-stats">
          <div><span>{copy.records}</span><strong>{quality.scanned.toLocaleString()}{quality.limited?'+':''}</strong></div>
          <div><span>{copy.duplicates}</span><strong>{quality.duplicates.toLocaleString()}</strong></div>
          <div><span>{copy.invalid}</span><strong>{quality.invalid.toLocaleString()}</strong></div>
        </div>
        <div className="v2-subhead">{copy.missing}</div>
        {quality.missing.length?<ul className="v2-quality-list">{quality.missing.map(item=><li key={item.field}><span>{item.field}</span><strong>{item.percent}% <small>({item.count})</small></strong></li>)}</ul>:<p className="v2-good"><CheckCircle2 size={15}/> No missing values found in inspected fields.</p>}
        {quality.limited&&<p className="v2-note">Data checks inspect the first 10,000 rows for speed.</p>}
        {!quality.total&&<p className="v2-note">Import a dataset to run checks.</p>}
      </article>

      <article className="v2-card v2-ai">
        <div className="v2-card-title"><Sparkles size={18}/><h3>{copy.ai}</h3><span className={`v2-ai-badge ${aiStatus.state}`}>{aiStatus.state==='ready'?'SECURE AI READY':aiStatus.state==='setup'?'SETUP NEEDED':aiStatus.state==='offline'?'API OFFLINE':'CHECKING'}</span></div>
        <p className="v2-muted">Model: {aiStatus.model}. InsightBoard sends a small, sanitized aggregate snapshot to Gemini through the backend. Your server-side API key never enters the browser.</p>
        <div className="v2-ai-highlights">
          <div><ShieldCheck size={17}/><span><strong>Server-side key</strong><small>Kept in Render environment variables</small></span></div>
          <div><Database size={17}/><span><strong>Raw rows stay local</strong><small>Only aggregate metrics and category labels are sent</small></span></div>
        </div>
        <label className="v2-field"><span>{copy.language}</span><select value={summaryLanguage} onChange={event=>setSummaryLanguage(event.target.value)}>{LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
        <label className="v2-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>{copy.consent}</span></label>
        <button className="v2-button primary v2-generate-button" onClick={()=>void generateSummary()} disabled={busy||aiStatus.state!=='ready'||!consent}>{busy?<RefreshCw size={15} className="v2-spin"/>:<Sparkles size={15}/>} {busy?'Analyzing your snapshot…':copy.summarize}</button>
        {aiStatus.state==='setup'&&<div className="v2-config-note"><AlertTriangle size={15}/><span>AI is not configured on the server yet. The site owner must add <code>GEMINI_API_KEY</code> in Render → Environment and deploy the updated V2 service. Never add the key to GitHub or browser code.</span></div>}
        {aiStatus.state==='offline'&&<div className="v2-config-note"><AlertTriangle size={15}/><span>Could not reach the AI status endpoint. Check that the latest V2 deployment is running.</span></div>}
        {summary?<div className="v2-summary" aria-live="polite"><h4>InsightBoard · Gemini</h4><div>{summary}</div></div>:<p className="v2-note">{copy.none}</p>}
        <button className="v2-button secondary" onClick={()=>void saveSnapshot()} disabled={reportSaveBusy}>{reportSaveBusy?<RefreshCw size={15} className="v2-spin"/>:<Save size={15}/>} {reportSaveBusy?'Saving report…':copy.save}</button>
        {message&&<div className="v2-message" role="status"><span>{message}</span><button onClick={()=>setMessage('')} aria-label="Dismiss message">×</button></div>}
      </article>
    </div>
    <article className="v2-card v2-history">
      <div className="v2-card-title"><History size={18}/><h3>{copy.history}</h3><button className="v2-text-button" onClick={clearHistory} disabled={!authToken||!history.length||reportsBusy}><Trash2 size={14}/>{copy.clear}</button></div>
      <p className="v2-muted">{copy.historyNote}</p>

      {authToken&&<div className="v2-report-list">
        {reportsBusy&&!history.length?<p className="v2-note">Loading saved reports…</p>:history.length?<div className="v2-reports">{history.map(item=><div className="v2-report-row" key={item.id}><div><strong>{item.title}</strong><small>{item.datasetName} · {Number(item.recordCount||0).toLocaleString()} records · {new Date(item.createdAt).toLocaleString()}</small>{item.summary&&<p>{item.summary.slice(0,220)}{item.summary.length>220?'…':''}</p>}</div><div className="v2-report-actions"><button className="v2-delete" title="Download aggregate snapshot" aria-label="Download aggregate snapshot" onClick={()=>exportSnapshot(item)}><Save size={14}/></button><button className="v2-delete" title={copy.delete} aria-label={copy.delete} onClick={()=>void deleteSnapshot(item.id)}><Trash2 size={14}/></button></div></div>)}</div>:<p className="v2-note">{copy.noHistory}</p>}
      </div>}
    </article>
  </section>;
}
