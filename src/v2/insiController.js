// insi.ai — Event-Driven Mascot Animation Controller, Website Guardian & Security/Compliance Scanner
// Pure human feelings, expressions, motion tracking, roaming headings, and security gestures (Zero text below mascot)

export const INSI_BRAND = Object.freeze({
  characterName: 'insi',
  brandName: 'insi.ai',
  parentProduct: 'InsightBoard VDB',
  tagline: 'Powered by InsightBoard VDB'
});

export const INSI_STATES = Object.freeze([
  'idle',
  'greeting',
  'waving',
  'sleeping',
  'reading',
  'drinking',
  'dancing',
  'thinking',
  'confused',
  'surprised',
  'happy',
  'typing',
  'celebrating',
  'observing',
  'walking',
  'magic_import',
  'heavy_ai',
  'audio_sync',
  'viewing_charts',
  'exporting',
  'flexing',
  'roaming_heading',
  'pulling_dashboard',
  'security_scan',
  'malware_alert',
  'legal_alert',
  'security_pass'
]);

export const INSI_CORNERS = Object.freeze([
  'bottom-right',
  'bottom-left',
  'top-right',
  'mid-right',
  'top-left',
  'mid-left',
  'heading-perch',
  'kpi-perch'
]);

export const INSI_SIZES = Object.freeze(['sm', 'md', 'lg', 'xl']);

export const INSI_PROPS = Object.freeze([
  'chair_laptop',
  'magician_wand',
  'ai_power_core',
  'audio_deck',
  'chart_holo',
  'coffee_chair',
  'security_shield',
  'legal_gavel',
  'flex_muscles'
]);

/**
 * Autonomous Virus, Malware, Hacking, XSS & Developer Legal/Compliance Scanner
 * Inspects uploaded files, dataset cells, and user queries in real time with zero external API keys.
 */
export function scanDatasetAndInputSecurity({
  rows = [],
  fields = [],
  rawText = '',
  fileName = ''
} = {}) {
  const threatsFound = [];
  const legalFlags = [];

  const cleanFileName = String(fileName || '').toLowerCase();
  if (/\.(exe|bat|cmd|vbs|scr|ps1|sh|dll|msi|apk|jar)(\.[a-z0-9]+)?$/i.test(cleanFileName)) {
    threatsFound.push(`Suspicious executable file signature detected in "${fileName}"`);
  }

  const inspectString = (str, locationLabel) => {
    const val = String(str || '');
    if (!val) return;
    if (/<script\b|javascript:|onerror\s*=|onload\s*=|eval\s*\(|document\.cookie/i.test(val)) {
      threatsFound.push(`XSS / Script injection payload blocked in ${locationLabel}`);
    }
    if (/^[=+\-@]\s*(?:cmd|powershell|wscript|mse|system|exec)\b/i.test(val.trim())) {
      threatsFound.push(`Spreadsheet formula malware vector blocked in ${locationLabel}`);
    }
    if (/\b(?:DROP\s+TABLE|UNION\s+SELECT|INSERT\s+INTO|DELETE\s+FROM|\$where|\$ne)\b/i.test(val)) {
      threatsFound.push(`SQL/NoSQL injection attempt detected in ${locationLabel}`);
    }
    if (/\b(?:virus|malware|trojan|ransomware|keylogger|exploit|ddos|hack_payload)\b/i.test(val)) {
      threatsFound.push(`High-risk malware/security keyword flagged in ${locationLabel}`);
    }
    // Legal, Privacy, PII & Developer Misconduct checks
    if (/\b(?:sk-[a-zA-Z0-9]{24,}|BEGIN\s+PRIVATE\s+KEY|aws_secret_access_key)\b/i.test(val)) {
      legalFlags.push(`Exposed private credential or secret key detected in ${locationLabel}`);
    }
    if (/\b(?:unlicensed_scrape|pirated|copyright_violation|illegal_dump|gdpr_breach|dpdp_violation)\b/i.test(val)) {
      legalFlags.push(`Legal / regulatory compliance trigger detected in ${locationLabel}`);
    }
  };

  if (rawText) {
    inspectString(rawText, 'input query');
  }

  for (const field of fields) {
    if (/\b(?:password|secret_key|private_key|ssn|aadhaar|credit_card_number|cvv)\b/i.test(String(field))) {
      legalFlags.push(`Unmasked sensitive PII/credential column "${field}" requires legal privacy protection`);
    }
  }

  const sampleRows = Array.isArray(rows) ? rows.slice(0, 150) : [];
  for (let i = 0; i < sampleRows.length; i += 1) {
    const row = sampleRows[i];
    if (!row || typeof row !== 'object') continue;
    for (const [k, v] of Object.entries(row)) {
      if (v === null || v === undefined) continue;
      inspectString(v, `row ${i + 1} (${k})`);
      if (threatsFound.length >= 5 && legalFlags.length >= 5) break;
    }
    if (threatsFound.length >= 5 && legalFlags.length >= 5) break;
  }

  if (threatsFound.length > 0) {
    return {
      status: 'malware_alert',
      riskLevel: 'HIGH',
      threatsFound: [...new Set(threatsFound)].slice(0, 4),
      legalFlags: [...new Set(legalFlags)].slice(0, 4),
      state: 'malware_alert',
      prop: 'security_shield',
      auraColor: '#FF3B5C'
    };
  }

  if (legalFlags.length > 0) {
    return {
      status: 'legal_alert',
      riskLevel: 'MODERATE',
      threatsFound: [],
      legalFlags: [...new Set(legalFlags)].slice(0, 4),
      state: 'legal_alert',
      prop: 'legal_gavel',
      auraColor: '#FFB800'
    };
  }

  return {
    status: 'clean',
    riskLevel: 'SAFE',
    threatsFound: [],
    legalFlags: [],
    state: 'security_pass',
    prop: 'security_shield',
    auraColor: '#00FF88'
  };
}

export function mapReactionToState(reactionType, customMessage = '') {
  const key = String(reactionType || '').toLowerCase().trim();
  switch (key) {
    case 'malware':
    case 'virus':
    case 'hack':
    case 'malware_alert':
      return {
        state: 'malware_alert',
        prop: 'security_shield',
        size: 'lg',
        auraColor: '#FF3B5C',
        message: customMessage || 'High-risk malware or injection attempt blocked!',
        durationMs: 6000,
        sound: 'error'
      };
    case 'legal':
    case 'compliance':
    case 'misconduct':
    case 'legal_alert':
      return {
        state: 'legal_alert',
        prop: 'legal_gavel',
        size: 'lg',
        auraColor: '#FFB800',
        message: customMessage || 'Developer compliance or PII privacy alert flagged.',
        durationMs: 5800,
        sound: 'error'
      };
    case 'security_scan':
    case 'security_pass':
      return {
        state: 'security_pass',
        prop: 'security_shield',
        size: 'md',
        auraColor: '#00FF88',
        message: customMessage || 'Zero-trust security scan clean.',
        durationMs: 4600,
        sound: 'celebrate'
      };
    case 'flex':
    case 'flexing':
      return {
        state: 'flexing',
        prop: 'flex_muscles',
        size: 'md',
        auraColor: '#00F0FF',
        message: customMessage || '',
        durationMs: 4800,
        sound: 'celebrate'
      };
    case 'roam':
    case 'roaming_heading':
      return {
        state: 'roaming_heading',
        prop: 'chair_laptop',
        size: 'sm',
        corner: 'heading-perch',
        auraColor: '#00F0FF',
        message: customMessage || '',
        durationMs: 5600,
        sound: 'appear'
      };
    case 'pull':
    case 'pulling_dashboard':
      return {
        state: 'pulling_dashboard',
        prop: 'flex_muscles',
        size: 'md',
        corner: 'kpi-perch',
        auraColor: '#A855F7',
        message: customMessage || '',
        durationMs: 5200,
        sound: 'appear'
      };
    case 'error':
    case 'validation_error':
      return {
        state: 'confused',
        prop: 'chair_laptop',
        size: 'md',
        auraColor: '#FF3B5C',
        message: customMessage || "Oops! Let's try again.",
        durationMs: 4200,
        sound: 'error'
      };
    case 'data_import':
    case 'magic_import':
      return {
        state: 'magic_import',
        prop: 'magician_wand',
        size: 'lg',
        auraColor: '#00FF88',
        message: customMessage || 'Data successfully imported!',
        durationMs: 5400,
        sound: 'celebrate'
      };
    case 'success':
    case 'import_success':
      return {
        state: 'celebrating',
        prop: 'magician_wand',
        size: 'lg',
        auraColor: '#00FF88',
        message: customMessage || 'Data successfully imported!',
        durationMs: 5200,
        sound: 'celebrate'
      };
    case 'heavy_ai':
    case 'ai_task':
    case 'summary':
    case 'loading':
    case 'processing':
      return {
        state: 'heavy_ai',
        prop: 'ai_power_core',
        size: 'xl',
        auraColor: '#A855F7',
        message: customMessage || 'Performing heavy AI computation…',
        durationMs: 5600,
        sound: 'appear'
      };
    case 'audio':
    case 'voice':
    case 'audio_sync':
    case 'music':
      return {
        state: 'audio_sync',
        prop: 'audio_deck',
        size: 'lg',
        auraColor: '#00F0FF',
        message: customMessage || 'Syncing with audio wave…',
        durationMs: 6000,
        sound: 'celebrate'
      };
    case 'charts_ready':
    case 'viewing_charts':
    case 'dashboard_generated':
      return {
        state: 'viewing_charts',
        prop: 'chart_holo',
        size: 'md',
        auraColor: '#00F0FF',
        message: customMessage || 'Charts & KPIs synchronized!',
        durationMs: 4600,
        sound: 'celebrate'
      };
    case 'export':
    case 'exporting':
      return {
        state: 'exporting',
        prop: 'chair_laptop',
        size: 'md',
        auraColor: '#00FF88',
        message: customMessage || 'Exporting dataset report…',
        durationMs: 4500,
        sound: 'celebrate'
      };
    case 'signin':
    case 'auth':
    case 'greeting':
      return {
        state: 'waving',
        prop: 'chair_laptop',
        size: 'md',
        auraColor: '#00F0FF',
        message: customMessage || 'Welcome back! Session ready.',
        durationMs: 4600,
        sound: 'celebrate',
        corner: 'top-right'
      };
    case 'empty':
      return {
        state: 'sleeping',
        prop: 'chair_laptop',
        size: 'sm',
        auraColor: '#FFB800',
        message: customMessage || 'No matching rows right now… zzz',
        durationMs: 5200,
        sound: 'snore'
      };
    case 'navigation':
    case 'quota':
      return {
        state: 'observing',
        prop: 'chart_holo',
        size: 'sm',
        auraColor: '#00F0FF',
        message: customMessage || 'Observing workspace module…',
        durationMs: 3800,
        sound: 'appear'
      };
    default:
      return {
        state: INSI_STATES.includes(key) ? key : 'observing',
        prop: 'chair_laptop',
        size: 'md',
        auraColor: '#00F0FF',
        message: customMessage || 'insi.ai · Watching your dashboard',
        durationMs: 4200,
        sound: 'appear'
      };
  }
}

/**
 * Separated Autonomous AI Task Execution Engine
 */
export function createAutonomousTaskEngine() {
  const registeredCapabilities = new Map([
    ['context_assistance', { enabled: true, requiresConfirmation: false }],
    ['natural_language', { enabled: true, requiresConfirmation: false }],
    ['data_analysis', { enabled: true, requiresConfirmation: false }],
    ['dashboard_navigation', { enabled: true, requiresConfirmation: true }],
    ['report_generation', { enabled: true, requiresConfirmation: true }],
    ['automated_workflows', { enabled: true, requiresConfirmation: true }],
    ['intelligent_recommendations', { enabled: true, requiresConfirmation: false }],
    ['voice_interaction', { enabled: true, requiresConfirmation: false }],
    ['multilingual_communication', { enabled: true, requiresConfirmation: false }],
    ['authorized_task_execution', { enabled: true, requiresConfirmation: true }]
  ]);

  return {
    getCapabilities() {
      return Array.from(registeredCapabilities.entries()).map(([id, cfg]) => ({
        id,
        ...cfg
      }));
    },
    checkPermission(capabilityId, userAuthorized = false) {
      const cap = registeredCapabilities.get(capabilityId);
      if (!cap || !cap.enabled) {
        return { allowed: false, reason: 'Capability is not registered or enabled.' };
      }
      if (cap.requiresConfirmation && !userAuthorized) {
        return {
          allowed: false,
          requiresConfirmation: true,
          reason: 'Explicit user confirmation is required before executing this action.'
        };
      }
      return { allowed: true, requiresConfirmation: cap.requiresConfirmation };
    },
    async executeAuthorizedTask(capabilityId, taskFn, { userConfirmed = false } = {}) {
      const check = this.checkPermission(capabilityId, userConfirmed);
      if (!check.allowed) {
        return { executed: false, ...check };
      }
      if (typeof taskFn !== 'function') {
        return { executed: false, reason: 'No task handler provided.' };
      }
      const result = await taskFn();
      return { executed: true, capabilityId, result };
    }
  };
}

/**
 * Event-driven animation controller (`insi`)
 */
export function createInsiController(dispatchFn) {
  let cornerIndex = 0;
  let sizeIndex = 1;

  let currentState = {
    visible: false,
    state: 'idle',
    prop: 'chair_laptop',
    size: 'md',
    auraColor: '#00F0FF',
    message: '',
    corner: 'bottom-right'
  };

  const notify = (patch) => {
    currentState = { ...currentState, ...patch, updatedAt: Date.now() };
    if (typeof dispatchFn === 'function') {
      dispatchFn(currentState);
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('insi:state', { detail: currentState }));
      } catch {}
    }
    return currentState;
  };

  const transitionTo = (stateName, message = '', options = {}) => {
    const validState = INSI_STATES.includes(stateName) ? stateName : 'idle';
    cornerIndex = (cornerIndex + 1) % INSI_CORNERS.length;
    sizeIndex = (sizeIndex + 1) % INSI_SIZES.length;

    const nextCorner =
      options.corner && INSI_CORNERS.includes(options.corner)
        ? options.corner
        : INSI_CORNERS[cornerIndex];

    const nextSize =
      options.size && INSI_SIZES.includes(options.size)
        ? options.size
        : INSI_SIZES[sizeIndex];

    return notify({
      visible: options.visible !== undefined ? Boolean(options.visible) : true,
      state: validState,
      prop: options.prop || 'chair_laptop',
      size: nextSize,
      auraColor: options.auraColor || '#00F0FF',
      message: String(message || ''),
      corner: nextCorner,
      durationMs: Number(options.durationMs) || 4600,
      sound: options.sound || 'appear'
    });
  };

  const autonomousEngine = createAutonomousTaskEngine();

  return {
    brand: INSI_BRAND,
    states: INSI_STATES,
    autonomousEngine,
    getState() {
      return { ...currentState };
    },
    appear(options = {}) {
      return transitionTo(options.state || 'idle', options.message || '', {
        ...options,
        visible: true,
        sound: 'appear'
      });
    },
    disappear() {
      return notify({ visible: false, sound: 'disappear' });
    },
    idle(message = '') {
      return transitionTo('idle', message, { prop: 'chair_laptop', size: 'md' });
    },
    greet(message = '') {
      return transitionTo('greeting', message, { prop: 'chair_laptop', size: 'md' });
    },
    wave(message = '') {
      return transitionTo('waving', message, { prop: 'chair_laptop', size: 'md' });
    },
    sleep(message = '') {
      return transitionTo('sleeping', message, { prop: 'chair_laptop', size: 'sm', durationMs: 6500, sound: 'snore' });
    },
    wake(message = '') {
      return transitionTo('surprised', message, { prop: 'chair_laptop', size: 'md', durationMs: 3600, sound: 'appear' });
    },
    think(message = '') {
      return transitionTo('thinking', message, { prop: 'ai_power_core', size: 'lg', durationMs: 5200 });
    },
    heavyAi(message = '') {
      return transitionTo('heavy_ai', message, { prop: 'ai_power_core', size: 'xl', auraColor: '#A855F7', durationMs: 5800 });
    },
    magicImport(message = '') {
      return transitionTo('magic_import', message, { prop: 'magician_wand', size: 'lg', auraColor: '#00FF88', durationMs: 5400, sound: 'celebrate' });
    },
    audioSync(message = '') {
      return transitionTo('audio_sync', message, { prop: 'audio_deck', size: 'lg', auraColor: '#00F0FF', durationMs: 6200, sound: 'celebrate' });
    },
    viewCharts(message = '') {
      return transitionTo('viewing_charts', message, { prop: 'chart_holo', size: 'md', durationMs: 4500 });
    },
    read(message = '') {
      return transitionTo('reading', message, { prop: 'chair_laptop', size: 'md' });
    },
    drink(message = '') {
      return transitionTo('drinking', message, { prop: 'coffee_chair', size: 'md' });
    },
    dance(message = '') {
      return transitionTo('dancing', message, { prop: 'audio_deck', size: 'lg', sound: 'celebrate' });
    },
    flex(message = '') {
      return transitionTo('flexing', message, { prop: 'flex_muscles', size: 'md', auraColor: '#00F0FF', sound: 'celebrate', durationMs: 5000 });
    },
    roamHeading(message = '') {
      return transitionTo('roaming_heading', message, { prop: 'chair_laptop', size: 'sm', corner: 'heading-perch', durationMs: 6000 });
    },
    pullDashboard(message = '') {
      return transitionTo('pulling_dashboard', message, { prop: 'flex_muscles', size: 'md', corner: 'kpi-perch', auraColor: '#A855F7', durationMs: 5200 });
    },
    malwareAlert(message = '') {
      return transitionTo('malware_alert', message, { prop: 'security_shield', size: 'lg', auraColor: '#FF3B5C', sound: 'error', durationMs: 6400 });
    },
    legalAlert(message = '') {
      return transitionTo('legal_alert', message, { prop: 'legal_gavel', size: 'lg', auraColor: '#FFB800', sound: 'error', durationMs: 6000 });
    },
    securityPass(message = '') {
      return transitionTo('security_pass', message, { prop: 'security_shield', size: 'md', auraColor: '#00FF88', sound: 'celebrate', durationMs: 4800 });
    },
    scanSecurity(payload = {}) {
      const report = scanDatasetAndInputSecurity(payload);
      transitionTo(report.state, '', {
        prop: report.prop,
        size: report.status === 'clean' ? 'md' : 'lg',
        auraColor: report.auraColor,
        sound: report.status === 'clean' ? 'celebrate' : 'error',
        durationMs: report.status === 'clean' ? 4600 : 6200
      });
      return report;
    },
    celebrate(message = '') {
      return transitionTo('celebrating', message, { prop: 'magician_wand', size: 'lg', auraColor: '#00FF88', durationMs: 5200, sound: 'celebrate' });
    },
    type(message = '') {
      return transitionTo('typing', message, { prop: 'chair_laptop', size: 'md' });
    },
    observe(message = '') {
      return transitionTo('observing', message, { prop: 'chart_holo', size: 'sm' });
    },
    walk(message = '') {
      return transitionTo('walking', message, { prop: 'chair_laptop', size: 'md' });
    },
    confuse(message = '') {
      return transitionTo('confused', message, { prop: 'chair_laptop', size: 'md', auraColor: '#FF3B5C', sound: 'error' });
    },
    surprise(message = '') {
      return transitionTo('surprised', message, { prop: 'chair_laptop', size: 'lg' });
    },
    smile(message = '') {
      return transitionTo('happy', message, { prop: 'chair_laptop', size: 'md' });
    },
    react(type, customMessage = '') {
      const mapped = mapReactionToState(type, customMessage);
      return transitionTo(mapped.state, mapped.message, {
        prop: mapped.prop,
        size: mapped.size,
        auraColor: mapped.auraColor,
        durationMs: mapped.durationMs,
        sound: mapped.sound,
        corner: mapped.corner
      });
    },
    applyMascotState(mascotState = {}) {
      const anim = String(mascotState?.animation || 'idle_prompt');
      const auraColor = mascotState?.aura_color || '#00F0FF';
      if (anim === 'slide_out') {
        return notify({ visible: false, auraColor, sound: 'disappear' });
      }
      const mapping = {
        celebrate_sparkles: { state: 'celebrating', prop: 'magician_wand', size: 'lg', sound: 'celebrate', durationMs: 5600 },
        thinking_pulse: { state: 'heavy_ai', prop: 'ai_power_core', size: 'xl', sound: 'appear', durationMs: 5600 },
        alert_glow: { state: 'malware_alert', prop: 'security_shield', size: 'lg', sound: 'error', durationMs: 5400 },
        export_complete: { state: 'exporting', prop: 'chair_laptop', size: 'md', sound: 'celebrate', durationMs: 5000 },
        nod_confirm: { state: 'viewing_charts', prop: 'chart_holo', size: 'md', sound: 'appear', durationMs: 4800 },
        slide_in: { state: 'waving', prop: 'chair_laptop', size: 'md', sound: 'appear', durationMs: 4800 },
        idle_prompt: { state: 'idle', prop: 'chair_laptop', size: 'md', sound: 'appear', durationMs: 4600 }
      }[anim] || { state: 'viewing_charts', prop: 'chart_holo', size: 'md', sound: 'appear', durationMs: 4800 };

      return transitionTo(mapping.state, '', {
        ...mapping,
        auraColor
      });
    }
  };
}

export const insi = createInsiController();

if (typeof window !== 'undefined') {
  window.insi = insi;
  window.insiAi = insi;
}
