import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, FileUp, GitCompareArrows, Info, ShieldCheck, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './DatasetCompare.css';

const fieldsOf = rows => [...new Set(rows.slice(0, 50000).flatMap(row => Object.keys(row || {}).filter(key => !key.startsWith('_insightboard_'))))];
const isNumeric = (rows, field) => {
  const values = rows.slice(0, 50000).map(row => row?.[field]).filter(value => value !== null && value !== undefined && String(value).trim() !== '');
  return values.length > 0 && values.filter(value => Number.isFinite(Number(value))).length / values.length >= .7;
};
const average = (rows, field) => {
  const values = rows.map(row => Number(row?.[field])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
};
const format = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
const pretty = value => String(value).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('CSV needs a header and at least one data row.');
  const headers = rows[0].map(value => value.trim());
  if (headers.some(value => !value)) throw new Error('Every CSV column needs a header.');
  return rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}
function parseJson(raw) {
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.records) ? raw.records : Array.isArray(raw?.data) ? raw.data : null;
  if (!rows?.length || !rows.every(item => item && typeof item === 'object' && !Array.isArray(item))) throw new Error('JSON must contain an array of record objects, or a records/data array.');
  if (rows.length > 50000) throw new Error('Comparison files are limited to 50,000 rows for browser performance.');
  return rows;
}
export default function DatasetCompare({ rows, datasetName }) {
  const [second, setSecond] = useState(null), [metric, setMetric] = useState(''), [category, setCategory] = useState('');
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const firstFields = useMemo(() => fieldsOf(rows), [rows]);
  const secondFields = useMemo(() => second ? fieldsOf(second.rows) : [], [second]);
  const shared = useMemo(() => firstFields.filter(field => secondFields.includes(field)), [firstFields, secondFields]);
  const firstNumeric = useMemo(() => shared.filter(field => isNumeric(rows, field)), [shared, rows]);
  const secondNumeric = useMemo(() => shared.filter(field => isNumeric(second?.rows || [], field)), [shared, second]);
  const commonNumeric = useMemo(() => firstNumeric.filter(field => secondNumeric.includes(field)), [firstNumeric, secondNumeric]);
  const commonCategories = useMemo(() => shared.filter(field => !firstNumeric.includes(field) && !secondNumeric.includes(field)), [shared, firstNumeric, secondNumeric]);
  const selectedMetric = commonNumeric.includes(metric) ? metric : commonNumeric[0] || '';
  const selectedCategory = commonCategories.includes(category) ? category : commonCategories[0] || '';
  const result = useMemo(() => {
    if (!second) return null;
    const a = selectedMetric ? average(rows, selectedMetric) : 0;
    const b = selectedMetric ? average(second.rows, selectedMetric) : 0;
    const counts = new Map();
    if (selectedCategory) {
      [[rows, 'a'], [second.rows, 'b']].forEach(([source, key]) => source.forEach(record => {
        const name = String(record?.[selectedCategory] ?? '').trim() || '(Blank)';
        const item = counts.get(name) || { name, a: 0, b: 0 }; item[key] += 1; counts.set(name, item);
      }));
    }
    const metricRows = commonNumeric.map(field => {
      const av = average(rows, field), bv = average(second.rows, field);
      return { field, a: av, b: bv, delta: av === 0 ? null : (bv - av) / Math.abs(av) * 100 };
    });
    return { a, b, delta: a === 0 ? null : (b - a) / Math.abs(a) * 100, metrics: metricRows, categories: [...counts.values()].sort((x, y) => y.a + y.b - x.a - x.b).slice(0, 8) };
  }, [second, rows, selectedMetric, selectedCategory, commonNumeric]);
  async function loadFile(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setNotice('');
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('File exceeds the 20 MB comparison limit.');
      const text = await file.text();
      const data = file.name.toLowerCase().endsWith('.csv') ? parseCsv(text) : parseJson(JSON.parse(text));
      if (data.length > 50000) throw new Error('Comparison files are limited to 50,000 rows for browser performance.');
      setSecond({ name: file.name, rows: data }); setMetric(''); setCategory('');
      setNotice('Loaded ' + data.length.toLocaleString() + ' comparison rows. Your active dashboard dataset was not changed.');
    } catch (error) { setNotice(error.message || 'Could not read this file.'); }
    finally { setBusy(false); event.target.value = ''; }
  }
  function exportCsv() {
    if (!result) return;
    const rowsOut = [['Metric', 'Dataset A average', 'Dataset B average', 'Change (%)'], ...result.metrics.map(item => [item.field, item.a, item.b, item.delta === null ? 'N/A' : item.delta.toFixed(2)])];
    const csv = rowsOut.map(line => line.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'insightboard-dataset-comparison.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="dataset-compare" aria-labelledby="dataset-compare-title">
    <div className="dc-heading"><div><div className="dc-eyebrow"><GitCompareArrows size={14}/> COMPARATIVE INTELLIGENCE</div><h2 id="dataset-compare-title">Compare two datasets</h2><p>Keep your active dashboard intact while comparing a second file against it.</p></div>{second && <button className="dc-clear" onClick={() => { setSecond(null); setNotice('Comparison cleared. Active dataset unchanged.'); }}><X size={14}/> Clear comparison</button>}</div>
    <div className="dc-source-row">
      <div className="dc-source"><span className="dc-source-label">DATASET A · ACTIVE</span><strong>{datasetName || 'Current dataset'}</strong><small>{rows.length.toLocaleString()} rows · {firstFields.length} fields</small></div>
      <div className="dc-connector"><ArrowLeftRight size={19}/></div>
      <div className="dc-source dc-source-b"><span className="dc-source-label">DATASET B · COMPARISON</span>{second ? <><strong>{second.name}</strong><small>{second.rows.length.toLocaleString()} rows · {secondFields.length} fields</small></> : <><strong>No comparison file yet</strong><small>CSV or JSON · 20 MB / 50,000 rows max</small><button className="dc-upload" onClick={() => fileRef.current?.click()} disabled={busy}><FileUp size={15}/>{busy ? 'Reading file…' : 'Add second dataset'}</button></>}<input ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={loadFile} hidden/></div>
    </div>
    {notice && <div className="dc-notice" role="status">{notice}</div>}
    {!second ? <div className="dc-empty"><div className="dc-empty-icon"><GitCompareArrows size={21}/></div><div><strong>One workspace, two independent datasets</strong><p>Upload a second CSV or JSON file. Common fields and comparable metrics are calculated locally in your browser.</p></div></div> : <>
      <div className="dc-trust"><ShieldCheck size={15}/> Both datasets stay in this browser. This comparison tool does not upload or persist raw rows.</div>
      <div className="dc-stat-grid"><div><span>Row count difference</span><strong>{second.rows.length - rows.length > 0 ? '+' : ''}{(second.rows.length - rows.length).toLocaleString()}</strong><small>Dataset B minus Dataset A</small></div><div><span>Shared fields</span><strong>{shared.length}</strong><small>Of {firstFields.length} and {secondFields.length} fields</small></div><div><span>Comparable numeric fields</span><strong>{commonNumeric.length}</strong><small>Numeric in both datasets</small></div><div><span>Schema overlap</span><strong>{firstFields.length ? Math.round(shared.length / firstFields.length * 100) : 0}%</strong><small>Of Dataset A fields also in B</small></div></div>
      {commonNumeric.length ? <div className="dc-analysis"><div className="dc-controls"><label>Numeric metric<select value={selectedMetric} onChange={event => setMetric(event.target.value)}>{commonNumeric.map(field => <option key={field} value={field}>{pretty(field)}</option>)}</select></label>{selectedCategory && <label>Category field<select value={selectedCategory} onChange={event => setCategory(event.target.value)}>{commonCategories.map(field => <option key={field} value={field}>{pretty(field)}</option>)}</select></label>}<button className="dc-export" onClick={exportCsv}>Export metric comparison</button></div>
        <div className="dc-chart-grid"><div className="dc-chart-card"><div className="dc-chart-title"><div><strong>Average {pretty(selectedMetric)}</strong><small>Same numeric field across both datasets</small></div><span className={result.delta === null ? '' : result.delta >= 0 ? 'positive' : 'negative'}>{result.delta === null ? '—' : (result.delta > 0 ? '+' : '') + result.delta.toFixed(1) + '%'}</span></div><div className="dc-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: 'Average', a: result.a, b: result.b }]} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip formatter={value => format(value)}/><Legend/><Bar dataKey="a" name={datasetName || 'Dataset A'} fill="#377dff" radius={[5,5,0,0]}/><Bar dataKey="b" name={second.name} fill="#26b5a8" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><p className="dc-footnote">Change is measured from Dataset A to Dataset B. It is descriptive, not causal.</p></div>
        {selectedCategory && <div className="dc-chart-card"><div className="dc-chart-title"><div><strong>Shared category distribution</strong><small>Top 8 exact values across both datasets</small></div></div><div className="dc-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={result.categories} margin={{ top: 8, right: 12, left: 4, bottom: 25 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end"/><YAxis/><Tooltip/><Legend/><Bar dataKey="a" name={datasetName || 'Dataset A'} fill="#377dff" radius={[4,4,0,0]}/><Bar dataKey="b" name={second.name} fill="#26b5a8" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div><p className="dc-footnote">Similar labels are not automatically merged.</p></div>}</div>
        <div className="dc-table-wrap"><table className="dc-table"><thead><tr><th>Shared metric</th><th>Dataset A average</th><th>Dataset B average</th><th>Change</th></tr></thead><tbody>{result.metrics.map(item => <tr key={item.field}><td>{pretty(item.field)}</td><td>{format(item.a)}</td><td>{format(item.b)}</td><td className={item.delta === null ? '' : item.delta >= 0 ? 'positive' : 'negative'}>{item.delta === null ? 'N/A (A is zero)' : (item.delta > 0 ? '+' : '') + item.delta.toFixed(2) + '%'}</td></tr>)}</tbody></table></div>
      </div> : <div className="dc-no-metrics"><Info size={17}/><div><strong>No directly comparable numeric columns found</strong><p>{shared.length} fields are shared, but none is numeric in both datasets. Row-count and schema comparisons remain available.</p></div></div>}
    </>}
    <div className="dc-footer"><CheckCircle2 size={14}/> Existing filters, charts, reports and saved account data are unaffected.</div>
  </section>;
}
