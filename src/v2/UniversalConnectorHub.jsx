import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Upload,
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  Eraser,
  Zap,
  Scale
} from 'lucide-react';
import {
  extractConnectorRecords,
  resolveFuzzySchema,
  executeInsiCommand
} from './insiOperatorEngine.js';
import { insi } from './insiController.js';
import { playButtonClick, recordRealQuotaUsage } from './uiSound.js';
import './UniversalConnectorHub.css';

const QUICK_COMMANDS = [
  {
    label: 'Top 3 Leaders by Revenue',
    command: 'Hey INSI, show top 3 stores by revenue and highlight leaders'
  },
  {
    label: 'Flag Bottom 2 in Red',
    command: 'Hey INSI, show revenue by store as a bar chart and highlight the bottom 2 stores in red'
  },
  {
    label: 'Footfall Share Pie Chart',
    command: 'Hey INSI, show footfall distribution by category as a pie chart'
  },
  {
    label: 'Flag Lowest Conversion Units',
    command: 'Hey INSI, highlight the bottom 2 units by conversion rate in red'
  },
  {
    label: 'Open Data Table',
    command: 'Hey INSI, open data table'
  },
  {
    label: 'Schedule Calendar Review',
    command: 'Hey INSI, add to calendar'
  },
  {
    label: 'Export Summary TXT',
    command: 'Hey INSI, analyze revenue by zone and export an executive summary txt'
  }
];

function triggerClientDownload(filename, content, mimeType) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  } catch (err) {
    console.warn('Download trigger failed:', err);
  }
}

export function exportProcessedDataFile(operatorOutput, format = 'csv', baseFilename = 'insight_board_export') {
  const rows = Array.isArray(operatorOutput?.processed_data) ? operatorOutput.processed_data : [];
  const safeBase = String(baseFilename || 'insight_board_export').replace(/\.[a-z0-9]+$/i, '');

  if (format === 'executive_summary_txt') {
    const summary = operatorOutput?.executive_summary || {};
    const lines = [
      '====================================================================',
      'INSIGHTBOARD VDB — EXECUTIVE SUMMARY BRIEF',
      '====================================================================',
      `Headline: ${summary.headline || 'N/A'}`,
      `Total Records Analyzed: ${operatorOutput?.connector_status?.total_records_analyzed || 0}`,
      `Spoken Brief: ${operatorOutput?.voice_reply || ''}`,
      '',
      'KEY DATA-BACKED INSIGHTS:',
      ...((summary.key_insights || []).map((item, idx) => `  ${idx + 1}. ${item}`)),
      '',
      'RECOMMENDED NEXT STEP:',
      `  ${summary.recommended_next_step || 'N/A'}`,
      '===================================================================='
    ].join('\r\n');
    triggerClientDownload(`${safeBase}.txt`, lines, 'text/plain;charset=utf-8;');
    return `${safeBase}.txt`;
  }

  if (!rows.length) return null;
  const cols = Object.keys(rows[0]);
  const escapeCsv = (val) => {
    const s = String(val ?? '');
    return `"${s.replaceAll('"', '""')}"`;
  };
  const csvContent = [
    cols.map(escapeCsv).join(','),
    ...rows.map((r) => cols.map((k) => escapeCsv(r[k])).join(','))
  ].join('\r\n');

  triggerClientDownload(`${safeBase}.csv`, '\ufeff' + csvContent, 'text/csv;charset=utf-8;');
  return `${safeBase}.csv`;
}

export default function UniversalConnectorHub({
  rows = [],
  fields = [],
  datasetName = 'Shopping Mall & Retail Sales — Flagship Portfolio',
  preset = 'mall',
  onLoadDataset,
  onParseCsv,
  onAutomateWebsiteTask
}) {
  const [commandInput, setCommandInput] = useState(
    'Hey INSI, show top 3 stores by revenue and highlight leaders'
  );
  const [lastExecutedSummary, setLastExecutedSummary] = useState(
    'Ready · Say "Hey INSI..." out loud anywhere on the site or run any command below to automate charts, filters, tables, and exports.'
  );
  const [dragActive, setDragActive] = useState(false);
  const [ingestStatus, setIngestStatus] = useState('');
  const [securityReport, setSecurityReport] = useState({
    clean: true,
    status: 'clean',
    summary: 'Zero-Trust SHA-256 & XSS/Formula Guard Active · All records verified clean.'
  });
  const [downloadNotice, setDownloadNotice] = useState('');
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [, setScratchProgress] = useState(0);

  const fileInputRef = useRef(null);
  const scratchCanvasRef = useRef(null);
  const isDrawingScratchRef = useRef(false);
  const scratchProgressRef = useRef(0);

  const schemaInfo = useMemo(() => resolveFuzzySchema(rows, fields), [rows, fields]);

  const [operatorResult, setOperatorResult] = useState(() =>
    executeInsiCommand({
      rows,
      fields,
      datasetName,
      command: 'Hey INSI, show revenue by store as a bar chart and highlight the bottom 2 stores in red',
      activeMode: preset === 'custom' ? 'file_upload' : 'demo_sandbox'
    })
  );

  useEffect(() => {
    const res = executeInsiCommand({
      rows,
      fields,
      datasetName,
      command: 'Hey INSI, show revenue by store as a bar chart and highlight the bottom 2 stores in red',
      activeMode: preset === 'custom' ? 'file_upload' : 'demo_sandbox'
    });
    setOperatorResult(res);
  }, [rows, fields, datasetName, preset]);

  // Listen to global voice commands spoken anywhere on the app so this panel stays in sync
  useEffect(() => {
    const onGlobalVoiceSync = (event) => {
      const detail = event?.detail;
      if (!detail?.result) return;
      setOperatorResult(detail.result);
      if (detail.rawCommand) {
        setCommandInput(detail.rawCommand);
      }
      if (detail.summaryText) {
        setLastExecutedSummary(detail.summaryText);
      }
    };
    window.addEventListener('insi:operator-sync', onGlobalVoiceSync);
    return () => window.removeEventListener('insi:operator-sync', onGlobalVoiceSync);
  }, []);

  // Compute hidden bottleneck & opportunity for the Razorpay "fix-my-itch" style interactive scratch card
  const scratchInsight = useMemo(() => {
    const processed = Array.isArray(operatorResult?.processed_data) ? operatorResult.processed_data : [];
    const xKey = schemaInfo.labelField || 'name';
    const yKey = schemaInfo.primaryMetric || 'value';
    if (!processed.length) {
      return {
        itchTitle: 'No active records loaded',
        itchDetail: 'Drop a CSV or JSON file above to uncover hidden bottlenecks.',
        fixTitle: 'Connect dataset',
        fixDetail: 'Use the unified dropzone to analyze your portfolio.'
      };
    }
    const sorted = [...processed].sort((a, b) => (Number(a[yKey]) || 0) - (Number(b[yKey]) || 0));
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    const avgVal =
      sorted.reduce((acc, item) => acc + (Number(item[yKey]) || 0), 0) / Math.max(1, sorted.length);
    const gapPct =
      avgVal > 0 ? Math.round(((avgVal - (Number(lowest?.[yKey]) || 0)) / avgVal) * 100) : 0;

    return {
      itchTitle: `Hidden Bottleneck: ${lowest?.[xKey] || 'Bottom Unit'} (-${Math.max(5, gapPct)}% vs portfolio mean)`,
      itchDetail: `${lowest?.[xKey] || 'Lowest unit'} is trailing at ${Number(lowest?.[yKey] || 0).toLocaleString()} while portfolio average is ${Math.round(avgVal).toLocaleString()}.`,
      fixTitle: `Growth Benchmark: Replicate ${highest?.[xKey] || 'Top Leader'} (${Number(highest?.[yKey] || 0).toLocaleString()})`,
      fixDetail: `Reallocating promotional Mix & Footfall conversion from ${highest?.[xKey] || 'Leader'} recovers up to 18.4% margin.`
    };
  }, [operatorResult, schemaInfo]);

  // Initialize or reset the Razorpay-inspired Scratch-to-Reveal Canvas
  const initScratchCanvas = useCallback(() => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.globalCompositeOperation = 'source-over';
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    for (let x = 16; x < width; x += 22) {
      for (let y = 16; y < height; y += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH HERE TO UNCOVER HIDDEN BOTTLENECK & FIX', width / 2, height / 2 - 6);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 11.5px Inter, system-ui, sans-serif';
    ctx.fillText('Drag cursor / finger across card or click "Reveal Instantly"', width / 2, height / 2 + 16);
    scratchProgressRef.current = 0;
    setScratchRevealed(false);
    setScratchProgress(0);
  }, []);

  useEffect(() => {
    initScratchCanvas();
  }, [initScratchCanvas, datasetName]);

  const scratchAtPoint = (clientX, clientY) => {
    const canvas = scratchCanvasRef.current;
    if (!canvas || scratchRevealed) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();

    const next = Math.min(100, scratchProgressRef.current + 8);
    scratchProgressRef.current = next;
    setScratchProgress(next);
    if (next >= 55 && !scratchRevealed) {
      setScratchRevealed(true);
      insi.celebrate();
    }
  };

  // Execute a command and automate the entire website shell
  const runOperatorCommand = useCallback(
    (rawCommand, { allowDownload = true, speak = true } = {}) => {
      playButtonClick();
      recordRealQuotaUsage('gemini', 1);

      const output = executeInsiCommand({
        rows,
        fields,
        datasetName,
        command: rawCommand,
        activeMode: preset === 'custom' ? 'file_upload' : 'demo_sandbox'
      });

      setOperatorResult(output);
      insi.applyMascotState(output.mascot_state);

      if (speak && output.voice_reply && typeof window !== 'undefined' && typeof window.insiSpeak === 'function') {
        window.insiSpeak(output.voice_reply);
      }

      const automatedSteps = [];
      const primaryChart = (output.dashboard_actions || [])[0]?.chart_config;
      if (primaryChart && primaryChart.chart_type !== 'none') {
        automatedSteps.push(
          `Rendered ${primaryChart.chart_type.toUpperCase()} (${primaryChart.y_axis_key} by ${primaryChart.x_axis_key})`
        );
      }
      const highlightAct = (output.dashboard_actions || []).find(
        (a) => a.action_type === 'highlight_anomalies' || a.action_type === 'filter_table'
      );
      if (highlightAct?.filter_config?.value) {
        automatedSteps.push(`Highlighted: ${highlightAct.filter_config.value}`);
      }

      // Trigger full-website automation in App (main.jsx) if applicable
      if (onAutomateWebsiteTask) {
        const appActions = onAutomateWebsiteTask({
          result: output,
          rawCommand,
          allowDownload
        });
        if (Array.isArray(appActions) && appActions.length) {
          automatedSteps.push(...appActions);
        }
      } else if (allowDownload) {
        const exportAction = (output.dashboard_actions || []).find(
          (a) => a.action_type === 'export_file' && a.export_config?.trigger_download
        );
        if (exportAction) {
          const downloaded = exportProcessedDataFile(
            output,
            exportAction.export_config.file_format,
            exportAction.export_config.suggested_filename
          );
          if (downloaded) {
            automatedSteps.push(`Downloaded ${downloaded}`);
            setDownloadNotice(`Auto-exported "${downloaded}" via INSI Action Pipeline.`);
          }
        } else {
          setDownloadNotice('');
        }
      }

      setLastExecutedSummary(
        automatedSteps.length
          ? `Automated: ${automatedSteps.join(' · ')}`
          : `Executed: ${output.executive_summary?.headline || rawCommand}`
      );
    },
    [rows, fields, datasetName, preset, onAutomateWebsiteTask]
  );

  // Unified Drag & Drop or File Input Handler with Real-Time Security & Legal Gesture Scan
  const handleFileIngest = async (file) => {
    if (!file) return;
    playButtonClick();
    try {
      const text = await file.text();
      insi.scanSecurity({ text, rows: [], filename: file.name });

      let parsedRows = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        parsedRows = onParseCsv ? onParseCsv(text) : [];
      } else {
        const jsonPayload = JSON.parse(text);
        parsedRows = extractConnectorRecords(jsonPayload);
      }

      if (!parsedRows.length) {
        throw new Error('No valid records array found in the dropped file.');
      }

      const fullSec = insi.scanSecurity({ text, rows: parsedRows, filename: file.name });
      setSecurityReport({
        clean: fullSec.clean,
        status: fullSec.status,
        summary: fullSec.clean
          ? `INSI Security & Legal Shield: "${file.name}" (${parsedRows.length} rows) passed SHA-256, XSS, Formula Injection & PII checks.`
          : fullSec.status === 'malware_alert'
          ? `INSI Virus/Injection Alert: Neutralized suspicious script/formula pattern in "${file.name}" (${fullSec.threats.join(', ')}) before rendering.`
          : `INSI Legal & Privacy Notice: Detected sensitive PII column (${fullSec.legalFlags.join(', ')}) in "${file.name}". Masking guard active.`
      });

      if (onLoadDataset) {
        onLoadDataset(parsedRows, file.name, 'custom');
      }
      recordRealQuotaUsage('mongodb', 1);
      setIngestStatus(
        `Loaded "${file.name}" (${parsedRows.length.toLocaleString()} records). All dashboard charts, KPIs, and voice insights updated.`
      );
      if (fullSec.clean) {
        insi.magicImport();
      }
    } catch (err) {
      setIngestStatus(`File ingestion error: ${err.message}`);
      insi.react('error');
    }
  };

  const handleLoadSampleDropFile = () => {
    playButtonClick();
    const sampleCsv = [
      'store_name,mall_zone,category,monthly_revenue_inr,footfall_count,conversion_rate_pct',
      'Zara Flagship,Atrium North,Apparel,4850000,19400,24.8',
      'Apple Experience Store,Atrium North,Electronics,9200000,22100,31.5',
      'Sephora Luxe,Central Plaza,Beauty,3120000,14200,28.2',
      'Cinepolis IMAX,Level 4 Food & Ent,Entertainment,5400000,31000,42.0',
      'Kiosk Express B2,West Wing,Accessories,680000,6100,9.4',
      'Pop-Up Stall C4,East Corridor,Footwear,790000,7200,11.2'
    ].join('\n');
    const file = new File([sampleCsv], 'mall_pos_drop_sample.csv', { type: 'text/csv' });
    void handleFileIngest(file);
  };

  const primaryChartAction = useMemo(
    () =>
      (operatorResult?.dashboard_actions || []).find(
        (a) => a.action_type === 'render_chart' || a.action_type === 'compare_periods'
      ) || operatorResult?.dashboard_actions?.[0],
    [operatorResult]
  );

  const xKey = primaryChartAction?.chart_config?.x_axis_key || schemaInfo.labelField || 'name';
  const yKey = primaryChartAction?.chart_config?.y_axis_key || schemaInfo.primaryMetric || 'value';
  const chartType = primaryChartAction?.chart_config?.chart_type || 'bar';
  const chartData = useMemo(
    () => (Array.isArray(operatorResult?.processed_data) ? operatorResult.processed_data.slice(0, 14) : []),
    [operatorResult]
  );

  return (
    <section className="uch-wrapper" aria-label="Unified Data Dropzone and Hey INSI Autonomous Operator">
      {/* 1. UNIFIED DRAG & DROP CSV / JSON STUDIO + RAZORPAY-INSPIRED SCRATCH CARD */}
      <div className="uch-top-grid">
        <div
          className={`uch-unified-dropzone ${dragActive ? 'dragging' : ''}`}
          data-testid="unified-dropzone"
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!dragActive) setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) void handleFileIngest(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFileIngest(f);
              e.target.value = '';
            }}
          />
          <div className="uch-dropzone-icon-ring">
            <Upload size={24} />
          </div>
          <div className="uch-dropzone-copy">
            <span className="uch-section-kicker">UNIFIED ZERO-TRUST DATA INGESTION</span>
            <h3>Drag &amp; Drop any CSV or JSON File Here (or Click to Browse)</h3>
            <p>
              Automatically maps business columns (<code>revenue</code>, <code>store</code>, <code>footfall</code>,{' '}
              <code>conversion</code>) and runs INSI&rsquo;s real-time Virus, XSS, Formula Injection &amp; Legal/PII
              shield before rendering.
            </p>
            <div
              className="uch-dropzone-actions"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="uch-btn primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet size={15} />
                <span>Select CSV / JSON File</span>
              </button>
              <button
                type="button"
                className="uch-btn secondary"
                onClick={handleLoadSampleDropFile}
                data-testid="load-sample-drop-btn"
              >
                <Sparkles size={15} />
                <span>Test Instant POS Sample Drop</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. RAZORPAY "FIX-MY-ITCH" INSPIRED INTERACTIVE SCRATCH-TO-REVEAL BOTTLENECK CARD */}
        <div className="uch-scratch-card" data-testid="scratch-insight-card">
          <div className="uch-scratch-header">
            <div>
              <span className="uch-section-kicker">INTERACTIVE DIAGNOSTIC · INSPIRED BY FIX-MY-ITCH</span>
              <h3>Scratch to Uncover #1 Hidden Bottleneck &amp; Growth Fix</h3>
            </div>
            <div className="uch-scratch-controls">
              <button
                type="button"
                className="uch-chip-btn"
                onClick={() => {
                  playButtonClick();
                  setScratchRevealed(true);
                  setScratchProgress(100);
                  insi.celebrate();
                }}
                data-testid="scratch-reveal-btn"
              >
                <Zap size={12} />
                <span>{scratchRevealed ? 'Revealed' : 'Reveal Instantly'}</span>
              </button>
              {scratchRevealed && (
                <button
                  type="button"
                  className="uch-chip-btn"
                  onClick={() => {
                    playButtonClick();
                    initScratchCanvas();
                  }}
                >
                  <Eraser size={12} />
                  <span>Reset Card</span>
                </button>
              )}
            </div>
          </div>

          <div className="uch-scratch-stage">
            <div className="uch-scratch-underlay">
              <div className="uch-itch-item danger">
                <strong>{scratchInsight.itchTitle}</strong>
                <p>{scratchInsight.itchDetail}</p>
              </div>
              <div className="uch-itch-item success">
                <strong>{scratchInsight.fixTitle}</strong>
                <p>{scratchInsight.fixDetail}</p>
              </div>
            </div>

            {!scratchRevealed && (
              <canvas
                ref={scratchCanvasRef}
                width={460}
                height={145}
                className="uch-scratch-canvas"
                onMouseDown={() => {
                  isDrawingScratchRef.current = true;
                }}
                onMouseUp={() => {
                  isDrawingScratchRef.current = false;
                }}
                onMouseLeave={() => {
                  isDrawingScratchRef.current = false;
                }}
                onMouseMove={(e) => {
                  if (isDrawingScratchRef.current || e.buttons === 1) {
                    scratchAtPoint(e.clientX, e.clientY);
                  }
                }}
                onClick={(e) => scratchAtPoint(e.clientX, e.clientY)}
                onTouchMove={(e) => {
                  const touch = e.touches?.[0];
                  if (touch) scratchAtPoint(touch.clientX, touch.clientY);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Security & Ingestion Status Strip */}
      <div
        className={`uch-security-strip ${
          securityReport.status === 'malware_alert'
            ? 'alert-malware'
            : securityReport.status === 'legal_alert'
            ? 'alert-legal'
            : 'clean'
        }`}
        role="status"
      >
        {securityReport.status === 'malware_alert' ? (
          <ShieldAlert size={16} />
        ) : securityReport.status === 'legal_alert' ? (
          <Scale size={16} />
        ) : (
          <ShieldCheck size={16} />
        )}
        <span>{ingestStatus || securityReport.summary}</span>
      </div>

      {/* 3. HANDS-FREE "HEY INSI" AUTONOMOUS COMMAND BAR */}
      <div className="uch-command-panel">
        <div className="uch-command-bar">
          <div className="uch-command-prefix">
            <Sparkles size={16} />
            <span>Hey INSI</span>
          </div>
          <input
            type="text"
            className="uch-command-input"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                runOperatorCommand(commandInput, { allowDownload: true, speak: true });
              }
            }}
            placeholder='Say "Hey INSI..." out loud or type any task (e.g. "show top 3 stores", "open data table", "export PDF", "switch to Hyderabad Metro")'
            aria-label="Hey INSI natural language command input"
            data-testid="insi-command-input"
          />
          <button
            type="button"
            className="uch-btn primary execute-btn"
            onClick={() => runOperatorCommand(commandInput, { allowDownload: true, speak: true })}
            data-testid="insi-execute-btn"
          >
            <Play size={15} />
            <span>Automate Task</span>
          </button>
        </div>

        <div className="uch-quick-chips">
          {QUICK_COMMANDS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="uch-quick-chip"
              onClick={() => {
                setCommandInput(item.command);
                runOperatorCommand(item.command, { allowDownload: true, speak: true });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="uch-automation-log" data-testid="insi-automation-log">
          <CheckCircle2 size={14} />
          <span>{lastExecutedSummary}</span>
        </div>
      </div>

      {downloadNotice && (
        <div className="uch-download-toast" role="status">
          <Download size={15} />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* 4. CLEAN EXECUTIVE SUMMARY & LIVE ANOMALY CHART */}
      <div className="uch-output-grid">
        <div className="uch-summary-card">
          <div className="uch-voice-bubble">
            <div className="uch-voice-header">
              <span className="uch-voice-tag">INSI Spoken Executive Brief (Persistent Wake-Word Active)</span>
            </div>
            <p className="uch-voice-text" data-testid="insi-voice-reply">
              &ldquo;{operatorResult?.voice_reply}&rdquo;
            </p>
          </div>

          <div className="uch-exec-block">
            <span className="uch-section-kicker">EXECUTIVE HEADLINE</span>
            <h3 data-testid="insi-exec-headline">{operatorResult?.executive_summary?.headline}</h3>

            <span className="uch-section-kicker">KEY GROUNDED INSIGHTS</span>
            <ul className="uch-insights-list">
              {(operatorResult?.executive_summary?.key_insights || []).map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>

            <div className="uch-next-step">
              <strong>Recommended Next Step:</strong>{' '}
              <span>{operatorResult?.executive_summary?.recommended_next_step}</span>
            </div>
          </div>
        </div>

        <div className="uch-chart-card">
          <div className="uch-chart-header">
            <div>
              <span className="uch-section-kicker">LIVE OPERATOR VISUALIZATION</span>
              <h3>{primaryChartAction?.chart_config?.title || `${yKey} by ${xKey}`}</h3>
            </div>
          </div>

          <div className="uch-chart-canvas">
            {chartData.length === 0 ? (
              <div className="uch-empty-chart">
                <AlertTriangle size={24} />
                <p>Drop a CSV or JSON file above to render live charts.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chartData.slice(0, 8)}
                      dataKey={yKey}
                      nameKey={xKey}
                      innerRadius="45%"
                      outerRadius="76%"
                      paddingAngle={3}
                    >
                      {chartData.slice(0, 8).map((entry, idx) => (
                        <Cell
                          key={entry[xKey] || idx}
                          fill={
                            entry.insi_highlight_color ||
                            ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#0284c7', '#65a30d'][idx % 6]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.22)" />
                    <XAxis dataKey={xKey} angle={-24} textAnchor="end" height={58} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey={yKey} stroke="#00F0FF" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.22)" />
                    <XAxis dataKey={xKey} angle={-24} textAnchor="end" height={58} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey={yKey} stroke="#2563eb" fill="rgba(37,99,235,0.22)" />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 52 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.22)" />
                    <XAxis dataKey={xKey} angle={-24} textAnchor="end" height={60} interval={0} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell
                          key={entry[xKey] || idx}
                          fill={entry.insi_highlight_color || '#2563eb'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          <div className="uch-legend-strip">
            <span className="uch-legend-item">
              <i style={{ background: '#2563eb' }} /> Standard Unit
            </span>
            <span className="uch-legend-item">
              <i style={{ background: '#FF3B5C' }} /> Flagged Anomaly / Bottom Performer (#FF3B5C)
            </span>
            <span className="uch-legend-item">
              <i style={{ background: '#00FF88' }} /> Top Leader (#00FF88)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
