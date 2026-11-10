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
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Upload,
  Globe,
  Database,
  Sparkles,
  Download,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  RefreshCw,
  Sliders,
  ArrowUpRight,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import {
  detectWakeWordAndCommand,
  extractConnectorRecords,
  resolveFuzzySchema,
  executeInsiCommand
} from './insiOperatorEngine.js';
import { insi } from './insiController.js';
import { playButtonClick } from './uiSound.js';
import './UniversalConnectorHub.css';

const QUICK_COMMANDS = [
  {
    label: 'Compound: Bar Chart + Bottom 2 Red + Export CSV',
    command: 'Hey INSI, show revenue by store as a bar chart, highlight the bottom 2 stores in red, and export a CSV'
  },
  {
    label: 'Top 3 Leaders by Revenue',
    command: 'Hey INSI, show top 3 stores by revenue and highlight leaders'
  },
  {
    label: 'Footfall Share Pie Chart',
    command: 'Hey INSI, show footfall distribution by category as a pie chart'
  },
  {
    label: 'Flag Lowest Conversion Anomalies',
    command: 'Hey INSI, highlight the bottom 2 units by conversion rate in red'
  },
  {
    label: 'Export Executive Summary TXT',
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

function exportProcessedDataFile(operatorOutput, format = 'csv', baseFilename = 'insight_board_export') {
  const rows = Array.isArray(operatorOutput?.processed_data) ? operatorOutput.processed_data : [];
  const safeBase = String(baseFilename || 'insight_board_export').replace(/\.[a-z0-9]+$/i, '');

  if (format === 'json') {
    triggerClientDownload(
      `${safeBase}.json`,
      JSON.stringify(operatorOutput, null, 2),
      'application/json;charset=utf-8;'
    );
    return `${safeBase}.json`;
  }

  if (format === 'executive_summary_txt') {
    const summary = operatorOutput?.executive_summary || {};
    const lines = [
      '====================================================================',
      'INSIGHTBOARD VDB — INSI EXECUTIVE SUMMARY BRIEF',
      '====================================================================',
      `Headline: ${summary.headline || 'N/A'}`,
      `Connector Mode: ${operatorOutput?.connector_status?.active_mode || 'demo_sandbox'}`,
      `Total Records Analyzed: ${operatorOutput?.connector_status?.total_records_analyzed || 0}`,
      `Spoken Brief: ${operatorOutput?.voice_reply || ''}`,
      '',
      'KEY DATA-BACKED INSIGHTS:',
      ...((summary.key_insights || []).map((item, idx) => `  ${idx + 1}. ${item}`)),
      '',
      `RECOMMENDED NEXT STEP:`,
      `  ${summary.recommended_next_step || 'N/A'}`,
      '===================================================================='
    ].join('\r\n');
    triggerClientDownload(`${safeBase}.txt`, lines, 'text/plain;charset=utf-8;');
    return `${safeBase}.txt`;
  }

  // Default CSV export
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
  onSwitchPreset,
  onParseCsv
}) {
  const [connectorMode, setConnectorMode] = useState(() =>
    preset === 'custom' ? 'file_upload' : 'demo_sandbox'
  );
  const [commandInput, setCommandInput] = useState(
    'Hey INSI, show revenue by store as a bar chart, highlight the bottom 2 stores in red, and export a CSV'
  );
  const [listeningWakeWord, setListeningWakeWord] = useState(false);
  const [voiceTtsEnabled, setVoiceTtsEnabled] = useState(true);
  const [lastWakeMatch, setLastWakeMatch] = useState('Hey INSI');
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [copiedTag, setCopiedTag] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('/api/connector/sample-pos-feed');
  const [rawWebhookJson, setRawWebhookJson] = useState('');
  const [webhookStatus, setWebhookStatus] = useState('');
  const [downloadNotice, setDownloadNotice] = useState('');

  const recognitionRef = useRef(null);

  // Sync mode when parent preset changes
  useEffect(() => {
    if (preset === 'custom' && connectorMode === 'demo_sandbox') {
      setConnectorMode('file_upload');
    }
  }, [preset, connectorMode]);

  const schemaInfo = useMemo(() => resolveFuzzySchema(rows, fields), [rows, fields]);

  // Compute initial operator output without triggering file download on mount
  const [operatorResult, setOperatorResult] = useState(() =>
    executeInsiCommand({
      rows,
      fields,
      datasetName,
      command: 'Hey INSI, show revenue by store as a bar chart and highlight the bottom 2 stores in red',
      activeMode: preset === 'custom' ? 'file_upload' : 'demo_sandbox'
    })
  );

  // Re-synchronize operator result whenever active dataset changes
  useEffect(() => {
    const res = executeInsiCommand({
      rows,
      fields,
      datasetName,
      command: 'Hey INSI, show revenue by store as a bar chart and highlight the bottom 2 stores in red',
      activeMode: connectorMode
    });
    setOperatorResult(res);
  }, [rows, fields, datasetName, connectorMode]);

  const speakVoiceReply = useCallback(
    (text) => {
      if (!voiceTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.04;
        utterance.pitch = 1.05;
        utterance.onstart = () => {
          insi.audioSync();
        };
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Browser TTS error:', err);
      }
    },
    [voiceTtsEnabled]
  );

  const runOperatorCommand = useCallback(
    (rawCommand, { allowDownload = true, speak = true } = {}) => {
      playButtonClick();
      const wakeCheck = detectWakeWordAndCommand(rawCommand);
      if (wakeCheck.matchedWakePhrase) {
        setLastWakeMatch(wakeCheck.matchedWakePhrase);
      }

      const output = executeInsiCommand({
        rows,
        fields,
        datasetName,
        command: rawCommand,
        activeMode: connectorMode
      });

      setOperatorResult(output);
      insi.applyMascotState(output.mascot_state);

      if (speak && output.voice_reply) {
        speakVoiceReply(output.voice_reply);
      }

      if (allowDownload) {
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
            setDownloadNotice(`Auto-exported "${downloaded}" via INSI Action Pipeline.`);
          }
        } else {
          setDownloadNotice('');
        }
      }
    },
    [rows, fields, datasetName, connectorMode, speakVoiceReply]
  );

  // Hands-free Web Speech API Wake-Word Listener ("Hey INSI", "Hey NC", "Hey in C", "Hey easy", "Hey insight")
  const toggleWakeWordListener = () => {
    playButtonClick();
    if (listeningWakeWord) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setListeningWakeWord(false);
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setWebhookStatus(
        'Browser Speech-to-Text is not supported in this browser tab. Type or tap any "Hey INSI" command below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setListeningWakeWord(true);
        insi.appear({ state: 'waving', auraColor: '#00F0FF' });
      };

      recognition.onresult = (event) => {
        const lastIdx = event.results.length - 1;
        const transcript = String(event.results[lastIdx]?.[0]?.transcript || '').trim();
        if (!transcript) return;
        const wake = detectWakeWordAndCommand(transcript);
        setCommandInput(transcript);
        if (wake.wakeWordDetected) {
          setLastWakeMatch(wake.matchedWakePhrase || 'Hey INSI');
        }
        runOperatorCommand(transcript, { allowDownload: true, speak: true });
      };

      recognition.onerror = () => {
        setListeningWakeWord(false);
      };

      recognition.onend = () => {
        setListeningWakeWord(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setListeningWakeWord(false);
      setWebhookStatus(`Could not start microphone listener: ${err.message}`);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Mode B: Drag & Drop or File Input Handler
  const handleFileIngest = async (file) => {
    if (!file) return;
    playButtonClick();
    try {
      const text = await file.text();
      let parsedRows = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        parsedRows = onParseCsv ? onParseCsv(text) : [];
      } else {
        const jsonPayload = JSON.parse(text);
        parsedRows = extractConnectorRecords(jsonPayload);
      }
      if (!parsedRows.length) {
        throw new Error('No valid records array found in the uploaded file.');
      }
      setConnectorMode('file_upload');
      if (onLoadDataset) {
        onLoadDataset(parsedRows, file.name, 'custom');
      }
      setWebhookStatus(`Connected "${file.name}" (${parsedRows.length} records) via Mode B File Dropzone.`);
      insi.magicImport();
    } catch (err) {
      setWebhookStatus(`File ingestion error: ${err.message}`);
      insi.react('error');
    }
  };

  // Mode C: Live API / Webhook / Nested JSON Payload Ingestion
  const handleFetchLiveWebhook = async () => {
    playButtonClick();
    setWebhookStatus('Connecting to live API / webhook feed…');
    try {
      let payload;
      if (rawWebhookJson.trim()) {
        payload = JSON.parse(rawWebhookJson.trim());
      } else {
        const res = await fetch(webhookUrl.trim());
        if (!res.ok) throw new Error(`HTTP ${res.status} from endpoint`);
        payload = await res.json();
      }
      const extracted = extractConnectorRecords(payload);
      if (!extracted.length) {
        throw new Error('JSON response did not contain a valid array of records.');
      }
      setConnectorMode('api_webhook');
      const sourceLabel = rawWebhookJson.trim()
        ? 'Live Pasted Webhook Payload'
        : `Live Webhook (${webhookUrl.trim().slice(0, 42)})`;
      if (onLoadDataset) {
        onLoadDataset(extracted, sourceLabel, 'custom');
      }
      setWebhookStatus(
        `Connected ${extracted.length} live records from nested API payload. All KPIs and INSI charts updated.`
      );
      insi.magicImport();
    } catch (err) {
      setWebhookStatus(`Live Webhook error: ${err.message}`);
      insi.react('error');
    }
  };

  const handleCopyText = async (label, text) => {
    playButtonClick();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTag(label);
      setTimeout(() => setCopiedTag(''), 2200);
    } catch {}
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

  const originUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://insightboard-v2-bsiu.onrender.com';

  const curlSnippet = `curl -X POST "${originUrl}/api/connector/analyze" \\
  -H "Content-Type: application/json" \\
  -d '{"command":"Hey INSI, show revenue by store as a bar chart and highlight the bottom 2 stores in red","active_mode":"api_webhook"}'`;

  return (
    <section className="uch-wrapper" aria-label="Universal Connector Hub and Hey INSI Executive Operator">
      {/* Top Identity & Wake-Word Status Banner */}
      <div className="uch-hero-card">
        <div className="uch-hero-left">
          <div className="uch-badge-row">
            <span
              className="uch-aura-pill"
              style={{
                borderColor: operatorResult?.mascot_state?.aura_color || '#00F0FF',
                boxShadow: `0 0 12px ${operatorResult?.mascot_state?.aura_color || '#00F0FF'}33`
              }}
            >
              <span
                className="uch-aura-dot"
                style={{ background: operatorResult?.mascot_state?.aura_color || '#00F0FF' }}
              />
              INSI.AI AUTONOMOUS OPERATOR · v3.0
            </span>
            <span className="uch-mode-pill">
              Mode: <strong>{operatorResult?.connector_status?.active_mode}</strong>
            </span>
            <span className="uch-mode-pill">
              Offline Mall Ready · $0 Zero-Key Engine
            </span>
          </div>
          <h2>Universal Data Connector &amp; &ldquo;Hey INSI&rdquo; Voice Operator</h2>
          <p>
            Connect retail POS exports, local CSV/JSON files, or live REST webhooks—or invoke INSI hands-free using{' '}
            <strong>&ldquo;Hey INSI&rdquo;</strong> (phonetic STT aware: <em>&ldquo;Hey NC&rdquo;</em>,{' '}
            <em>&ldquo;Hey in C&rdquo;</em>, <em>&ldquo;Hey easy&rdquo;</em>, <em>&ldquo;Hey insight&rdquo;</em>).
          </p>
        </div>

        <div className="uch-hero-actions">
          <button
            type="button"
            className={`uch-mic-btn ${listeningWakeWord ? 'listening' : ''}`}
            onClick={toggleWakeWordListener}
            data-testid="insi-wake-word-btn"
          >
            {listeningWakeWord ? <Mic size={17} /> : <MicOff size={17} />}
            <span>{listeningWakeWord ? 'Listening for "Hey INSI"…' : 'Enable "Hey INSI" Mic'}</span>
          </button>

          <button
            type="button"
            className="uch-tts-btn"
            onClick={() => {
              playButtonClick();
              setVoiceTtsEnabled((v) => !v);
            }}
            title="Toggle Browser Text-to-Speech Voice Reply"
          >
            {voiceTtsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{voiceTtsEnabled ? 'TTS Voice On' : 'TTS Muted'}</span>
          </button>

          <button
            type="button"
            className="uch-json-toggle-btn"
            onClick={() => {
              playButtonClick();
              setShowJsonInspector((v) => !v);
            }}
            data-testid="insi-json-inspector-toggle"
          >
            <Code2 size={16} />
            <span>{showJsonInspector ? 'Hide Structured JSON' : 'Inspect INSI JSON Schema'}</span>
          </button>
        </div>
      </div>

      {/* Separated 3-Mode Client-Side & External Connector Selector */}
      <div className="uch-modes-grid">
        {/* MODE A: Instant Demo Sandbox (100% Offline Ready) */}
        <div
          className={`uch-mode-card ${connectorMode === 'demo_sandbox' ? 'active' : ''}`}
          data-testid="connector-mode-demo"
        >
          <div className="uch-mode-header">
            <span className="uch-mode-tag">MODE A · DEMO SANDBOX</span>
            <Database size={18} />
          </div>
          <h3>Instant Offline Mall &amp; Transit Sandbox</h3>
          <p>
            Zero-latency pre-loaded portfolios that run 100% offline inside any shopping mall or executive boardroom.
          </p>
          <div className="uch-mode-btn-row">
            <button
              type="button"
              className={`uch-btn ${preset === 'mall' && connectorMode === 'demo_sandbox' ? 'primary' : 'secondary'}`}
              onClick={() => {
                setConnectorMode('demo_sandbox');
                onSwitchPreset && onSwitchPreset('mall');
              }}
            >
              Shopping Mall &amp; Retail (16 Stores)
            </button>
            <button
              type="button"
              className={`uch-btn ${preset === 'metro' && connectorMode === 'demo_sandbox' ? 'primary' : 'secondary'}`}
              onClick={() => {
                setConnectorMode('demo_sandbox');
                onSwitchPreset && onSwitchPreset('metro');
              }}
            >
              Hyderabad Metro Rail
            </button>
          </div>
        </div>

        {/* MODE B: Local File Dropzone (POS / ERP / SAP / Tally / Shopify CSV & JSON) */}
        <div
          className={`uch-mode-card ${connectorMode === 'file_upload' ? 'active' : ''} ${dragActive ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) void handleFileIngest(file);
          }}
          data-testid="connector-mode-upload"
        >
          <div className="uch-mode-header">
            <span className="uch-mode-tag">MODE B · LOCAL FILE DROPZONE</span>
            <Upload size={18} />
          </div>
          <h3>Drag &amp; Drop POS / ERP CSV or JSON</h3>
          <p>
            Auto-maps fuzzy business columns (<code>gross_sales</code> &rarr; <code>revenue</code>,{' '}
            <code>tenant_name</code> &rarr; <code>store</code>, <code>visitor_count</code> &rarr;{' '}
            <code>footfall</code>).
          </p>
          <div className="uch-dropzone-box">
            <label className="uch-upload-label">
              <FileSpreadsheet size={16} />
              <span>Drop CSV / JSON here or Browse Device</span>
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFileIngest(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {/* MODE C: Live API / Webhook + External ChatGPT / Claude / Corporate Connector */}
        <div
          className={`uch-mode-card ${connectorMode === 'api_webhook' ? 'active' : ''}`}
          data-testid="connector-mode-webhook"
        >
          <div className="uch-mode-header">
            <span className="uch-mode-tag">MODE C · LIVE API &amp; EXTERNAL AI BRIDGE</span>
            <Globe size={18} />
          </div>
          <h3>Live REST Webhook &amp; External GPT/Claude Spec</h3>
          <p>
            Pull nested JSON arrays (<code>data.stores</code>) from any URL or connect external ChatGPT/Claude agents
            directly via OpenAPI 3.1.
          </p>
          <div className="uch-webhook-controls">
            <input
              type="text"
              className="uch-input"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://api.your-mall-pos.com/v1/sales or /api/connector/sample-pos-feed"
              aria-label="Live API or Webhook URL"
            />
            <button
              type="button"
              className="uch-btn primary"
              onClick={handleFetchLiveWebhook}
              data-testid="connect-live-webhook-btn"
            >
              <Radio size={14} />
              <span>Pull Live Feed</span>
            </button>
          </div>
          <div className="uch-external-spec-row">
            <button
              type="button"
              className="uch-chip-btn"
              onClick={() => handleCopyText('openapi', `${originUrl}/api/connector/openapi.json`)}
            >
              <Copy size={12} />
              <span>{copiedTag === 'openapi' ? 'Copied OpenAPI URL!' : 'Copy OpenAPI 3.1 URL (ChatGPT/Claude)'}</span>
            </button>
            <button
              type="button"
              className="uch-chip-btn"
              onClick={() => handleCopyText('curl', curlSnippet)}
            >
              <Copy size={12} />
              <span>{copiedTag === 'curl' ? 'Copied Webhook cURL!' : 'Copy Stateless POST cURL'}</span>
            </button>
          </div>
        </div>
      </div>

      {webhookStatus && (
        <div className="uch-status-banner" role="status">
          <CheckCircle2 size={15} />
          <span>{webhookStatus}</span>
        </div>
      )}

      {/* Fuzzy Schema Mapping & Connector Telemetry Strip */}
      <div className="uch-schema-strip">
        <div className="uch-schema-item">
          <span className="uch-schema-label">Active Dataset</span>
          <strong>{datasetName}</strong>
        </div>
        <div className="uch-schema-item">
          <span className="uch-schema-label">Records Analyzed</span>
          <strong>{operatorResult?.connector_status?.total_records_analyzed?.toLocaleString() || rows.length}</strong>
        </div>
        <div className="uch-schema-item">
          <span className="uch-schema-label">Fuzzy Entity Key</span>
          <code>{schemaInfo.labelField}</code>
        </div>
        <div className="uch-schema-item">
          <span className="uch-schema-label">Fuzzy Primary Metric</span>
          <code>{schemaInfo.primaryMetric || 'count'}</code>
        </div>
        <div className="uch-schema-item">
          <span className="uch-schema-label">Wake-Word Trigger</span>
          <code>{lastWakeMatch}</code>
        </div>
      </div>

      {/* "Hey INSI" Command Bar & Quick Multi-Step Action Chips */}
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
            placeholder='Say or type: "Hey INSI, show revenue by store as a bar chart, highlight the bottom 2 stores in red, and export a CSV"'
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
            <span>Execute Command</span>
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
      </div>

      {downloadNotice && (
        <div className="uch-download-toast" role="status">
          <Download size={15} />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Executive Voice Reply & Multi-Step Dashboard Output Grid */}
      <div className="uch-output-grid">
        {/* Left Column: Spoken Voice Reply + Executive Summary + Chained Actions */}
        <div className="uch-summary-card">
          <div className="uch-voice-bubble">
            <div className="uch-voice-header">
              <span className="uch-voice-tag">
                <Volume2 size={14} /> INSI Spoken Reply ({operatorResult?.voice_reply?.split(/\s+/).length || 0}/35 words max)
              </span>
              <button
                type="button"
                className="uch-replay-btn"
                onClick={() => speakVoiceReply(operatorResult?.voice_reply)}
              >
                Speak Again
              </button>
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

          {/* Multi-Step Action Pipeline Badges */}
          <div className="uch-actions-pipeline">
            <span className="uch-section-kicker">
              CHAINED DASHBOARD ACTIONS ({operatorResult?.dashboard_actions?.length || 0})
            </span>
            <div className="uch-action-badges">
              {(operatorResult?.dashboard_actions || []).map((act, idx) => (
                <div key={idx} className="uch-action-badge">
                  <strong>
                    {idx + 1}. {act.action_type}
                  </strong>
                  <span>
                    {act.action_type === 'export_file'
                      ? `${act.export_config?.file_format?.toUpperCase()} (${act.export_config?.suggested_filename})`
                      : act.action_type === 'highlight_anomalies'
                      ? `Flagged: ${act.filter_config?.value || 'Bottom units'}`
                      : `${act.chart_config?.chart_type?.toUpperCase()} · ${act.chart_config?.y_axis_key} by ${act.chart_config?.x_axis_key}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live INSI Visual Chart with Anomaly Highlighting */}
        <div className="uch-chart-card">
          <div className="uch-chart-header">
            <div>
              <span className="uch-section-kicker">LIVE OPERATOR VISUALIZATION</span>
              <h3>{primaryChartAction?.chart_config?.title || `${yKey} by ${xKey}`}</h3>
            </div>
            <div className="uch-export-mini-group">
              <button
                type="button"
                className="uch-chip-btn"
                onClick={() =>
                  exportProcessedDataFile(operatorResult, 'csv', 'insi_processed_export')
                }
              >
                <Download size={12} /> CSV
              </button>
              <button
                type="button"
                className="uch-chip-btn"
                onClick={() =>
                  exportProcessedDataFile(operatorResult, 'json', 'insi_structured_output')
                }
              >
                <Download size={12} /> JSON
              </button>
            </div>
          </div>

          <div className="uch-chart-canvas">
            {chartData.length === 0 ? (
              <div className="uch-empty-chart">
                <AlertTriangle size={24} />
                <p>Connect a dataset in Mode A, B, or C to render live charts.</p>
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

      {/* Toggleable Structured JSON Output Inspector */}
      {showJsonInspector && (
        <div className="uch-json-inspector" data-testid="insi-json-inspector">
          <div className="uch-json-header">
            <div>
              <strong>INSI Mandatory Structured Output Schema (Live Response)</strong>
              <span>
                Strict JSON contract for InsightBoard UI rendering &amp; external ChatGPT / Claude / Webhook consumers
              </span>
            </div>
            <button
              type="button"
              className="uch-chip-btn"
              onClick={() =>
                handleCopyText('json_schema', JSON.stringify(operatorResult, null, 2))
              }
            >
              <Copy size={13} />
              <span>{copiedTag === 'json_schema' ? 'Copied JSON!' : 'Copy Full JSON'}</span>
            </button>
          </div>
          <pre className="uch-json-pre">{JSON.stringify(operatorResult, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
