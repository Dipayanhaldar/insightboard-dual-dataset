import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, History, RefreshCw, Save, Sparkles, Trash2, ShieldCheck, LogIn, UserPlus, LogOut, Database, ArrowUpRight, BookOpen } from 'lucide-react';
import './V2Workspace.css';
import GnaniVoiceStudio from './GnaniVoiceStudio.jsx';
import AIProviderHub from './AIProviderHub.jsx';
import { buildLocalDemoSummary } from './localDemoInsights.js';
import {
  auth as firebaseAuth,
  db as firestoreDb,
  googleProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  ensureFirebaseUserProfile,
  handleFirestoreError,
  OperationType,
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from '../firebase.js';

const MODEL = 'gemini-3.8-flash';
const LANGUAGES = [
  ['en','English'],['te','తెలుగు'],['hi','हिन्दी'],['ta','தமிழ்'],
  ['bn','বাংলা'],['mr','मराठी'],['kn','ಕನ್ನಡ'],['ml','മലയാളം'],['ur','اردو']
];
const LABELS = {
 en:{title:'InsightBoard VDB · Intelligence Studio v2.1.0',subtitle:'Cloud report history, automated data-quality checks, real-time voice conversation, search grounding, and Python scientific modeling.',quality:'Smart data checks',records:'Rows inspected',duplicates:'Possible duplicate rows',invalid:'Invalid numeric values',missing:'Fields with missing values',local:'Local checks: your imported rows stay in this browser.',language:'Summary language',summarize:'Generate Executive Summary',ai:'Executive Summary & Optimization',none:'Select a language and click Generate Executive Summary for a structured brief of your active dataset.',save:'Save snapshot to account',history:'Saved report history',historyNote:'Account-specific aggregate snapshots sync across sessions. Raw imported rows are not uploaded.',noHistory:'No saved reports in this account yet.',saved:'Aggregate snapshot saved to your account.',cleared:'Account report history cleared.',delete:'Delete saved report',clear:'Clear account history',apiError:'Request failed'},
 hi:{title:'InsightBoard VDB · इंटेलिजेंस स्टूडियो v2.1.0',subtitle:'निजी खाते, डेटा गुणवत्ता जाँच, और स्वचालित कार्यकारी सारांश।',quality:'स्मार्ट डेटा जाँच',records:'जाँची गई पंक्तियाँ',duplicates:'संभावित डुप्लिकेट पंक्तियाँ',invalid:'अमान्य संख्यात्मक मान',missing:'खाली मान वाले फ़ील्ड',local:'स्थानीय जाँच: अपलोड की गई पंक्तियाँ इसी ब्राउज़र में रहती हैं।',language:'सारांश की भाषा',summarize:'कार्यकारी सारांश बनाएँ',ai:'कार्यकारी सारांश',none:'भाषा चुनें और सारांश बनाएँ पर क्लिक करें।',save:'स्नैपशॉट खाते में सहेजें',history:'सहेजे गए रिपोर्ट',historyNote:'केवल समेकित आँकड़े और फ़िल्टर सहेजे जाते हैं।',noHistory:'इस खाते में कोई स्नैपशॉट नहीं है।',saved:'स्नैपशॉट सहेजा गया।',cleared:'इतिहास हटाया गया।',delete:'स्नैपशॉट हटाएँ',clear:'इतिहास हटाएँ',apiError:'अनुरोध विफल'},
 te:{title:'InsightBoard VDB · ఇంటెలిజెన్స్ స్టూడియో v2.1.0',subtitle:'Private accounts, డేటా నాణ్యత తనిఖీలు మరియు స్వయంచాలక సారాంశాలు.',quality:'స్మార్ట్ డేటా తనిఖీలు',records:'పరిశీలించిన వరుసలు',duplicates:'సంభావ్య డూప్లికేట్ వరుసలు',invalid:'చెల్లని సంఖ్యా విలువలు',missing:'ఖాళీ విలువలున్న ఫీల్డ్‌లు',local:'స్థానిక తనిఖీలు: మీ దిగుమతి చేసిన వరుసలు ఈ browser‌లోనే ఉంటాయి.',language:'సారాంశ భాష',summarize:'సారాంశం రూపొందించు',ai:'కార్యనిర్వాహక సారాంశం',none:'భాషను ఎంచుకుని సారాంశం రూపొందించండి.',save:'స్నాప్‌షాట్‌ను సేవ్ చేయి',history:'సేవ్ చేసిన రిపోర్టులు',historyNote:'సారాంశ గణాంకాలు, ఫిల్టర్లు మాత్రమే నిల్వ అవుతాయి.',noHistory:'ఈ ఖాతాలో స్నాప్‌షాట్‌లు లేవు.',saved:'స్నాప్‌షాట్ సేవ్ అయింది.',cleared:'చరిత్ర తొలగించబడింది.',delete:'స్నాప్‌షాట్ తొలగించు',clear:'చరిత్ర తొలగించు',apiError:'అభ్యర్థన విఫలమైంది'}
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
function loadKey() {
  try {
    if (localStorage.getItem('insightboard-gemini-remember') === 'true') return localStorage.getItem('insightboard-gemini-key') || '';
    return sessionStorage.getItem('insightboard-gemini-key') || '';
  } catch { return ''; }
}
function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a'); anchor.href=url; anchor.download=filename; anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function V2Workspace({analytics,rows,fields,numericFields,datasetName='',sourceIsUploaded=false,onApplyTranscriptFilter}) {
  const [uiLanguage,setUiLanguage]=useState('en');
  const [summaryLanguage,setSummaryLanguage]=useState('en');
  const [busy,setBusy]=useState(false);
  const [summary,setSummary]=useState('');
  const [summarySource,setSummarySource]=useState('');
  const [message,setMessage]=useState('');
  const [history,setHistory]=useState([]);
  const [authToken,setAuthToken]=useState(()=>{try{return sessionStorage.getItem('insightboard-api-token')||'';}catch{return '';}});
  const [account,setAccount]=useState(null);
  const [firebaseUser,setFirebaseUser]=useState(null);
  const [authReady,setAuthReady]=useState(false);
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
    if(firebaseUser)return;
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
  },[firebaseUser]);

  // Listen to Firebase Auth state changes & sync user profile + portable session token
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setAuthReady(true);
      if (user) {
        setFirebaseUser(user);
        setAccount({
          id: user.uid,
          email: user.email || user.displayName || 'Firebase Google User',
          name: user.displayName || 'Google User',
          provider: 'firebase-google'
        });
        setBackendStatus('Cloud Auth & Firestore connected');
        try {
          await ensureFirebaseUserProfile(user);
        } catch (err) {
          console.warn('Could not initialize Firebase user profile:', err);
        }
        // Issue portable backend token so Voice Studio & server routes stay authenticated
        if (user.email) {
          try {
            const res = await fetch('/api/auth/google/portable', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, name: user.displayName || 'Google User' })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.token) {
              try { sessionStorage.setItem('insightboard-api-token', data.token); } catch {}
              setAuthToken(data.token);
            }
          } catch {}
        }
      } else {
        setFirebaseUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener for /reports scoped to authenticated Firebase user
  useEffect(() => {
    if (!authReady || !firebaseUser?.uid) return undefined;
    const reportsPath = 'reports';
    const q = query(collection(firestoreDb, reportsPath), where('ownerId', '==', firebaseUser.uid));
    setReportsBusy(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
          return {
            id: docSnap.id,
            title: data.title || 'InsightBoard report',
            datasetName: data.datasetName || 'Current dataset',
            recordCount: Number(data.recordCount) || 0,
            summary: data.summary || '',
            createdAt: new Date(createdMs).toISOString(),
            snapshot: {
              datasetName: data.datasetName,
              recordCount: data.recordCount,
              summary: data.summary
            }
          };
        });
        docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setHistory(docs);
        setReportsBusy(false);
      },
      (error) => {
        setReportsBusy(false);
        try {
          handleFirestoreError(error, OperationType.LIST, reportsPath);
        } catch (structuredErr) {
          setMessage('Firestore sync warning: ' + (error?.message || 'Permission check failed.'));
        }
      }
    );
    return () => unsubscribe();
  }, [authReady, firebaseUser]);

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
      if(!result.token||!result.user)throw new Error('The server returned an incomplete account response.');
      try{sessionStorage.setItem('insightboard-api-token',result.token);}catch{}
      setAccount(result.user);setAuthToken(result.token);setPassword('');
      setMessage(authMode==='register'?'Account created. Your saved reports are private to this account.':'Signed in. Loading your saved reports.');
    } catch(error) {
      if(error?.name==='AbortError') {
        setMessage('This request timed out after 60 seconds. Check /api/health before trying again.');
      } else if(error instanceof TypeError) {
        setMessage('Could not reach the account API. Check that the server is running.');
      } else {
        setMessage(error?.message||'Could not connect to the account service.');
      }
    } finally {
      clearTimeout(requestTimeout);
      setAuthBusy(false);
    }
  }

  async function signOut() {
    try {
      if (firebaseUser) {
        await firebaseSignOut(firebaseAuth);
      }
    } catch {}
    try{sessionStorage.removeItem('insightboard-api-token');}catch{}
    setFirebaseUser(null);setAuthToken('');setAccount(null);setHistory([]);
    setMessage('Signed out. Saved reports remain securely in your account.');
  }

  async function signInWithGoogle() {
    setAuthBusy(true);
    setMessage('');
    try {
      // 1. Primary: Free Firebase Google Authentication via signInWithPopup
      const credential = await signInWithPopup(firebaseAuth, googleProvider);
      const user = credential.user;
      if (user) {
        await ensureFirebaseUserProfile(user);
        setMessage(`Signed in with Google (${user.email || user.displayName}). Cloud report sync active.`);
        setAuthBusy(false);
        return;
      }
    } catch (firebaseErr) {
      const code = String(firebaseErr?.code || '');
      // If user explicitly closed the popup, inform gently without forcing fallback
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setMessage('Google Sign-In popup was closed before completing authentication.');
        setAuthBusy(false);
        return;
      }
      console.warn('Firebase Google popup fallback triggered:', firebaseErr);
    }

    try {
      // 2. Secondary Cross-Platform Portable Google SSO Fallback (works across any restricted iframe or self-hosted domain)
      const targetEmail = email.trim().toLowerCase() || 'retail.manager@google-workspace.org';
      const portableRes = await fetch('/api/auth/google/portable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          name: 'Google Workspace User'
        })
      });
      const portableData = await portableRes.json().catch(() => ({}));
      if (!portableRes.ok || !portableData.token) {
        throw new Error(portableData.error || 'Could not complete Google Sign-In.');
      }
      try { sessionStorage.setItem('insightboard-api-token', portableData.token); } catch {}
      setAccount(portableData.user);
      setAuthToken(portableData.token);
      setMessage(`Signed in with Google (${portableData.user.email}). Cross-platform session active.`);
    } catch (err) {
      setMessage(err?.message || 'Google Sign-In failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  useEffect(() => {
    function handleOAuthMessage(event) {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token && event.data?.user) {
        try { sessionStorage.setItem('insightboard-api-token', event.data.token); } catch {}
        setAccount(event.data.user);
        setAuthToken(event.data.token);
        setMessage(`Signed in with Google (${event.data.user.email}).`);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setMessage(event.data.error || 'Google OAuth error.');
      }
    }
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  useEffect(()=>{
    let alive=true;
    fetch('/api/health').then(async response=>{
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Database not ready');
      return data;
    }).then(data=>{if(alive && !firebaseUser)setBackendStatus(data.database?'Backend and database connected':'Firebase Auth & Portable Cloud Store ready');})
      .catch(()=>{if(alive && !firebaseUser)setBackendStatus('Firebase Auth ready · Backend offline');});
    return ()=>{alive=false;};
  },[firebaseUser]);


  useEffect(()=>{
    let alive=true;
    if(firebaseUser)return ()=>{alive=false;};
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
  },[authToken,fetchReports,firebaseUser]);

  function generateLocalDemoSummary() {
    const localSummary = buildLocalDemoSummary(analytics, summaryLanguage);
    setSummary(localSummary);
    setSummarySource('local');
    setMessage('Generated structured rule-based insight summary.');
  }

  async function generateSummary() {
    setBusy(true);setMessage('');setSummary('');setSummarySource('');
    try {
      const response=await fetch('/api/ai/summary',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({snapshot:analytics,language:summaryLanguage})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Executive summary request failed.');
      const generated=typeof result.summary==='string'?result.summary.trim():'';
      if(!generated)throw new Error('No summary returned.');
      setSummary(generated);
      setSummarySource(result.provider==='gemini-cloud'?'gemini':'local');
      setMessage('Executive summary generated for active dataset.');
    } catch {
      const localSummary = buildLocalDemoSummary(analytics, summaryLanguage);
      setSummary(localSummary);
      setSummarySource('local');
      setMessage('Executive summary generated.');
    } finally {setBusy(false);}
  }

  async function saveSnapshot() {
    if(!firebaseUser && !authToken){setMessage('Sign in with Google or create an account below before saving reports.');return;}
    const cleanTitle = (String(analytics?.datasetName||'InsightBoard report').slice(0,90)+' · '+new Date().toLocaleString()).slice(0,140) || 'InsightBoard Report';
    const cleanDatasetName = String(analytics?.datasetName||'Current dataset').trim().slice(0,140) || 'Current dataset';
    const cleanRecordCount = Math.max(0, Math.min(10000000, Math.trunc(Number(analytics?.recordCount)||0)));
    const cleanSummary = String(summary||'').slice(0,8000);

    setReportSaveBusy(true);setMessage('');
    try {
      if (firebaseUser?.uid) {
        await ensureFirebaseUserProfile(firebaseUser);
        const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const reportPath = `reports/${reportId}`;
        try {
          await setDoc(doc(firestoreDb, 'reports', reportId), {
            ownerId: firebaseUser.uid,
            title: cleanTitle,
            datasetName: cleanDatasetName,
            recordCount: cleanRecordCount,
            summary: cleanSummary,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setMessage(copy.saved + ' (Synced to Firebase Firestore)');
          return;
        } catch (firestoreErr) {
          handleFirestoreError(firestoreErr, OperationType.CREATE, reportPath);
        }
      }

      const entry={
        title:cleanTitle,
        datasetName:cleanDatasetName,
        recordCount:cleanRecordCount,
        filters:analytics?.filters||{},
        snapshot:analytics||{},
        summary:cleanSummary
      };
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
    if(!firebaseUser && !authToken)return;
    try {
      if (firebaseUser?.uid) {
        const reportPath = `reports/${id}`;
        try {
          await deleteDoc(doc(firestoreDb, 'reports', id));
          setMessage('Saved report deleted from Firebase Firestore.');
          return;
        } catch (firestoreErr) {
          handleFirestoreError(firestoreErr, OperationType.DELETE, reportPath);
        }
      }
      const response=await fetch('/api/reports/'+encodeURIComponent(id),{method:'DELETE',headers:{Authorization:`Bearer ${authToken}`}});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Could not delete the report.');
      await fetchReports(authToken);setMessage('Saved report deleted from your account.');
    } catch(error) {setMessage(error?.message||'Could not delete the report.');}
  }

  async function clearHistory() {
    if((!firebaseUser && !authToken)||!history.length)return;
    if(!window.confirm('Delete all saved reports from this account? This cannot be undone.'))return;
    try {
      if (firebaseUser?.uid) {
        for (const item of history) {
          const reportPath = `reports/${item.id}`;
          try {
            await deleteDoc(doc(firestoreDb, 'reports', item.id));
          } catch (firestoreErr) {
            handleFirestoreError(firestoreErr, OperationType.DELETE, reportPath);
          }
        }
        setMessage(copy.cleared);
        return;
      }
      const response=await fetch('/api/reports',{method:'DELETE',headers:{Authorization:`Bearer ${authToken}`}});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Could not clear report history.');
      setHistory([]);setMessage(copy.cleared);
    } catch(error) {setMessage(error?.message||'Could not clear report history.');}
  }

  const [studioTab, setStudioTab] = useState('python_search');
  function exportSnapshot(item){downloadText(JSON.stringify(item.snapshot,null,2),'insightboard-snapshot.json');}

  return <section className="v2-workspace" aria-labelledby="v2-title">
    <div className="v2-heading">
      <div><div className="v2-eyebrow"><Sparkles size={15}/> INSIGHTBOARD VDB · VERSION 2.1.0</div><h2 id="v2-title">{copy.title}</h2><p>{copy.subtitle}</p></div>
      <label className="v2-language"><span>UI</span><select value={uiLanguage} onChange={event=>setUiLanguage(event.target.value)} aria-label="Workspace language"><option value="en">English</option><option value="hi">हिन्दी</option><option value="te">తెలుగు</option></select></label>
    </div>

    <div className="workspace-tabs-bar" style={{marginBottom: 18}} role="tablist" aria-label="Studio sub-modules">
      <div className="workspace-tabs-group">
        <button type="button" className={`workspace-tab-btn ${studioTab==='python_search'?'active':''}`} onClick={()=>setStudioTab('python_search')}>
          <Sparkles size={14}/> <span>Search Grounding &amp; Python Engine</span>
        </button>
        <button type="button" className={`workspace-tab-btn ${studioTab==='voice_live'?'active':''}`} onClick={()=>setStudioTab('voice_live')}>
          <Database size={14}/> <span>Live Voice &amp; Audio Transcription</span>
        </button>
        <button type="button" className={`workspace-tab-btn ${studioTab==='summary_cloud'?'active':''}`} onClick={()=>setStudioTab('summary_cloud')}>
          <ShieldCheck size={14}/> <span>Executive Summary &amp; Cloud Sync</span>
        </button>
      </div>
      <div className="workspace-tabs-meta">
        <button type="button" className={`workspace-tab-btn secondary ${studioTab==='all'?'active':''}`} onClick={()=>setStudioTab(studioTab==='all'?'python_search':'all')}>
          <span>{studioTab==='all'?'Compact Studio View':'Show All Studio Panels'}</span>
        </button>
      </div>
    </div>

    {(studioTab==='python_search'||studioTab==='all')&&(
      <AIProviderHub rows={rows} fields={fields} datasetName={datasetName} analytics={analytics} />
    )}

    {(studioTab==='voice_live'||studioTab==='all')&&(
      <GnaniVoiceStudio rows={rows} fields={fields} datasetName={datasetName} analytics={analytics} onApplyTranscriptFilter={onApplyTranscriptFilter} />
    )}

    {(studioTab==='summary_cloud'||studioTab==='all')&&(<>
      <div className="v2-account-panel v2-account-hero">
        <div className="v2-account-intro">
          <div className="v2-account-mark"><Sparkles size={19}/></div>
          <div><span className="v2-overline">CLOUD WORKSPACE &amp; REPORT SYNC</span><h3>Turn data into direction.</h3><p>Explore any dataset, uncover statistical correlations and anomalies, and keep aggregate reports synced in Firebase Firestore. Sign in with Google from any domain or platform.</p>
            <div className="v2-hero-visual" aria-hidden="true"><div className="v2-hero-glow"></div><div className="v2-mini-chart"><span style={{'--bar-height':'28%','--bar-delay':'0ms'}}></span><span style={{'--bar-height':'55%','--bar-delay':'90ms'}}></span><span style={{'--bar-height':'39%','--bar-delay':'180ms'}}></span><span style={{'--bar-height':'78%','--bar-delay':'270ms'}}></span><span style={{'--bar-height':'92%','--bar-delay':'360ms'}}></span></div><div className="v2-visual-caption"><span>INSIGHTBOARD VDB ANALYTICS</span><strong>Find the signal.</strong><small>Explore · Optimize · Save</small></div></div>
          </div>
        </div>
        <div className="v2-account-content">
        <div className="v2-account-status"><span className={backendStatus.includes('connected')||backendStatus.includes('ready')||backendStatus.includes('online')?'v2-status-online':'v2-status-waiting'}></span><span>{backendStatus}</span></div>
        {account?<>
          <div className="v2-account-signed">
            <div><strong><Database size={15}/> {account.email}</strong><small>{firebaseUser?'Signed in via Google · Firestore real-time sync active':'Signed in · Report history belongs to this account'}</small></div>
            <div className="v2-button-row">
              {!firebaseUser && <button type="button" className="v2-button secondary" onClick={()=>void fetchReports(authToken)} disabled={reportsBusy}><RefreshCw size={14}/>{reportsBusy?'Refreshing…':'Refresh reports'}</button>}
              <button type="button" className="v2-text-button" onClick={() => void signOut()}><LogOut size={14}/>Sign out</button>
            </div>
          </div>
        </>:<>
          <p className="v2-muted">Sign in with Google or create an account to save aggregate reports across devices. Imported raw rows stay in your browser.</p>
          <div className="v2-button-row" style={{marginBottom: 12}}>
            <button type="button" className="v2-button secondary" onClick={() => void signInWithGoogle()} disabled={authBusy} style={{width:'100%',justifyContent:'center',fontWeight:700}}>
              <ShieldCheck size={15}/> Continue with Google
            </button>
          </div>
          <div className="v2-auth-tabs">
            <button type="button" className={authMode==='login'?'active':''} onClick={()=>setAuthMode('login')}><LogIn size={14}/> Sign in</button>
            <button type="button" className={authMode==='register'?'active':''} onClick={()=>setAuthMode('register')}><UserPlus size={14}/> Create account</button>
          </div>
          <form key={authMode} className="v2-auth-form" onSubmit={submitAuth}>
            <label className="v2-field"><span>Email</span><input type="email" autoComplete="email" maxLength={254} required value={email} onChange={event=>setEmail(event.target.value)} placeholder="manager@company.com"/></label>
            <label className="v2-field"><span>Password (10–128 characters)</span><input type="password" autoComplete={authMode==='register'?'new-password':'current-password'} minLength={10} maxLength={128} required value={password} onChange={event=>setPassword(event.target.value)} placeholder="At least 10 characters"/></label>
            <button className="v2-button primary" type="submit" disabled={authBusy}>{authBusy?<RefreshCw size={14} className="v2-spin"/>:authMode==='register'?<UserPlus size={14}/>:<LogIn size={14}/>} {authBusy?'Please wait…':authMode==='register'?'Create account':'Sign in'}</button>
          </form>
          <p className="v2-note">Portable authentication works across Render, Vercel, Windows Store PWA, and Android APK builds.</p>
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
          <div className="v2-card-title"><Sparkles size={18}/><h3>{copy.ai}</h3><span className="v2-ai-badge ready">SERVER INTELLIGENCE</span></div>
          <p className="v2-muted">Generate a plain-language executive summary and optimization brief for your active dataset in 9 languages.</p>
          <div className="v2-ai-mode-grid">
            <div className="v2-mode-card active"><span className="v2-mode-icon"><ShieldCheck size={18}/></span><span><strong>Automated Server Synthesis</strong><small>Instant multilingual executive brief</small></span></div>
            <div className="v2-mode-card"><span className="v2-mode-icon"><Database size={18}/></span><span><strong>Privacy-First Snapshot</strong><small>Only aggregate KPIs &amp; categories are analyzed</small></span></div>
          </div>
          <label className="v2-field"><span>{copy.language}</span><select value={summaryLanguage} onChange={event=>setSummaryLanguage(event.target.value)}>{LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
          <button className="v2-button primary v2-generate-button" onClick={()=>void generateSummary()} disabled={busy}>{busy?<RefreshCw size={15} className="v2-spin"/>:<Sparkles size={15}/>} {busy?'Analyzing your snapshot…':copy.summarize}</button>
          <button className="v2-button secondary v2-generate-button" onClick={generateLocalDemoSummary} disabled={busy}><Database size={15}/> Generate instant rule-based insight</button>
          {summary?<div className="v2-summary" aria-live="polite"><h4>InsightBoard VDB · {summarySource==='local'?'Structured Analytical Brief':'Executive Summary'}</h4><div style={{whiteSpace:'pre-wrap'}}>{summary}</div></div>:<p className="v2-note">{copy.none}</p>}
          <button className="v2-button secondary" onClick={()=>void saveSnapshot()} disabled={reportSaveBusy}>{reportSaveBusy?<RefreshCw size={15} className="v2-spin"/>:<Save size={15}/>} {reportSaveBusy?'Saving report…':copy.save}</button>
          {message&&<div className="v2-message" role="status"><span>{message}</span><button onClick={()=>setMessage('')} aria-label="Dismiss message">×</button></div>}
        </article>
      </div>
      <article className="v2-card v2-history">
        <div className="v2-card-title"><History size={18}/><h3>{copy.history}</h3><button className="v2-text-button" onClick={()=>void clearHistory()} disabled={(!firebaseUser&&!authToken)||!history.length||reportsBusy}><Trash2 size={14}/>{copy.clear}</button></div>
        <p className="v2-muted">{copy.historyNote}</p>

        {(firebaseUser||authToken)&&<div className="v2-report-list">
          {reportsBusy&&!history.length?<p className="v2-note">Loading saved reports…</p>:history.length?<div className="v2-reports">{history.map(item=><div className="v2-report-row" key={item.id}><div><strong>{item.title}</strong><small>{item.datasetName} · {Number(item.recordCount||0).toLocaleString()} records · {new Date(item.createdAt).toLocaleString()}</small>{item.summary&&<p>{item.summary.slice(0,220)}{item.summary.length>220?'…':''}</p>}</div><div className="v2-report-actions"><button className="v2-delete" title="Download aggregate snapshot" aria-label="Download aggregate snapshot" onClick={()=>exportSnapshot(item)}><Save size={14}/></button><button className="v2-delete" title={copy.delete} aria-label={copy.delete} onClick={()=>void deleteSnapshot(item.id)}><Trash2 size={14}/></button></div></div>)}</div>:<p className="v2-note">{copy.noHistory}</p>}
        </div>}
      </article>
    </>)}
  </section>;
}
