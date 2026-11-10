// insi.ai — Event-Driven Mascot Animation Controller & Separated Autonomous AI Architecture
// Pure human feelings, expressions, props, sizes, and non-blocking corner placements (Zero text below mascot)

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
  'exporting'
]);

export const INSI_CORNERS = Object.freeze([
  'bottom-right',
  'bottom-left',
  'top-right',
  'mid-right',
  'top-left',
  'mid-left'
]);

export const INSI_SIZES = Object.freeze(['sm', 'md', 'lg', 'xl']);

export const INSI_PROPS = Object.freeze([
  'chair_laptop',
  'magician_wand',
  'ai_power_core',
  'audio_deck',
  'chart_holo',
  'coffee_chair'
]);

export function mapReactionToState(reactionType, customMessage = '') {
  const key = String(reactionType || '').toLowerCase().trim();
  switch (key) {
    case 'error':
    case 'validation_error':
      return {
        state: 'confused',
        prop: 'chair_laptop',
        size: 'md',
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
        message: customMessage || 'Observing workspace module…',
        durationMs: 3800,
        sound: 'appear'
      };
    default:
      return {
        state: INSI_STATES.includes(key) ? key : 'observing',
        prop: 'chair_laptop',
        size: 'md',
        message: customMessage || 'insi.ai · Watching your dashboard',
        durationMs: 4200,
        sound: 'appear'
      };
  }
}

/**
 * Separated Autonomous AI Task Execution Engine
 * Strictly decoupled from the visual mascot animation engine.
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
      return transitionTo('heavy_ai', message, { prop: 'ai_power_core', size: 'xl', durationMs: 5800 });
    },
    magicImport(message = '') {
      return transitionTo('magic_import', message, { prop: 'magician_wand', size: 'lg', durationMs: 5400, sound: 'celebrate' });
    },
    audioSync(message = '') {
      return transitionTo('audio_sync', message, { prop: 'audio_deck', size: 'lg', durationMs: 6200, sound: 'celebrate' });
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
    celebrate(message = '') {
      return transitionTo('celebrating', message, { prop: 'magician_wand', size: 'lg', durationMs: 5200, sound: 'celebrate' });
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
      return transitionTo('confused', message, { prop: 'chair_laptop', size: 'md', sound: 'error' });
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
        durationMs: mapped.durationMs,
        sound: mapped.sound,
        corner: mapped.corner
      });
    }
  };
}

export const insi = createInsiController();

if (typeof window !== 'undefined') {
  window.insi = insi;
  window.insiAi = insi;
}
