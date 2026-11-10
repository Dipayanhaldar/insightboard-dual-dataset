import React, { useEffect, useMemo, useRef, useState } from 'react';
import hyderabadDataset from './hyderabad_metro_stations.json';
import shoppingMallDataset from './shopping_mall_sales.json';
import { createRoot } from 'react-dom/client';
import { Activity, BarChart3, Search, SlidersHorizontal, RotateCcw, Download, FileSpreadsheet, FileText, Upload, ChevronDown, Menu, X, Database, Sparkles, ArrowUpRight, Layers3, Globe2, Volume2, Moon, Sun, GitCompareArrows, Building2, BookOpen, Gauge, Radio } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import './dashboard-redesign.css';
import './styles.css';
import RetailCommandCenter from './v2/RetailCommandCenter.jsx';
import V2Workspace from './v2/V2Workspace.jsx';
import DatasetCompare from './v2/DatasetCompare.jsx';
import ReleaseCenter from './v2/ReleaseCenter.jsx';
import UsageQuotasPanel from './v2/UsageQuotasPanel.jsx';
import UniversalConnectorHub from './v2/UniversalConnectorHub.jsx';
import InsiPetBot from './v2/InsiPetBot.jsx';
import { playButtonClick, summonInsi } from './v2/uiSound.js';
import { insi } from './v2/insiController.js';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '3.0.0';
const COLORS = ['#2563eb','#0d9488','#d97706','#7c3aed','#e11d48','#0284c7','#65a30d','#ea580c'];
const nice = key => String(key).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const isLinkField = key => /(^|[_\s-])(url|link|href|hyperlink)([_\s-]|$)/i.test(String(key).trim());
const chartTick = value => { const text=String(value??''); return text.length>10?`${text.slice(0,9)}…`:text; };

function GitHubLogo({ size = 15 }) {
 return (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
   <path d="M12 0.297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385 0.6 0.113 0.82-0.258 0.82-0.577 0-0.285-0.01-1.04-0.015-2.04-3.338 0.724-4.042-1.61-4.042-1.61-0.546-1.385-1.335-1.755-1.335-1.755-1.087-0.744 0.084-0.729 0.084-0.729 1.205 0.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495 0.998 0.108-0.776 0.417-1.305 0.76-1.605-2.665-0.3-5.466-1.332-5.466-5.93 0-1.31 0.465-2.38 1.235-3.22-0.135-0.303-0.54-1.523 0.105-3.176 0 0 1.005-0.322 3.3 1.23 0.96-0.267 1.98-0.399 3-0.405 1.02 0.006 2.04 0.138 3 0.405 2.28-1.552 3.285-1.23 3.285-1.23 0.645 1.653 0.24 2.873 0.12 3.176 0.765 0.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92 0.42 0.36 0.81 1.096 0.81 2.22 0 1.606-0.015 2.896-0.015 3.286 0 0.315 0.21 0.69 0.825 0.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
 );
}

function sanitizeCellValue(val){
 if(typeof val!=='string')return val;
 const trimmed=val.trim();
 if(/^[=+\-@]/.test(trimmed)&&!/^-\d+(\.\d+)?$/.test(trimmed))return `'${trimmed}`;
 return val.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim,'').replace(/javascript:/gi,'');
}
function getRecords(data){ const rows=Array.isArray(data)?data:(Array.isArray(data?.records)?data.records:(Array.isArray(data?.data)?data.data:null)); if(!rows) throw new Error('JSON must be an array of objects, or an object containing a records or data array.'); if(!rows.length) throw new Error('The selected file contains no records.'); if(!rows.every(r=>r&&typeof r==='object'&&!Array.isArray(r))) throw new Error('Every array item must be an object/record.'); return rows.map((r,i)=>{const cleanObj={};for(const [k,v] of Object.entries(r)){if(k==='__proto__' || k==='constructor' || k==='prototype')continue;cleanObj[k]=sanitizeCellValue(v);}return {...cleanObj,_insightboard_id:cleanObj.id??cleanObj.record_id??i+1};}); }
function parseCSV(text){ const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean); if(lines.length<2)throw new Error('CSV must include a header and at least one data row.'); const parseLine=line=>{const out=[];let cur='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'&&quoted){cur+='"';i++;}else if(c==='"')quoted=!quoted;else if(c===','&&!quoted){out.push(cur);cur='';}else cur+=c;}out.push(cur);return out;}; const headers=parseLine(lines[0]).map(h=>h.trim()); return lines.slice(1).map(line=>Object.fromEntries(parseLine(line).map((v,i)=>[headers[i],sanitizeCellValue(v)]))); }
function downloadBlob(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
const csvCell=v=>{const s=String(sanitizeCellValue(v)??'');return '"'+s.replaceAll('"','""')+'"';};

function App(){
 const [rows,setRows]=useState(()=>getRecords(shoppingMallDataset));
 const [datasetName,setDatasetName]=useState('Shopping Mall & Retail Sales — Flagship Portfolio');
 const [preset,setPreset]=useState('mall');
 const [customDataset,setCustomDataset]=useState({rows:null,name:''});
 const [filters,setFilters]=useState({});
 const [search,setSearch]=useState('');
 const [page,setPage]=useState(1);
 const [pageSize,setPageSize]=useState(10);
 const [sort,setSort]=useState({key:'',dir:'asc'});
 const [sidebarOpen,setSidebarOpen]=useState(false);
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('insightboard-theme')==='dark'?'dark':'light';}catch{return 'light';}});
 const [activeTab,setActiveTab]=useState('overview');
 const [tableOpen,setTableOpen]=useState(false);
 const [bootSplash,setBootSplash]=useState(true);

 useEffect(()=>{
  const timer=setTimeout(()=>setBootSplash(false),1350);
  return ()=>clearTimeout(timer);
 },[]);

 const fields=useMemo(()=>{const keys=[];rows.forEach(r=>Object.keys(r).filter(k=>!k.startsWith('_insightboard_')&&!isLinkField(k)).forEach(k=>{if(!keys.includes(k))keys.push(k)}));return keys;},[rows]);
 const numericFields=useMemo(()=>fields.filter(k=>{const vals=rows.map(r=>r[k]).filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='');return vals.length>0&&vals.filter(v=>typeof v==='number'||(typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v)))).length/vals.length>=0.7;}),[fields,rows]);
 const categoricalFields=useMemo(()=>fields.filter(k=>!numericFields.includes(k)&&new Set(rows.map(r=>String(r[k]??'').trim()).filter(Boolean)).size>1),[fields,numericFields,rows]);
 const dateField=useMemo(()=>fields.find(k=>/date|published|added|month|year|time/i.test(k)),[fields]);
 const primaryCategory=useMemo(()=>categoricalFields.find(k=>/mall_zone|category|sector|line|topic|station|store_name|store|area|region|country|city|brand|type/i.test(k))||categoricalFields[0]||fields[0],[categoricalFields,fields]);
 const primaryMetric=useMemo(()=>numericFields.find(k=>/monthly_revenue|revenue|sales|amount|total|value|intensity|count|units|likelihood|relevance|price|platform|station/i.test(k))||numericFields[0],[numericFields]);
 const filterFields=useMemo(()=>categoricalFields.slice(0,8),[categoricalFields]);
 const options=useMemo(()=>Object.fromEntries(filterFields.map(k=>[k,[...new Set(rows.map(r=>String(r[k]??'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))])),[filterFields,rows]);
 const filtered=useMemo(()=>rows.filter(r=>{const pass=filterFields.every(k=>!filters[k]||String(r[k]??'')===filters[k]);const q=search.trim().toLowerCase();return pass&&(!q||fields.some(k=>String(r[k]??'').toLowerCase().includes(q)));}),[rows,filterFields,filters,search,fields]);
 const avg=(key,list=filtered)=>list.length?list.reduce((s,r)=>s+(Number(r[key])||0),0)/list.length:0;
 const numericStats=useMemo(()=>numericFields.slice(0,4).map(k=>({key:k,avg:avg(k),sum:filtered.reduce((s,r)=>s+(Number(r[k])||0),0)})),[numericFields,filtered]);
 const chartGroups=useMemo(()=>{const key=primaryCategory; if(!key)return [];const m=new Map();filtered.forEach(r=>{const n=String(r[key]??'Unknown');const val=primaryMetric?(Number(r[primaryMetric])||0):1;const cur=m.get(n)||{name:n,total:0,count:0};cur.total+=val;cur.count++;m.set(n,cur);});return [...m.values()].map(x=>({name:x.name,value:primaryMetric?Number((x.total/x.count).toFixed(2)):x.count,count:x.count,total:x.total})).sort((a,b)=>b.value-a.value).slice(0,10);},[filtered,primaryCategory,primaryMetric]);
 const dateGroups=useMemo(()=>{if(!dateField)return [];const m=new Map();filtered.forEach(r=>{let value=String(r[dateField]??'').trim();if(!value)return;let key=value.length>=7&&/^\d{4}[-/]/.test(value)?value.slice(0,7):value.slice(0,4);if(!key)key=value;const cur=m.get(key)||{name:key,total:0,count:0};cur.total+=primaryMetric?(Number(r[primaryMetric])||0):1;cur.count++;m.set(key,cur);});return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12).map(([name,v])=>({name,value:primaryMetric?Number((v.total/v.count).toFixed(2)):v.count}));},[filtered,dateField,primaryMetric]);
 const sorted=useMemo(()=>[...filtered].sort((a,b)=>{const k=sort.key||fields[0];const av=a[k]??'',bv=b[k]??'';const an=Number(av),bn=Number(bv);const cmp=av!==''&&bv!==''&&Number.isFinite(an)&&Number.isFinite(bn)?an-bn:String(av).localeCompare(String(bv),undefined,{numeric:true});return sort.dir==='asc'?cmp:-cmp;}),[filtered,sort,fields]);
 const pageCount=Math.max(1,Math.ceil(sorted.length/pageSize));
 const pageRows=sorted.slice((page-1)*pageSize,page*pageSize);

 function reset(){playButtonClick();setFilters({});setSearch('');setPage(1);setNotice('Filters and search reset.');insi.smile();}
 function setDataset(data,name,presetName='custom'){
  const clean=getRecords(data);
  setRows(clean);
  setDatasetName(name);
  setPreset(presetName);
  if(presetName==='custom'){
   setCustomDataset({rows:clean,name});
  }else{
   try{localStorage.setItem('insightboard-preset',presetName);}catch{}
  }
  setFilters({});setSearch('');setPage(1);setSort({key:'',dir:'asc'});
  setNotice(`Loaded ${clean.length.toLocaleString()} records from "${name}". All KPIs, filters, charts, and tables now reflect this dataset.`);
  if(presetName==='custom'){
   insi.magicImport();
  }else{
   insi.viewCharts();
  }
 }
 const logoTitle=preset==='mall'?'Shopping Mall & Retail Portfolio':preset==='metro'?'Hyderabad Metro Rail':`Imported Data · ${datasetName}`;
 const [audioStatus,setAudioStatus]=useState('');
 const [showAudioFallback,setShowAudioFallback]=useState(false);
 const audioRef=useRef(null);

 async function playMetroAnnouncement(){
  if(audioRef.current){audioRef.current.pause();audioRef.current.currentTime=0;}
  const audio=new Audio('/assets/hyderabad-metro-announcement.mp3');
  audio.loop=false;
  audioRef.current=audio;
  audio.onended=()=>setAudioStatus('Announcement finished.');
  audio.onerror=()=>{setShowAudioFallback(true);setAudioStatus('Announcement could not load. Check the Metro audio asset.');};
  setAudioStatus('Starting announcement…');
  insi.audioSync();
  try{
   await audio.play();
   setShowAudioFallback(false);
   setAudioStatus('Announcement is playing.');
  }catch(err){
   setShowAudioFallback(true);
   setAudioStatus('Your browser blocked automatic sound. Use Play announcement to start it.');
   console.info('Metro autoplay did not start:',err);
  }
 }

 useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('insightboard-theme',theme);}catch{}},[theme]);

 async function switchPreset(value){
  playButtonClick();
  setBusy(true);
  try{
   if(value==='mall'){
    if(audioRef.current){audioRef.current.pause();setAudioStatus('');}
    setDataset(shoppingMallDataset,'Shopping Mall & Retail Sales — Flagship Portfolio','mall');
   }else if(value==='metro'){
    void playMetroAnnouncement();
    setDataset(hyderabadDataset,'Hyderabad Metro station reference','metro');
   }else if(value==='custom'&&customDataset.rows){
    if(audioRef.current){audioRef.current.pause();setAudioStatus('');}
    setDataset(customDataset.rows,customDataset.name||'Imported Dataset','custom');
   }
  }catch(err){
   setNotice(`Could not load preset: ${err.message}. Your current dataset has been kept.`);
   insi.react('error');
  }finally{
   setBusy(false);
  }
 }

 async function importFile(e){const file=e.target.files?.[0];if(!file)return;playButtonClick();if(audioRef.current){audioRef.current.pause();setAudioStatus('');}insi.magicImport();try{const raw=file.name.toLowerCase().endsWith('.csv')?parseCSV(await file.text()):JSON.parse(await file.text());setDataset(raw,file.name,'custom');}catch(err){setNotice(`Import failed: ${err.message}`);insi.react('error');}e.target.value='';}
 function exportCSV(){playButtonClick();const cols=fields;const text=[cols.map(csvCell).join(','),...filtered.map(r=>cols.map(k=>csvCell(r[k])).join(','))].join('\r\n');downloadBlob(new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8;'}),'insightboard-vdb-filtered-data.csv');setNotice(`Exported ${filtered.length} filtered records to CSV.`);insi.react('export');}
 function exportExcel(){playButtonClick();const clean=filtered.map(r=>Object.fromEntries(fields.map(k=>[nice(k),r[k]===undefined||r[k]===null?'':typeof r[k]==='object'?JSON.stringify(r[k]):r[k]])));const ws=XLSX.utils.json_to_sheet(clean);ws['!cols']=fields.map(k=>({wch:Math.min(32,Math.max(12,nice(k).length+3))}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Filtered Data');const meta=XLSX.utils.aoa_to_sheet([['InsightBoard VDB (Visual Dashboard) Export'],['Version',`v${APP_VERSION}`],['Dataset',datasetName],['Records',filtered.length],['Generated',new Date().toLocaleString()],['Note','Contains the currently filtered records.']]);XLSX.utils.book_append_sheet(wb,meta,'Report Info');XLSX.writeFile(wb,'insightboard-vdb-filtered-data.xlsx');setNotice(`Exported ${filtered.length} filtered records to Excel.`);insi.react('export');}
 async function exportPDF(){playButtonClick();try{setBusy(true);insi.react('export');if(activeTab!=='overview'&&activeTab!=='all'){setActiveTab('overview');}setNotice('Preparing report and rendering the six visible charts…');await document.fonts?.ready;await new Promise(resolve=>setTimeout(resolve,700));const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const width=doc.internal.pageSize.getWidth();doc.setFontSize(18);doc.setTextColor(25,48,74);doc.text(`InsightBoard VDB v${APP_VERSION} — Visual Data Report`,14,14);try{const logoPath=preset==='metro'?'/assets/hyderabad-metro-logo.webp':null;if(logoPath){const response=await fetch(logoPath);if(response.ok){const blob=await response.blob();const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});doc.addImage(dataUrl,'WEBP',width-39,6,24,15);}}}catch(e){console.warn('Preset logo could not be embedded in PDF',e);}doc.setFontSize(9);doc.setTextColor(80,95,115);doc.text(`Dataset: ${datasetName} | Records: ${filtered.length} | Generated: ${new Date().toLocaleString()}`,14,21);doc.text(`Active filters: ${Object.entries(filters).filter(([,v])=>v).map(([k,v])=>`${nice(k)}=${v}`).join(' · ')||'None'}${search.trim()?` | Search: ${search.trim()}`:''}`,14,27,{maxWidth:width-28});const cards=[...document.querySelectorAll('.charts-grid .chart-card')];if(cards.length){let count=0;for(const card of cards){if(count%2===0){if(count>0)doc.addPage();doc.setFontSize(10);doc.setTextColor(25,48,74);doc.text(`Dashboard charts (${count+1}–${Math.min(count+2,cards.length)} of ${cards.length})`,14,35);}const canvas=await html2canvas(card,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false,allowTaint:false,windowWidth:Math.max(card.scrollWidth,card.clientWidth),windowHeight:Math.max(card.scrollHeight,card.clientHeight)});const img=canvas.toDataURL('image/png');const margin=14,gap=6,cardW=(width-margin*2-gap)/2,cardH=78,x=margin+(count%2)*(cardW+gap),y=40;doc.addImage(img,'PNG',x,y,cardW,cardH,undefined,'FAST');count++;}if(cards.length!==6){setNotice(`Note: the current view rendered ${cards.length} chart panels. The PDF will include all panels currently shown.`);}}else{doc.setFontSize(11);doc.text('No charts are currently visible. Clear filters or import records to generate charts.',14,42);}doc.addPage();doc.setFontSize(16);doc.setTextColor(25,48,74);doc.text('Filtered Data Table',14,15);doc.setFontSize(9);doc.text(`Showing ${filtered.length} records; PDF table includes up to 1,000 rows and first 12 fields. Use Excel export for the complete filtered dataset.`,14,21);autoTable(doc,{startY:26,head:[fields.slice(0,12).map(nice)],body:filtered.slice(0,1000).map(r=>fields.slice(0,12).map(k=>typeof r[k]==='object'?JSON.stringify(r[k]):String(r[k]??''))),styles:{fontSize:6,cellPadding:1.5,overflow:'linebreak'},headStyles:{fillColor:[37,99,235]},margin:{left:10,right:10}});doc.save('insightboard-vdb-visual-report.pdf');setNotice(`PDF exported with ${cards.length} chart panels and up to ${Math.min(filtered.length,1000)} data rows.`);insi.celebrate();}catch(err){console.error(err);setNotice(`PDF export failed: ${err.message}. Please retry or use Excel export.`);insi.react('error');}finally{setBusy(false);}}

 const v2Analytics=useMemo(()=>({
  datasetName:String(datasetName||'Current dataset').slice(0,120),
  recordCount:filtered.length,
  sourceRecordCount:rows.length,
  filters:Object.fromEntries(Object.entries(filters).filter(([,value])=>Boolean(value)).map(([key,value])=>[nice(key).slice(0,80),String(value).slice(0,100)])),
  fields:fields.slice(0,30).map(key=>nice(key).slice(0,80)),
  numericMetrics:numericStats.slice(0,8).map(item=>({field:nice(item.key).slice(0,80),average:Number(item.avg.toFixed(3)),sum:Number(item.sum.toFixed(3))})),
  topCategories:chartGroups.slice(0,8).map(item=>({category:String(item.name).slice(0,80),average:Number(item.value),count:Number(item.count),total:Number(item.total)})),
  timeTrend:dateGroups.slice(-12).map(item=>({period:String(item.name).slice(0,40),value:Number(item.value)})),
  completeness:fields.slice(0,12).map(key=>({field:nice(key).slice(0,80),filledPercent:filtered.length?Math.round(filtered.filter(row=>row[key]!==null&&row[key]!==undefined&&String(row[key]).trim()!=='').length/filtered.length*100):0}))
 }),[datasetName,filtered,rows.length,filters,fields,numericStats,chartGroups,dateGroups]);

 function handleSwitchTab(tabId){
  playButtonClick();
  setActiveTab(tabId);
  setSidebarOpen(false);
  if(tabId==='overview'){
   insi.viewCharts();
  }else if(tabId==='connector'){
   insi.magicImport();
  }else if(tabId==='studio'){
   insi.heavyAi();
  }else if(tabId==='quotas'){
   insi.observe();
  }
 }

 const chartProps={margin:{top:8,right:12,left:0,bottom:4}};
 return <div className={`app-shell theme-${theme}`}>
  <InsiPetBot datasetName={datasetName} recordCount={filtered.length} emptyDashboard={filtered.length===0} />
  {bootSplash&&(
   <div className="poweron-splash" onClick={()=>setBootSplash(false)} role="status" aria-label="InsightBoard VDB Power-On Intro">
    <div className="poweron-card">
     <div className="poweron-brand-mark"><BarChart3 size={28}/></div>
     <div className="poweron-made-in-india">
      <span className="tricolor-bar" aria-hidden="true"/>
      <span>MADE IN INDIA</span>
      <span className="tricolor-bar" aria-hidden="true"/>
     </div>
     <h2 className="poweron-title">InsightBoard VDB</h2>
     <p className="poweron-tagline">Dashboard that works for you</p>
    </div>
   </div>
  )}
  <aside className={`sidebar ${sidebarOpen?'open':'closed'}`}>
   <div className="brand">
    <div className="brand-icon"><BarChart3 size={24}/></div>
    <div><strong>InsightBoard VDB</strong><span>Dashboard that works for you</span></div>
    <button className="icon-btn mobile-only" onClick={()=>setSidebarOpen(false)} aria-label="Close menu"><X/></button>
   </div>
   <div className="side-label">WORKSPACE MODULES</div>
   <button type="button" className={`nav-item ${activeTab==='overview'?'active':''}`} onClick={()=>handleSwitchTab('overview','Overview & 6 Charts')}><Activity size={18}/> Overview &amp; 6 Charts</button>
   <button type="button" className={`nav-item ${activeTab==='connector'?'active':''}`} onClick={()=>handleSwitchTab('connector','Universal Connector & Hey INSI')}><Radio size={18}/> Connector &amp; Hey INSI</button>
   <button type="button" className={`nav-item ${activeTab==='intelligence'?'active':''}`} onClick={()=>handleSwitchTab('intelligence','Decision & Stats Hub')}><Building2 size={18}/> {preset==='mall'?'Mall & Sales Suite':'Decision & Stats Hub'}</button>
   <button type="button" className={`nav-item ${activeTab==='studio'?'active':''}`} onClick={()=>handleSwitchTab('studio','AI, Gnani Voice & Sign In')}><Sparkles size={18}/> AI, Gnani Voice &amp; Sign In</button>
   <button type="button" className={`nav-item ${activeTab==='compare'?'active':''}`} onClick={()=>handleSwitchTab('compare','Compare Datasets')}><GitCompareArrows size={18}/> Compare Datasets</button>
   <button type="button" className={`nav-item ${activeTab==='quotas'?'active':''}`} onClick={()=>handleSwitchTab('quotas','Usage & Quotas')}><Gauge size={18}/> Usage &amp; Quotas</button>
   <div className="side-label filter-heading"><span>DYNAMIC FILTERS</span><SlidersHorizontal size={15}/></div>
   <div className="filter-list">{filterFields.map(key=><label className="filter-control" key={key}><span>{nice(key)}</span><div className="select-wrap"><select value={filters[key]||''} onChange={e=>{playButtonClick();setFilters(p=>({...p,[key]:e.target.value}));setPage(1)}}><option value="">All {nice(key).toLowerCase()}</option>{(options[key]||[]).map(v=><option key={v} value={v}>{v}</option>)}</select><ChevronDown size={14}/></div></label>)}</div>
   <button className="reset-btn" onClick={reset}><RotateCcw size={15}/> Reset filters</button>
   <div className="sidebar-bottom">
    <div className="data-status"><span className="status-dot"/><div><b>Dataset active</b><small>{rows.length.toLocaleString()} records loaded</small></div></div>
    <small className="version">INSIGHTBOARD VDB · v{APP_VERSION}</small>
   </div>
  </aside>
  {sidebarOpen&&<div className="scrim" onClick={()=>setSidebarOpen(false)}/>}
  <main className="main-area">
   <header className="topbar">
    <button className="icon-btn" onClick={()=>setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar"><Menu/></button>
    <div className="top-search"><Search size={18}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder={`Search ${fields.slice(0,3).map(nice).join(', ')||'records'}…`}/><kbd>⌕</kbd></div>
    <div className="top-actions">
     <button type="button" className="btn btn-light theme-toggle" onClick={()=>{playButtonClick();setTheme(theme==='light'?'dark':'light')}} aria-label={`Switch to ${theme==='light'?'dark':'light'} mode`} title={`Switch to ${theme==='light'?'dark':'light'} mode`}>
      {theme==='light'?<Moon size={16}/>:<Sun size={16}/>}<span>{theme==='light'?'Dark':'Light'}</span>
     </button>
     <label className="dataset-switch" title="Choose active dataset or preset">
      <span>Dataset</span>
      <select value={preset} onChange={e=>switchPreset(e.target.value)} disabled={busy}>
       <option value="mall">Shopping Mall &amp; Retail Sales</option>
       <option value="metro">Hyderabad Metro Rail</option>
       {(preset==='custom'||Boolean(customDataset.rows))&&<option value="custom">Imported Data{customDataset.name?` (${customDataset.name})`:''}</option>}
      </select>
     </label>
     <label className="btn btn-light upload-btn"><Upload size={16}/> <span>Import JSON / CSV</span><input type="file" accept=".json,.csv,application/json,text/csv" onChange={importFile} /></label>
     <button className="btn btn-light excel-btn" onClick={exportExcel}><FileSpreadsheet size={16}/><span>Excel</span></button>
     <button className="btn btn-primary" onClick={exportCSV}><Download size={16}/><span>CSV</span></button>
     <button className="btn btn-light pdf-btn" onClick={exportPDF} disabled={busy}><FileText size={16}/><span>{busy?'Preparing…':'PDF + 6 Charts'}</span></button>
     <a
      className="btn btn-light github-repo-btn"
      href="https://github.com/Dipayanhaldar/insightboard-dual-dataset"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open GitHub Repository"
      title="Open GitHub Repository"
     >
      <GitHubLogo size={15}/><span>GitHub Repo</span>
     </a>
    </div>
   </header>
   <div className="content">
    <div className="page-intro">
     <div>
      <div className="made-in-india-pill">
       <span className="india-dot" aria-hidden="true"/>
       <strong>Made in India</strong>
       <span className="pill-divider">·</span>
       <span>Dashboard that works for you</span>
      </div>
      <h1>InsightBoard VDB</h1>
      <p>{preset==='mall'
       ?'Visual intelligence for Shopping Mall & Retail Sales. Explore KPIs, What-If simulations, AI insights, and instant reports.'
       :preset==='metro'
       ?'Transit and station analytics for Hyderabad Metro Rail with interactive filters, KPIs, and multi-format export.'
       :`Data-driven workspace for "${datasetName}" (${fields.length} detected fields). All charts, KPIs, and stats adapt to your uploaded file.`}</p>
      <div className="dataset-line"><Database size={14}/><span>{datasetName}</span><span className="dot-sep">·</span><span>{filtered.length.toLocaleString()} matching records</span></div>
     </div>
     <div className="dataset-brand">
      {preset==='metro'?<img src="/assets/hyderabad-metro-logo.webp" alt="Hyderabad Metro logo"/>:<div className="dataset-logo custom-logo"><Building2 size={22}/></div>}
      <div>
       <strong>{logoTitle}</strong>
       <small>{preset==='mall'?'16 Anchor & Specialty Tenants · 6 Zones':preset==='metro'?'Station reference dataset (isolated preset)':`${rows.length.toLocaleString()} uploaded rows · ${fields.length} columns`}</small>
       {preset==='metro'&&<>{audioStatus&&<small role="status">{audioStatus}</small>}{showAudioFallback&&<button type="button" className="btn btn-light" style={{marginTop:8,padding:'6px 10px',fontSize:12}} onClick={()=>void playMetroAnnouncement()}><Volume2 size={14}/> Play Metro announcement</button>}</>}
      </div>
     </div>
     <div className="intro-chip"><span className="live-dot"/> Live BI · v{APP_VERSION} <ArrowUpRight size={16}/></div>
    </div>
    {busy&&<div className="notice" role="status">Loading selected dataset…</div>}
    {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss message"><X size={14}/></button></div>}
    <section className="kpi-grid">
     <Kpi icon={<Database/>} label="Matching records" value={filtered.length.toLocaleString()} sub={`of ${rows.length.toLocaleString()} total rows`} color="blue"/>
     <Kpi icon={<Layers3/>} label="Fields detected" value={fields.length} sub="schema columns active" color="teal"/>
     <Kpi icon={<Globe2/>} label={primaryCategory?nice(primaryCategory):'Categories'} value={primaryCategory?new Set(filtered.map(r=>String(r[primaryCategory]??'')).filter(Boolean)).size:'—'} sub={primaryCategory?'distinct segments':'no categorical field detected'} color="purple"/>
     <Kpi icon={<Activity/>} label={primaryMetric?`Avg. ${nice(primaryMetric)}`:'Numeric fields'} value={primaryMetric?Number(avg(primaryMetric)).toLocaleString(undefined,{maximumFractionDigits:2}):numericFields.length} sub={primaryMetric?`Sum: ${filtered.reduce((s,r)=>s+(Number(r[primaryMetric])||0),0).toLocaleString(undefined,{maximumFractionDigits:2})}`:'no numeric metric detected'} color="orange"/>
    </section>

    <nav className="workspace-tabs-bar" aria-label="Workspace module tabs">
     <div className="workspace-tabs-group">
      <button type="button" className={`workspace-tab-btn ${activeTab==='overview'?'active':''}`} onClick={()=>handleSwitchTab('overview','Overview & 6 Charts')}>
       <BarChart3 size={15}/> <span>Overview &amp; 6 Charts</span>
      </button>
      <button type="button" className={`workspace-tab-btn ${activeTab==='connector'?'active':''}`} onClick={()=>handleSwitchTab('connector','Universal Connector & Hey INSI')} data-testid="tab-universal-connector">
       <Radio size={15}/> <span>Universal Connector &amp; Hey INSI</span>
      </button>
      <button type="button" className={`workspace-tab-btn ${activeTab==='intelligence'?'active':''}`} onClick={()=>handleSwitchTab('intelligence','Decision & Statistical Hub')}>
       <Building2 size={15}/> <span>{preset==='mall'?'Mall & Sales Command Hub':'Decision & Statistical Hub'}</span>
      </button>
      <button type="button" className={`workspace-tab-btn ${activeTab==='studio'?'active':''}`} onClick={()=>handleSwitchTab('studio','AI, Gnani Voice & Sign In')}>
       <Sparkles size={15}/> <span>AI, Gnani Voice &amp; Sign In</span>
      </button>
      <button type="button" className={`workspace-tab-btn ${activeTab==='compare'?'active':''}`} onClick={()=>handleSwitchTab('compare','Compare Datasets')}>
       <GitCompareArrows size={15}/> <span>Compare Datasets</span>
      </button>
      <button type="button" className={`workspace-tab-btn ${activeTab==='quotas'?'active':''}`} onClick={()=>handleSwitchTab('quotas','Usage & Quotas')}>
       <Gauge size={15}/> <span>Usage &amp; Quotas</span>
      </button>
     </div>
     <div className="workspace-tabs-meta">
      <button type="button" className={`workspace-tab-btn secondary ${activeTab==='all'?'active':''}`} onClick={()=>handleSwitchTab(activeTab==='all'?'overview':'all')}>
       <Layers3 size={14}/> <span>{activeTab==='all'?'Compact Tab View':'Expand All Modules'}</span>
      </button>
     </div>
    </nav>

    {(activeTab==='connector'||activeTab==='all')&&(
     <UniversalConnectorHub
      rows={rows}
      fields={fields}
      datasetName={datasetName}
      preset={preset}
      onLoadDataset={setDataset}
      onSwitchPreset={switchPreset}
      onParseCsv={parseCSV}
     />
    )}

    {(activeTab==='quotas'||activeTab==='all')&&(
     <UsageQuotasPanel />
    )}

    {(activeTab==='intelligence'||activeTab==='all')&&(
     <RetailCommandCenter rows={filtered} fields={fields} datasetName={datasetName} preset={preset} />
    )}

    {(activeTab==='compare'||activeTab==='all')&&(
     <DatasetCompare rows={rows} datasetName={datasetName} />
    )}

    {(activeTab==='studio'||activeTab==='all')&&(
     <V2Workspace
      analytics={v2Analytics}
      rows={rows}
      fields={fields}
      numericFields={numericFields}
      datasetName={datasetName}
      sourceIsUploaded={preset==='custom'}
     />
    )}

    {(activeTab==='overview'||activeTab==='all')&&(<>
     <div className="section-heading"><div><h2>Interactive Data Visualizations</h2><p>Six schema-aware charts synchronized with your active dataset and filters.</p></div><div style={{display:'flex',alignItems:'center',gap:8}}><button type="button" className="btn btn-light compact" onClick={()=>{playButtonClick();setTableOpen(v=>!v)}}><Database size={14}/><span>{tableOpen?'Hide Data Table':`Open Data Table (${filtered.length.toLocaleString()} rows)`}</span></button><span className="result-pill">{filtered.length.toLocaleString()} results</span></div></div>
     {filtered.length===0?<div className="empty-state"><Search size={28}/><h3>No matching records</h3><p>Try another search or reset filters.</p><button className="btn btn-primary" onClick={reset}>Reset filters</button></div>:<section className="charts-grid">
      <ChartCard title={primaryMetric?`${nice(primaryMetric)} by ${nice(primaryCategory||'record')}`:`Records by ${nice(primaryCategory||'record')}`} subtitle={primaryMetric?'Average value per category':'Record count per category'}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartGroups} {...chartProps}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:10,fill:'#64748b'}} tickFormatter={chartTick} interval={0} angle={-24} textAnchor="end" height={60}/><YAxis tick={{fontSize:11,fill:'#64748b'}}/><Tooltip/><Bar dataKey="value" name={primaryMetric?nice(primaryMetric):'Records'} fill="#2563eb" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title={dateField?`${nice(primaryMetric||'Records')} over ${nice(dateField)}`:'Category distribution'} subtitle={dateField?'Trend across detected time period':'Share of records by category'}><ResponsiveContainer width="100%" height="100%">{dateGroups.length>1?<LineChart data={dateGroups} {...chartProps}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:10,fill:'#64748b'}} tickFormatter={chartTick} interval="preserveStartEnd" minTickGap={14}/><YAxis tick={{fontSize:11,fill:'#64748b'}}/><Tooltip/><Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={3} dot={{r:3}}/></LineChart>:<PieChart><Pie data={chartGroups.slice(0,8)} dataKey="count" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={3}>{chartGroups.slice(0,8).map((e,i)=><Cell key={e.name} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend verticalAlign="bottom" height={28} wrapperStyle={{fontSize:10,color:'#64748b'}}/></PieChart>}</ResponsiveContainer></ChartCard>
      <ChartCard title="Top categories" subtitle="Record count by category"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartGroups} layout="vertical" margin={{top:5,right:12,left:12,bottom:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/><XAxis type="number" tick={{fontSize:10,fill:'#64748b'}}/><YAxis type="category" dataKey="name" width={92} tick={{fontSize:9,fill:'#64748b'}} tickFormatter={chartTick}/><Tooltip/><Bar dataKey="count" name="Records" fill="#7c3aed" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Numeric field summary" subtitle="Average value per numeric column"><ResponsiveContainer width="100%" height="100%"><BarChart data={numericStats.map(x=>({name:nice(x.key),value:Number(x.avg.toFixed(2))}))} {...chartProps}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:10,fill:'#64748b'}} tickFormatter={chartTick} interval={0} angle={-22} textAnchor="end" height={60}/><YAxis tick={{fontSize:11,fill:'#64748b'}}/><Tooltip/><Bar dataKey="value" name="Average" fill="#d97706" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Numeric totals by category" subtitle="Total sum per category"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartGroups} {...chartProps}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:10,fill:'#64748b'}} tickFormatter={chartTick} interval={0} angle={-24} textAnchor="end" height={60}/><YAxis tick={{fontSize:11,fill:'#64748b'}}/><Tooltip/><Bar dataKey="total" name={primaryMetric?`Total ${nice(primaryMetric)}`:'Total records'} fill="#0d9488" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Record completeness" subtitle="Filled percentage per column"><ResponsiveContainer width="100%" height="100%"><BarChart data={fields.slice(0,8).map(k=>({name:nice(k),value:filtered.length?Math.round(filtered.filter(r=>r[k]!==null&&r[k]!==undefined&&String(r[k]).trim()!=='').length/filtered.length*100):0}))} layout="vertical" margin={{top:5,right:12,left:12,bottom:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/><XAxis type="number" domain={[0,100]} unit="%" tick={{fontSize:10,fill:'#64748b'}}/><YAxis type="category" dataKey="name" width={92} tick={{fontSize:9,fill:'#64748b'}} tickFormatter={chartTick}/><Tooltip formatter={v=>`${v}%`}/><Bar dataKey="value" name="Filled records" fill="#e11d48" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></ChartCard>
     </section>}

     <section className="table-panel">
      <div className="table-head"><div><h2>Dataset Records Explorer</h2><p>Sortable, filterable table generated from the active schema.</p></div><div className="table-tools"><button type="button" className="btn btn-light compact" onClick={()=>{playButtonClick();setTableOpen(v=>!v)}}>{tableOpen?'Collapse Table':`Expand Table (${filtered.length.toLocaleString()} rows)`}</button>{tableOpen&&<><span className="small-muted">Rows</span><select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></>}<button className="btn btn-light compact" onClick={exportExcel}><FileSpreadsheet size={15}/> Excel</button><button className="btn btn-light compact" onClick={exportCSV}><Download size={15}/> CSV</button></div></div>
      {(tableOpen||activeTab==='all')&&<>
       <div className="table-scroll"><table><thead><tr>{fields.slice(0,12).map(key=><th key={key}><button className="sort-btn" onClick={()=>{playButtonClick();setSort(p=>({key,dir:p.key===key&&p.dir==='asc'?'desc':'asc'}))}}>{nice(key)}{sort.key===key?(sort.dir==='asc'?' ↑':' ↓'):''}</button></th>)}</tr></thead><tbody>{pageRows.map((r,i)=><tr key={r._insightboard_id??i}>{fields.slice(0,12).map(key=><td key={key} className={key===fields[0]?'title-cell':''} title={String(r[key]??'')}>{r[key]===null||r[key]===undefined?'—':typeof r[key]==='object'?JSON.stringify(r[key]):String(r[key])}</td>)}</tr>)}</tbody></table></div>
       <div className="table-foot"><span>Showing {filtered.length?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,filtered.length)} of {filtered.length.toLocaleString()} records</span><div className="pagination"><button disabled={page<=1} onClick={()=>{playButtonClick();setPage(p=>p-1)}}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page>=pageCount} onClick={()=>{playButtonClick();setPage(p=>p+1)}}>Next</button></div></div>
      </>}
     </section>
    </>)}

    <footer className="app-footer">
     <div>
      <span>InsightBoard VDB · Made in India · Dashboard that works for you · {new Date().getFullYear()}</span>
      <small style={{display:'block',fontSize:'10px',opacity:0.78,marginTop:'2px',letterSpacing:'0.04em'}}>
       version v{APP_VERSION}
      </small>
     </div>
     <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
      <a
       className="btn btn-light compact github-repo-btn"
       href="https://github.com/Dipayanhaldar/insightboard-dual-dataset"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Open GitHub Repository"
      >
       <GitHubLogo size={14}/><span>GitHub Repo</span><ArrowUpRight size={13}/>
      </a>
      <a
       className="btn btn-light compact"
       href="https://app.notion.com/p/405a0f05cdd281a4a971fd32474e0fbd"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Open Project Dossier in Notion"
      >
       <BookOpen size={14}/><span>Project Dossier</span><ArrowUpRight size={13}/>
      </a>
      <a
       className="v2-project-link-secondary"
       href="https://github.com/Dipayanhaldar/insightboard-dual-dataset"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Source repository"
       title="Source repository"
       style={{width:34,height:34,display:'inline-flex',alignItems:'center',justifyContent:'center',borderRadius:8,border:'1px solid var(--line)',color:'var(--muted)',opacity:0.55,textDecoration:'none'}}
      >
       <ArrowUpRight size={14}/>
      </a>
      <ReleaseCenter />
     </div>
    </footer>
   </div>
  </main>
 </div>;
}
function Kpi({icon,label,value,sub,color}){return <div className="kpi-card"><div className={`kpi-icon ${color}`}>{icon}</div><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-sub">{sub}</div></div>}
function ChartCard({title,subtitle,children}){return <div className="chart-card"><div className="chart-card-head"><div><h3>{title}</h3><p>{subtitle}</p></div><button className="chart-menu" title="Chart visualization"><BarChart3 size={17}/></button></div><div className="chart-body">{children}</div></div>}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
