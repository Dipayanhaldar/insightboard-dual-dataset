import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './InsiPetBot.css';
import {
  insi,
  INSI_CORNERS,
  INSI_SIZES,
  INSI_STATES,
  DEFAULT_INSI_COMMAND_ROUTER,
  matchLocalCommandRouter
} from './insiController.js';
import {
  normalizeSpeechTranscript,
  detectWakeWordAndCommand,
  executeInsiCommand
} from './insiOperatorEngine.js';
import {
  playInsiAppear,
  playInsiChime,
  playInsiDisappear,
  playInsiSnore
} from './uiSound.js';

const DOVE_IMAGE_URL = '/assets/aistudio/rock-dove-columbidae-bird-ai-generated-free-png_0065e921.webp';
const ROUTER_STORAGE_KEY = 'insightboard_insi_command_router_v1';

const CORNER_POSITIONS = {
  'bottom-right': { bottom: '78px', right: '22px', top: 'auto', left: 'auto' },
  'bottom-left': { bottom: '28px', left: '22px', top: 'auto', right: 'auto' },
  'top-right': { top: '68px', right: '24px', bottom: 'auto', left: 'auto' },
  'mid-right': { bottom: '195px', right: '18px', top: 'auto', left: 'auto' },
  'top-left': { top: '68px', left: '24px', bottom: 'auto', right: 'auto' },
  'mid-left': { bottom: '195px', left: '18px', top: 'auto', right: 'auto' },
  'heading-perch': { top: '64px', left: '34%', bottom: 'auto', right: 'auto' },
  'kpi-perch': { top: '188px', right: '26%', bottom: 'auto', left: 'auto' }
};

function loadSavedCommandRouter() {
  if (typeof window === 'undefined') return [...DEFAULT_INSI_COMMAND_ROUTER];
  try {
    const raw = window.localStorage.getItem(ROUTER_STORAGE_KEY);
    if (!raw) return [...DEFAULT_INSI_COMMAND_ROUTER];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {}
  return [...DEFAULT_INSI_COMMAND_ROUTER];
}

export default function InsiPetBot({
  rows = [],
  fields = [],
  datasetName = 'Active Dataset',
  emptyDashboard = false,
  onVoiceCommandAction
}) {
  // Visual Dove States — Invisible by default until summoned by "Hey, Inci" or command
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [animState, setAnimState] = useState('perched');
  const [activeProp, setActiveProp] = useState('chair_laptop');
  const [sizeVariant, setSizeVariant] = useState('md');
  const [auraColor, setAuraColor] = useState('#00F0FF');
  const [corner, setCorner] = useState('project-dossier-perch');
  const [doveImgFailed, setDoveImgFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Project Dossier Fixed Perch, Active Tab Perch & Cursor Motion Tracking
  const [dossierPerchCoords, setDossierPerchCoords] = useState(null);
  const [activeTabCoords, setActiveTabCoords] = useState(null);
  const [activeTabLabel, setActiveTabLabel] = useState('Project Dossier');
  const [followCursorMode, setFollowCursorMode] = useState(false);
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });
  const [pointerTrack, setPointerTrack] = useState({
    headTilt: 0,
    facingLeft: false,
    eyeX: 0,
    eyeY: 0
  });
  const [isOrbitingTask, setIsOrbitingTask] = useState(false);
  const [statusBubbleText, setStatusBubbleText] = useState('Standing on Project Dossier · Say "Hey, Inci"');

  // Assistant Panel & Local Command Router States
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('assistant'); // 'assistant' | 'router'
  const [commandInput, setCommandInput] = useState('');
  const [commandRouter, setCommandRouter] = useState(loadSavedCommandRouter);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [assistantLog, setAssistantLog] = useState([
    {
      id: 'welcome',
      kind: 'info',
      title: 'INSI Dove Assistant · Always Listening ("Hey, Inci")',
      detail:
        'Automatic browser microphone wake-word detection is active. Say "Hey, Inci" anytime to summon the dove, fly across the workspace, download reports, or switch datasets.'
    }
  ]);

  // New Route Form inside Editable Command Router
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [editingTriggersText, setEditingTriggersText] = useState('');
  const [newRouteLabel, setNewRouteLabel] = useState('');
  const [newRouteTriggers, setNewRouteTriggers] = useState('');
  const [newRouteCommand, setNewRouteCommand] = useState('');
  const [newRouteConfirm, setNewRouteConfirm] = useState(false);

  // Voice & Speech Synthesis States (Auto-enabled: requests browser mic permission automatically & always listens for "Hey, Inci")
  const speechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  // 'listening_wake' | 'requesting_permission' | 'push_to_talk' | 'permission_denied' | 'unsupported' | 'idle'
  const [voiceStatus, setVoiceStatus] = useState(() => (speechSupported ? 'listening_wake' : 'unsupported'));
  const [voiceErrorMsg, setVoiceErrorMsg] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [lastHeardTranscript, setLastHeardTranscript] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('indian_distinct_auto');

  // Refs for timers & SpeechRecognition lifecycle
  const fadeTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const orbitTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const voiceModeRef = useRef(speechSupported ? 'continuous' : 'off'); // Always 'continuous' by default when supported
  const isSpeakingRef = useRef(false);
  const voiceMutedRef = useRef(false);
  const ignoreMicUntilRef = useRef(0);
  const activeUtteranceRef = useRef(null);
  const maxSpeakTimerRef = useRef(null);
  const interimTimerRef = useRef(null);
  const lastTranscriptRef = useRef({ text: '', time: 0 });
  const lastSpokenReplyRef = useRef({ text: '', time: 0, count: 0 });
  const lastProcessedResultIdxRef = useRef(-1);
  const latestContextRef = useRef({ rows, fields, datasetName, onVoiceCommandAction });
  const commandRouterRef = useRef(commandRouter);

  useEffect(() => {
    latestContextRef.current = { rows, fields, datasetName, onVoiceCommandAction };
  }, [rows, fields, datasetName, onVoiceCommandAction]);

  useEffect(() => {
    voiceMutedRef.current = voiceMuted;
  }, [voiceMuted]);

  useEffect(() => {
    commandRouterRef.current = commandRouter;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ROUTER_STORAGE_KEY, JSON.stringify(commandRouter));
      } catch {}
    }
  }, [commandRouter]);

  const appendLog = useCallback((entry) => {
    setAssistantLog((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ...entry
      },
      ...prev.slice(0, 14)
    ]);
  }, []);

  // Load browser SpeechSynthesis voices and prioritize publicly available Indian voices (en-IN / hi-IN)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const updateVoices = () => {
      try {
        const list = window.speechSynthesis.getVoices() || [];
        setAvailableVoices(list);
      } catch {}
    };
    updateVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', updateVoices);
    };
  }, []);

  // Measure and track the fixed "Project Dossier" button AND the active workspace tab so INSI stands right on Project Dossier
  const updateActiveTabPerchPosition = useCallback(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    // 1. Measure the fixed "Project Dossier" button so INSI can stand directly on top of it
    const dossierEl =
      document.querySelector('.project-dossier-fab') ||
      document.querySelector('a[aria-label*="project dossier" i]') ||
      document.querySelector('a[href*="notion.com"]');

    if (dossierEl) {
      const dRect = dossierEl.getBoundingClientRect();
      if (dRect.width > 0 && dRect.top >= 40 && dRect.bottom <= window.innerHeight + 20) {
        const dossierLeft = Math.max(24, Math.min(window.innerWidth - 92, dRect.left + dRect.width / 2 - 41));
        const dossierTop = Math.max(12, dRect.top - 72);
        setDossierPerchCoords({
          left: `${Math.round(dossierLeft)}px`,
          top: `${Math.round(dossierTop)}px`,
          bottom: 'auto',
          right: 'auto'
        });
      }
    }

    // 2. Also measure the currently active workspace tab
    const activeTabEl = document.querySelector('.workspace-tab-btn.active');
    if (!activeTabEl) {
      setActiveTabCoords(null);
      return;
    }
    const rect = activeTabEl.getBoundingClientRect();
    if (
      window.innerWidth >= 640 &&
      rect.width > 0 &&
      rect.top >= -10 &&
      rect.bottom <= window.innerHeight + 20
    ) {
      const clampedLeft = Math.max(48, Math.min(window.innerWidth - 96, rect.right - 38));
      const clampedTop = Math.max(6, rect.top - 68);
      setActiveTabCoords({
        left: `${Math.round(clampedLeft)}px`,
        top: `${Math.round(clampedTop)}px`,
        bottom: 'auto',
        right: 'auto'
      });
      const cleanLabel = String(activeTabEl.textContent || 'Project Dossier')
        .replace(/\s+/g, ' ')
        .trim();
      setActiveTabLabel(cleanLabel);
    } else {
      setActiveTabCoords(null);
    }
  }, []);

  useEffect(() => {
    updateActiveTabPerchPosition();
    const handleLayoutUpdate = () => updateActiveTabPerchPosition();
    window.addEventListener('resize', handleLayoutUpdate, { passive: true });
    window.addEventListener('scroll', handleLayoutUpdate, { passive: true });
    const interval = setInterval(updateActiveTabPerchPosition, 1800);

    return () => {
      window.removeEventListener('resize', handleLayoutUpdate);
      window.removeEventListener('scroll', handleLayoutUpdate);
      clearInterval(interval);
    };
  }, [updateActiveTabPerchPosition]);

  // Real-Time Pointer Tracking: Dove head tilt, facing direction, and optional mouse-follow flight
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handlePointerMove = (e) => {
      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);
      const nx = (e.clientX / vw) * 2 - 1;
      const ny = (e.clientY / vh) * 2 - 1;

      setPointerTrack({
        headTilt: Math.max(-9, Math.min(9, Number((nx * 8).toFixed(2)))),
        facingLeft: nx < -0.18,
        eyeX: Math.max(-2.5, Math.min(2.5, Number((nx * 2.5).toFixed(2)))),
        eyeY: Math.max(-2.0, Math.min(2.0, Number((ny * 2.0).toFixed(2))))
      });

      if (followCursorMode && !reducedMotion) {
        setCursorCoords({
          x: Math.max(60, Math.min(vw - 90, e.clientX + 26)),
          y: Math.max(60, Math.min(vh - 110, e.clientY - 46))
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [followCursorMode, reducedMotion]);

  const clearTimers = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
  }, []);

  const scheduleFlyOffAndHide = useCallback(
    (delayMs = 6800) => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      fadeTimerRef.current = setTimeout(() => {
        // Keep visible if user currently has the assistant control panel open
        setAnimState('takeoff');
        setLeaving(true);
        playInsiDisappear();
        hideTimerRef.current = setTimeout(() => {
          setVisible(false);
          setLeaving(false);
        }, 460);
      }, delayMs);
    },
    []
  );

  const triggerTaskFlightOrbit = useCallback(
    (statusNote = 'Flying across workspace & committing task…', { autoFlyOff = true, perchTarget = 'project-dossier-perch' } = {}) => {
      clearTimers();
      setLeaving(false);
      setVisible(true);
      setStatusBubbleText(statusNote);
      updateActiveTabPerchPosition();

      if (reducedMotion) {
        setCorner(perchTarget);
        setAnimState('celebrating');
        if (orbitTimerRef.current) clearTimeout(orbitTimerRef.current);
        orbitTimerRef.current = setTimeout(() => {
          setAnimState(isListeningRef.current ? 'listening' : 'perched');
          if (autoFlyOff) scheduleFlyOffAndHide(5200);
        }, 2200);
        return;
      }

      setIsOrbitingTask(true);
      setAnimState('takeoff');
      if (orbitTimerRef.current) clearTimeout(orbitTimerRef.current);

      setTimeout(() => {
        setAnimState('orbiting');
      }, 220);

      orbitTimerRef.current = setTimeout(() => {
        setIsOrbitingTask(false);
        updateActiveTabPerchPosition();
        setCorner(perchTarget);
        setAnimState('landing');
        setTimeout(() => {
          setAnimState(isListeningRef.current ? 'listening' : 'perched');
          if (autoFlyOff) scheduleFlyOffAndHide(5800);
        }, 620);
      }, 2400);
    },
    [clearTimers, reducedMotion, scheduleFlyOffAndHide, updateActiveTabPerchPosition]
  );

  const showInsi = useCallback(
    (nextState = 'perched', options = {}) => {
      clearTimers();
      updateActiveTabPerchPosition();

      const validState = INSI_STATES.includes(nextState) ? nextState : 'perched';
      const durationMs = Number(options.durationMs) || 5200;

      const chosenCorner =
        options.corner &&
        (CORNER_POSITIONS[options.corner] ||
          options.corner === 'active-tab-perch' ||
          options.corner === 'project-dossier-perch')
          ? options.corner
          : validState === 'roaming_heading'
          ? 'heading-perch'
          : validState === 'pulling_dashboard'
          ? 'kpi-perch'
          : 'project-dossier-perch';

      const chosenSize =
        options.size && INSI_SIZES.includes(options.size) ? options.size : 'md';

      const resolvedProp =
        options.prop ||
        (validState === 'malware_alert' || validState === 'security_pass' || validState === 'security_scan'
          ? 'security_shield'
          : validState === 'legal_alert'
          ? 'legal_gavel'
          : validState === 'magic_import' || validState === 'celebrating' || validState === 'orbiting'
          ? 'magician_wand'
          : validState === 'heavy_ai' || validState === 'thinking'
          ? 'ai_power_core'
          : validState === 'audio_sync' || validState === 'dancing' || validState === 'listening' || validState === 'speaking'
          ? 'audio_deck'
          : 'chair_laptop');

      setCorner(chosenCorner);
      setSizeVariant(chosenSize);
      setActiveProp(resolvedProp);
      setAuraColor(options.auraColor || '#00F0FF');
      setAnimState(validState);
      setLeaving(false);
      setVisible(true);
      if (options.message) {
        setStatusBubbleText(options.message);
      }

      const soundType = options.sound || 'appear';
      if (soundType === 'celebrate') {
        playInsiChime('signin');
      } else if (soundType === 'error') {
        playInsiChime('error');
      } else if (soundType === 'snore') {
        playInsiSnore();
      } else {
        playInsiAppear();
      }

      if (options.autoReturnToPerch !== false) {
        stepTimerRef.current = setTimeout(() => {
          setAnimState(isListeningRef.current ? 'listening' : 'perched');
          setCorner('project-dossier-perch');
          scheduleFlyOffAndHide(4200);
        }, durationMs);
      }
    },
    [clearTimers, scheduleFlyOffAndHide, updateActiveTabPerchPosition]
  );

  /**
   * Distinct Indian Voice Output for INSI Task Completion:
   * Uses free browser Indian voices (`en-IN` / `hi-IN`) with a voice selection, pitch (1.18), and rate (1.07)
   * that is distinctly different from the "Generate Summary" voice (`GnaniVoiceStudio.jsx` uses Kaveri/default at pitch 1.0, rate 1.0).
   */
  const speakWithoutEcho = useCallback(
    (textToSpeak) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        !textToSpeak ||
        voiceMutedRef.current
      ) {
        return;
      }

      let finalSpeech = String(textToSpeak).trim();
      if (!finalSpeech) return;

      // Avoid repeating identical wording back-to-back
      if (lastSpokenReplyRef.current.text === finalSpeech) {
        lastSpokenReplyRef.current.count += 1;
        const variations = [
          `Done! ${finalSpeech.split('.').slice(1).join('.').trim() || finalSpeech}`,
          `Committed on your board. ${finalSpeech.split('.')[0]}.`,
          `INSI completed that task—your charts and metrics are updated.`
        ];
        finalSpeech = variations[lastSpokenReplyRef.current.count % variations.length];
      } else {
        lastSpokenReplyRef.current = { text: finalSpeech, time: Date.now(), count: 0 };
      }

      if (maxSpeakTimerRef.current) clearTimeout(maxSpeakTimerRef.current);
      if (interimTimerRef.current) clearTimeout(interimTimerRef.current);

      isSpeakingRef.current = true;
      setIsSpeakingState(true);
      ignoreMicUntilRef.current = Date.now() + 6500;

      const finishSpeech = () => {
        if (maxSpeakTimerRef.current) {
          clearTimeout(maxSpeakTimerRef.current);
          maxSpeakTimerRef.current = null;
        }
        isSpeakingRef.current = false;
        setIsSpeakingState(false);
        ignoreMicUntilRef.current = Date.now() + 900;
        setAnimState(isListeningRef.current ? 'listening' : 'perched');
      };

      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
        if (typeof window.speechSynthesis.resume === 'function') {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(finalSpeech);
        activeUtteranceRef.current = utterance;
        utterance.lang = 'en-IN';
        // Distinctly brighter avian assistant cadence vs the deeper formal Executive Summary voice
        utterance.pitch = 1.18;
        utterance.rate = 1.07;

        const voices = window.speechSynthesis.getVoices?.() || [];
        const indianVoices = voices.filter(
          (v) => /en[-_]IN|hi[-_]IN/i.test(v.lang) || /india|hindi|heera|swara|rishi|lekha|neerja|prabhat|google\s+हिन्दी/i.test(v.name)
        );

        let chosenVoice = null;
        if (selectedVoiceURI !== 'indian_distinct_auto') {
          chosenVoice = voices.find((v) => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI);
        }
        if (!chosenVoice) {
          // Pick the 2nd Indian voice if multiple exist so it differs from the default 1st voice used by Summary,
          // or prefer Heera / Rishi / Lekha / Google Hindi
          chosenVoice =
            indianVoices.find((v) => /rishi|heera|lekha|neerja|swara|हिन्दी/i.test(v.name)) ||
            indianVoices[1] ||
            indianVoices[0] ||
            voices.find((v) => /en[-_](GB|AU|US)/i.test(v.lang)) ||
            voices[0];
        }

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        utterance.onstart = () => {
          isSpeakingRef.current = true;
          setIsSpeakingState(true);
          ignoreMicUntilRef.current = Date.now() + 6500;
          setAnimState('speaking');
        };

        utterance.onend = finishSpeech;
        utterance.onerror = finishSpeech;

        maxSpeakTimerRef.current = setTimeout(finishSpeech, 6500);
        window.speechSynthesis.speak(utterance);
      } catch {
        finishSpeech();
      }
    },
    [selectedVoiceURI]
  );

  /**
   * Executes a verified command (after passing the local command router & confirmation check)
   */
  const executeVerifiedAction = useCallback(
    (rawCommandText, routeInfo = null, { speakReply = true } = {}) => {
      const ctx = latestContextRef.current;
      const cleanCmd = String(rawCommandText || '').trim();
      const lowerCmd = cleanCmd.toLowerCase();

      // Play crisp avian task-commit chime
      playInsiChime('signin');

      // 1. Bird motion-only routes (fly around, stand on Project Dossier, dance, magic)
      if (routeInfo?.actionType === 'bird_motion') {
        if (routeInfo.birdMotion === 'dancing') {
          showInsi('dancing', {
            prop: 'audio_deck',
            size: 'lg',
            auraColor: '#00F0FF',
            corner: 'project-dossier-perch',
            message: routeInfo.confirmationNote,
            durationMs: 5200,
            sound: 'celebrate'
          });
        } else if (routeInfo.birdMotion === 'magic_import') {
          showInsi('magic_import', {
            prop: 'magician_wand',
            size: 'lg',
            auraColor: '#00FF88',
            corner: 'project-dossier-perch',
            message: routeInfo.confirmationNote,
            durationMs: 5200,
            sound: 'celebrate'
          });
        } else if (routeInfo.birdMotion === 'perch_dossier') {
          triggerTaskFlightOrbit(routeInfo.confirmationNote, {
            autoFlyOff: true,
            perchTarget: 'project-dossier-perch'
          });
        } else {
          triggerTaskFlightOrbit(routeInfo.confirmationNote, {
            autoFlyOff: true,
            perchTarget: 'project-dossier-perch'
          });
        }
        if (speakReply && routeInfo.confirmationNote) {
          speakWithoutEcho(routeInfo.confirmationNote);
        }
        appendLog({
          kind: 'success',
          title: routeInfo.label,
          detail: routeInfo.confirmationNote
        });
        if (ctx.onVoiceCommandAction) {
          ctx.onVoiceCommandAction({
            type: 'security_scan',
            spoken: `🕊️ INSI Dove Assistant: ${routeInfo.confirmationNote}`
          });
        }
        return null;
      }

      // 2. Security Scan Route
      if (routeInfo?.actionType === 'security' || /\b(virus|malware|security\s+scan|audit\s+security)\b/.test(lowerCmd)) {
        triggerTaskFlightOrbit('Scanning dataset for malware, XSS & compliance…');
        const sec = insi.scanSecurity({ rows: ctx.rows, fields: ctx.fields });
        const spoken =
          sec.status === 'clean'
            ? `Task committed. Security scan complete across ${ctx.rows.length} records in ${ctx.datasetName}. Zero threats detected.`
            : `Security alert! Flagged ${sec.threatsFound.length + sec.legalFlags.length} potential issues.`;
        if (speakReply) speakWithoutEcho(spoken);
        appendLog({
          kind: sec.status === 'clean' ? 'success' : 'error',
          title: 'Local Zero-Trust Security Audit',
          detail: spoken
        });
        if (ctx.onVoiceCommandAction) {
          ctx.onVoiceCommandAction({ type: 'security_scan', report: sec, spoken });
        }
        return null;
      }

      // 3. Fly & orbit across active workspace while executing real dashboard action
      triggerTaskFlightOrbit(routeInfo?.confirmationNote || `Executing "${cleanCmd}"…`);

      const result = executeInsiCommand({
        rows: ctx.rows,
        fields: ctx.fields,
        datasetName: ctx.datasetName,
        command: `Hey, Inci, ${cleanCmd}`,
        activeMode: 'demo_sandbox'
      });

      const spokenNote =
        routeInfo?.confirmationNote && routeInfo.id !== 'dynamic_analytics_query'
          ? `${routeInfo.confirmationNote} ${result.voice_reply || ''}`.trim()
          : `Task committed. ${result.voice_reply || ''}`.trim();

      // When switching to Hyderabad Metro, allow the authentic Metro MP3 announcement to play clearly without TTS overlap
      if (speakReply && result.automation_plan?.switchPreset !== 'metro') {
        speakWithoutEcho(spokenNote);
      }

      appendLog({
        kind: 'success',
        title: routeInfo?.label || 'Dashboard Action Committed',
        detail: result.executive_summary?.headline || spokenNote
      });

      if (ctx.onVoiceCommandAction) {
        ctx.onVoiceCommandAction({
          type: 'automate_all',
          result,
          rawCommand: cleanCmd
        });
      }

      return result;
    },
    [appendLog, showInsi, speakWithoutEcho, triggerTaskFlightOrbit]
  );

  /**
   * Primary Command Handler for both Voice ("Hey, Inci") and Text Input:
   * 1. Normalizes speech transcript ("Hey Inci", "Hey In C I", "Wake up Inci")
   * 2. Evaluates against the Local Editable Command Router (`matchLocalCommandRouter`)
   * 3. Handles unrecognized commands honestly (never fakes or invents a completed action)
   * 4. Prompts for confirmation before consequential actions
   */
  const handleSpokenTranscript = useCallback(
    (rawTranscript, { requireWakeWord = false, speakReply = true, bypassConfirmation = false } = {}) => {
      if ((isSpeakingRef.current || Date.now() < ignoreMicUntilRef.current) && requireWakeWord) {
        return null;
      }

      const normalized = normalizeSpeechTranscript(rawTranscript);
      if (!normalized || normalized.length < 2) return null;
      if (/^(?:uh+|um+|hm+|ah+|er+|oh+)$/i.test(normalized)) return null;

      const now = Date.now();
      const lowerNorm = normalized.toLowerCase();

      // Deduplicate identical STT transcripts within 2.5s
      if (
        requireWakeWord &&
        lastTranscriptRef.current.text.toLowerCase() === lowerNorm &&
        now - lastTranscriptRef.current.time < 2500
      ) {
        return null;
      }

      const wake = detectWakeWordAndCommand(normalized);
      if (requireWakeWord && !wake.wakeWordDetected) {
        return null;
      }

      lastTranscriptRef.current = { text: normalized, time: now };
      setLastHeardTranscript(normalized);

      const strippedCmd = (wake.wakeWordDetected ? wake.cleanCommand : normalized).trim();
      const ctx = latestContextRef.current;

      // Check bare wake greeting ("Hey Inci", "Hey In C I", "Wake up Inci", "Are you listening")
      if (
        /^(?:give me an executive overview of the active dataset|wake\s+up.*|hey.*|insi|are\s+you\s+listening.*|can\s+you\s+hear\s+me.*|hello|hi)$/i.test(
          strippedCmd
        ) &&
        !/\b(metro|mall|top|bottom|chart|table|export|pdf|excel|csv|calendar|dark|light|filter|reset|delete|pizza|email|dance|magic|fly)\b/i.test(
          normalized.replace(/hey[,\s]*insi/i, '')
        )
      ) {
        triggerTaskFlightOrbit('Awake & flying across your active workspace!');
        const wakeReply = `Inci is awake and perched on your ${activeTabLabel} tab with ${ctx.rows.length} records in ${ctx.datasetName}. Say "Hey, Inci, switch to Hyderabad Metro", "Highlight top 3 leaders", or "Open data table".`;
        if (speakReply) speakWithoutEcho(wakeReply);
        appendLog({
          kind: 'info',
          title: `Wake Phrase Recognized ("${wake.matchedWakePhrase || 'Hey, Inci'}")`,
          detail: wakeReply
        });
        if (ctx.onVoiceCommandAction) {
          ctx.onVoiceCommandAction({
            type: 'security_scan',
            spoken: `🕊️ Inci Awake ("${normalized}"): ${wakeReply}`
          });
        }
        return null;
      }

      // Evaluate against the Local Editable Command Router
      const routerMatch = matchLocalCommandRouter(strippedCmd, commandRouterRef.current);

      // Honest Unrecognized Request Handling — NEVER invent a completed action!
      if (!routerMatch.recognized) {
        playInsiChime('error');
        showInsi('confused', {
          prop: 'chair_laptop',
          size: 'md',
          auraColor: '#FFB800',
          message: 'Unrecognized or unsupported action — see INSI panel',
          durationMs: 4800,
          sound: 'error'
        });
        setPanelOpen(true);
        appendLog({
          kind: 'honest_unrecognized',
          title: `Cannot Perform: "${strippedCmd}"`,
          detail: routerMatch.honestReason
        });
        if (speakReply) {
          speakWithoutEcho(
            `I cannot perform "${strippedCmd}" because InsightBoard does not support that action. I only run real dashboard actions like switching datasets, filtering charts, or exporting reports.`
          );
        }
        if (ctx.onVoiceCommandAction) {
          ctx.onVoiceCommandAction({
            type: 'security_scan',
            spoken: `⚠️ INSI Honest Notice: ${routerMatch.honestReason}`
          });
        }
        return null;
      }

      // Consequential Action Confirmation Gate — Ask before resetting, deleting, clearing, etc.
      if (routerMatch.requiresConfirmation && !bypassConfirmation) {
        playInsiAppear();
        showInsi('thinking', {
          prop: 'security_shield',
          size: 'md',
          auraColor: '#FFB800',
          message: 'Confirmation needed before executing action',
          durationMs: 6000
        });
        setPanelOpen(true);
        setPendingConfirmation({
          rawTranscript: normalized,
          cleanCommand: routerMatch.cleanCommand,
          route: routerMatch.route,
          prompt: routerMatch.confirmationPrompt
        });
        const confirmSpeech = `Please confirm in the INSI panel before I execute: ${routerMatch.route?.label || routerMatch.cleanCommand}.`;
        if (speakReply) speakWithoutEcho(confirmSpeech);
        appendLog({
          kind: 'warning',
          title: `Confirmation Required: ${routerMatch.route?.label || 'Consequential Action'}`,
          detail: routerMatch.confirmationPrompt
        });
        return null;
      }

      // Execute verified local command
      return executeVerifiedAction(routerMatch.cleanCommand, routerMatch.route, { speakReply });
    },
    [activeTabLabel, appendLog, executeVerifiedAction, showInsi, speakWithoutEcho, triggerTaskFlightOrbit]
  );

  /**
   * Starts and maintains persistent browser SpeechRecognition so the website and integrated AI
   * ALWAYS listen for "Hey, Inci" automatically with auto browser mic permission.
   */
  const startExplicitVoiceSession = useCallback(
    async (mode = 'continuous', { silent = false } = {}) => {
      if (typeof window === 'undefined') return;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setVoiceStatus('unsupported');
        return;
      }

      setVoiceErrorMsg('');
      voiceModeRef.current = mode === 'off' ? 'continuous' : mode;
      try {
        window.localStorage.setItem('insightboard_insi_voice_enabled', 'true');
      } catch {}

      // Auto-request browser microphone permission so the user doesn't have to click an Enable Voice button
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && !isListeningRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          // Release probe stream immediately so SpeechRecognition has clean access to the microphone
          stream.getTracks().forEach((t) => t.stop());
        } catch (err) {
          const errName = String(err?.name || '');
          if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
            setVoiceStatus('permission_denied');
            if (!silent) {
              setVoiceErrorMsg(
                'Browser microphone permission is blocked. Please allow microphone access in the browser address bar so INSI can hear "Hey, Inci".'
              );
            }
            return;
          }
        }
      }

      const launchRecognitionInstance = () => {
        if (voiceModeRef.current === 'off') {
          voiceModeRef.current = 'continuous';
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onresult = null;
            recognitionRef.current.abort();
          } catch {}
          recognitionRef.current = null;
        }

        try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'en-IN';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 5;

          recognition.onstart = () => {
            isListeningRef.current = true;
            lastProcessedResultIdxRef.current = -1;
            setVoiceStatus(voiceModeRef.current === 'ptt' ? 'push_to_talk' : 'listening_wake');
            setStatusBubbleText(
              voiceModeRef.current === 'ptt'
                ? 'Speak your command now…'
                : 'Listening for "Hey, Inci"…'
            );
          };

          recognition.onresult = (event) => {
            const now = Date.now();
            const mutedForSelfSpeech = isSpeakingRef.current || now < ignoreMicUntilRef.current;

            for (let i = event.resultIndex; i < event.results.length; i += 1) {
              if (i <= lastProcessedResultIdxRef.current) continue;
              const res = event.results[i];
              if (!res) continue;

              if (mutedForSelfSpeech) {
                if (res.isFinal) {
                  lastProcessedResultIdxRef.current = i;
                }
                continue;
              }

              const alternatives = [];
              for (let a = 0; a < res.length; a += 1) {
                const t = String(res[a]?.transcript || '').trim();
                if (t) alternatives.push(t);
              }
              if (!alternatives.length) continue;

              const matchedAlt = alternatives.find((alt) => detectWakeWordAndCommand(alt).wakeWordDetected);
              const chosenTranscript = matchedAlt || alternatives[0];
              if (!chosenTranscript) continue;

              setLastHeardTranscript(normalizeSpeechTranscript(chosenTranscript));

              if (res.isFinal) {
                if (interimTimerRef.current) {
                  clearTimeout(interimTimerRef.current);
                  interimTimerRef.current = null;
                }
                lastProcessedResultIdxRef.current = i;
                const isPtt = voiceModeRef.current === 'ptt';
                handleSpokenTranscript(chosenTranscript, {
                  requireWakeWord: !isPtt,
                  speakReply: true
                });
                if (isPtt) {
                  voiceModeRef.current = 'continuous';
                  setVoiceStatus('listening_wake');
                }
              } else {
                if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
                const settledIdx = i;
                const settledText = chosenTranscript;
                interimTimerRef.current = setTimeout(() => {
                  interimTimerRef.current = null;
                  if (
                    !isSpeakingRef.current &&
                    Date.now() >= ignoreMicUntilRef.current &&
                    settledIdx > lastProcessedResultIdxRef.current
                  ) {
                    lastProcessedResultIdxRef.current = settledIdx;
                    const isPtt = voiceModeRef.current === 'ptt';
                    handleSpokenTranscript(settledText, {
                      requireWakeWord: !isPtt,
                      speakReply: true
                    });
                    if (isPtt) {
                      voiceModeRef.current = 'continuous';
                      setVoiceStatus('listening_wake');
                    }
                  }
                }, 650);
              }
            }
          };

          recognition.onerror = (err) => {
            const errCode = String(err?.error || '');
            isListeningRef.current = false;
            recognitionRef.current = null;

            if (errCode === 'aborted' || errCode === 'no-speech') {
              return;
            }
            if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
              setVoiceStatus('permission_denied');
            }
          };

          recognition.onend = () => {
            isListeningRef.current = false;
            lastProcessedResultIdxRef.current = -1;
            recognitionRef.current = null;
            // Always auto-restart continuous wake-word listening while the site is open
            setTimeout(() => {
              if (voiceModeRef.current !== 'off' && !isListeningRef.current) {
                launchRecognitionInstance();
              }
            }, 240);
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch {
          isListeningRef.current = false;
          recognitionRef.current = null;
        }
      };

      launchRecognitionInstance();
      if (!silent) {
        appendLog({
          kind: 'info',
          title: mode === 'ptt' ? 'Instant Command Listening Active' : 'Always-On "Hey, Inci" Listener Active',
          detail:
            mode === 'ptt'
              ? 'Speak your command now—no wake phrase required.'
              : 'Automatically listening while the website is open. Say "Hey, Inci" followed by your command.'
        });
      }
    },
    [appendLog, handleSpokenTranscript]
  );

  // Automatic Browser Microphone Permission & Persistent Always-On "Hey, Inci" Wake-Word Engine:
  // 1. Immediately requests microphone permission and starts continuous listening on mount.
  // 2. Automatically unlocks/resumes on any user interaction, tab focus, or visibility change.
  // 3. Keeps a lightweight watchdog interval so "Hey, Inci" never stops listening.
  useEffect(() => {
    if (typeof window === 'undefined' || !speechSupported) return undefined;
    let cancelled = false;

    const ensureListeningActive = () => {
      if (cancelled || isListeningRef.current) return;
      voiceModeRef.current = 'continuous';
      void startExplicitVoiceSession('continuous', { silent: true });
    };

    // 1. Immediate auto-start on load
    ensureListeningActive();

    // 2. Auto-resume on any interaction or focus event (bypasses browser gesture deferral)
    const onUserActivity = () => {
      if (!isListeningRef.current) {
        ensureListeningActive();
      }
    };

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && !isListeningRef.current) {
        ensureListeningActive();
      }
    };

    window.addEventListener('pointerdown', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });
    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('focus', onVisibilityOrFocus, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityOrFocus, { passive: true });

    // 3. Watchdog timer to keep "Hey, Inci" always active while the page is open
    const watchdog = setInterval(() => {
      if (!cancelled && document.visibilityState === 'visible' && !isListeningRef.current) {
        ensureListeningActive();
      }
    }, 3500);

    return () => {
      cancelled = true;
      clearInterval(watchdog);
      window.removeEventListener('pointerdown', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('touchstart', onUserActivity);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [speechSupported, startExplicitVoiceSession]);

  // Clean up SpeechRecognition on unmount
  useEffect(() => {
    return () => {
      voiceModeRef.current = 'off';
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {}
      }
      if (orbitTimerRef.current) clearTimeout(orbitTimerRef.current);
      if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
      if (maxSpeakTimerRef.current) clearTimeout(maxSpeakTimerRef.current);
    };
  }, []);

  // Expose global helpers (`window.insiSpeak`, `window.insiExecuteCommand`, `window.insiWakeUp`)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.insiSpeak = speakWithoutEcho;
      window.insiExecuteCommand = (cmdText, opts = {}) =>
        handleSpokenTranscript(cmdText, { requireWakeWord: false, speakReply: true, ...opts });
      window.insiWakeUp = () => {
        setPanelOpen(true);
        triggerTaskFlightOrbit('INSI Dove Assistant Ready!');
      };
    }
  }, [handleSpokenTranscript, speakWithoutEcho, triggerTaskFlightOrbit]);

  // Subscribe to `insi` controller events & legacy `insi:summon` events
  useEffect(() => {
    const onControllerState = (event) => {
      const detail = event?.detail;
      if (!detail) return;
      queueMicrotask(() => {
        if (detail.visible === false) {
          clearTimers();
          setLeaving(true);
          playInsiDisappear();
          hideTimerRef.current = setTimeout(() => {
            setVisible(false);
            setLeaving(false);
          }, 500);
          return;
        }
        showInsi(detail.state || 'perched', {
          prop: detail.prop,
          size: detail.size,
          auraColor: detail.auraColor,
          durationMs: detail.durationMs,
          corner: detail.corner,
          sound: detail.sound,
          message: detail.message
        });
      });
    };

    const onLegacySummon = (event) => {
      const action = String(event?.detail?.action || '').toLowerCase();
      if (action === 'signin') {
        insi.react('signin');
      } else if (action === 'dataset') {
        triggerTaskFlightOrbit('Dataset synchronized · Flying over active charts');
      } else if (action === 'voice' || action === 'audio') {
        insi.react('audio_sync');
      } else if (action === 'quota') {
        insi.react('quota');
      } else if (action === 'error') {
        insi.react('error');
      } else if (action === 'malware') {
        insi.malwareAlert();
      } else if (action === 'legal') {
        insi.legalAlert();
      } else if (action === 'success' || action === 'import') {
        insi.react('data_import');
      } else if (action === 'ai' || action === 'heavy_ai') {
        insi.react('heavy_ai');
      } else {
        insi.observe();
      }
    };

    window.addEventListener('insi:state', onControllerState);
    window.addEventListener('insi:summon', onLegacySummon);

    return () => {
      window.removeEventListener('insi:state', onControllerState);
      window.removeEventListener('insi:summon', onLegacySummon);
    };
  }, [clearTimers, showInsi, triggerTaskFlightOrbit]);

  // Keyboard accessibility: Alt+I toggles INSI Assistant Panel; Escape closes panel
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        setPanelOpen((prev) => !prev);
      } else if (e.key === 'Escape' && panelOpen) {
        setPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panelOpen]);

  useEffect(() => {
    if (emptyDashboard) {
      insi.react('empty');
    }
  }, [emptyDashboard]);

  // Handle text command form submit
  const handleCommandFormSubmit = (e) => {
    e.preventDefault();
    const trimmed = commandInput.trim();
    if (!trimmed) return;
    setCommandInput('');
    handleSpokenTranscript(trimmed, { requireWakeWord: false, speakReply: true });
  };

  // Handle Consequential Action Confirmation Gate
  const handleConfirmPendingAction = () => {
    if (!pendingConfirmation) return;
    const { cleanCommand, route } = pendingConfirmation;
    setPendingConfirmation(null);
    executeVerifiedAction(cleanCommand, route, { speakReply: true });
  };

  const handleCancelPendingAction = () => {
    if (!pendingConfirmation) return;
    const cancelledLabel = pendingConfirmation.route?.label || pendingConfirmation.cleanCommand;
    setPendingConfirmation(null);
    setAnimState(isListeningRef.current ? 'listening' : 'perched');
    appendLog({
      kind: 'info',
      title: 'Action Cancelled',
      detail: `Cancelled "${cancelledLabel}". No changes were made.`
    });
  };

  // Editable Command Router handlers
  const handleSaveEditedTriggers = (routeId) => {
    const triggers = editingTriggersText
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!triggers.length) return;
    setCommandRouter((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, triggers } : r))
    );
    setEditingRouteId(null);
    setEditingTriggersText('');
  };

  const handleToggleRouteConfirmation = (routeId) => {
    setCommandRouter((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, requiresConfirmation: !r.requiresConfirmation } : r))
    );
  };

  const handleAddCustomRoute = (e) => {
    e.preventDefault();
    const label = newRouteLabel.trim();
    const triggers = newRouteTriggers
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const cmd = newRouteCommand.trim();
    if (!label || !triggers.length || !cmd) return;

    const customRoute = {
      id: `custom_${Date.now()}`,
      label,
      triggers,
      actionType: 'analytics',
      commandText: cmd,
      birdMotion: 'orbiting',
      requiresConfirmation: newRouteConfirm,
      confirmationNote: `Task committed. Executed custom route "${label}".`
    };
    setCommandRouter((prev) => [customRoute, ...prev]);
    setNewRouteLabel('');
    setNewRouteTriggers('');
    setNewRouteCommand('');
    setNewRouteConfirm(false);
    appendLog({
      kind: 'success',
      title: 'Added Custom Command Route',
      detail: `"${label}" now triggers on [${triggers.join(', ')}].`
    });
  };

  const handleResetRouterDefaults = () => {
    setCommandRouter([...DEFAULT_INSI_COMMAND_ROUTER]);
    appendLog({
      kind: 'info',
      title: 'Command Router Reset',
      detail: 'Restored default InsightBoard command routes.'
    });
  };

  // Resolve Dove Stage Coordinates (Orbiting Flight vs Cursor-Follow vs Project Dossier Perch vs Active Tab Perch)
  const resolvedStageStyle = useMemo(() => {
    if (isOrbitingTask && !reducedMotion) {
      return {
        top: '22%',
        left: '48%',
        bottom: 'auto',
        right: 'auto'
      };
    }
    if (followCursorMode && cursorCoords.x > 0 && !reducedMotion) {
      return {
        left: `${cursorCoords.x}px`,
        top: `${cursorCoords.y}px`,
        bottom: 'auto',
        right: 'auto'
      };
    }
    if (corner === 'project-dossier-perch' && dossierPerchCoords) {
      return dossierPerchCoords;
    }
    if (corner === 'active-tab-perch' && activeTabCoords) {
      return activeTabCoords;
    }
    if (dossierPerchCoords) {
      return dossierPerchCoords;
    }
    return CORNER_POSITIONS[corner] || CORNER_POSITIONS['bottom-right'];
  }, [activeTabCoords, corner, cursorCoords, dossierPerchCoords, followCursorMode, isOrbitingTask, reducedMotion]);

  const isListeningActive = voiceStatus === 'listening_wake' || voiceStatus === 'push_to_talk';

  // Filter Indian & English voices for selector
  const selectableVoices = useMemo(() => {
    const indian = availableVoices.filter(
      (v) => /en[-_]IN|hi[-_]IN/i.test(v.lang) || /india|hindi|heera|swara|rishi|lekha|neerja/i.test(v.name)
    );
    const others = availableVoices.filter((v) => /^en/i.test(v.lang) && !indian.includes(v)).slice(0, 6);
    return [...indian, ...others];
  }, [availableVoices]);

  return (
    <>
      {/* 1. Animated INSI Dove Avatar (Invisible until called by "Hey, Inci"; stands on Project Dossier button) */}
      {visible && (
        <div
          className={`insi-pet-stage ${leaving ? 'insi-leaving' : 'insi-entering'} state-${animState} prop-${activeProp} size-${sizeVariant} corner-${corner} ${
            isOrbitingTask ? 'insi-orbit-flight-active' : ''
          } ${reducedMotion ? 'insi-reduced-motion' : ''}`}
          style={{
            ...resolvedStageStyle,
            '--insi-aura': auraColor,
            '--insi-head-tilt': `${pointerTrack.headTilt}deg`,
            '--insi-facing-dir': pointerTrack.facingLeft ? -1 : 1
          }}
          data-testid="insi-ai-mascot"
          data-insi-state={animState}
          data-insi-prop={activeProp}
          data-insi-size={sizeVariant}
          data-insi-aura={auraColor}
          data-insi-corner={corner}
          data-insi-voice-status={voiceStatus}
          role="button"
          tabIndex={0}
          aria-label={`INSI Dove Assistant (${animState}). Click to open or close INSI Assistant Panel.`}
          title='INSI Dove Assistant — Standing on Project Dossier. Click to open controls or say "Hey, Inci"'
          onClick={() => setPanelOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setPanelOpen((prev) => !prev);
            }
          }}
        >
          {/* Emotive FX Layer Above Dove */}
          <div className="insi-fx-layer" aria-hidden="true">
            {animState === 'sleeping' && (
              <div className="insi-zzz-group">
                <span className="insi-z z1">z</span>
                <span className="insi-z z2">Z</span>
                <span className="insi-z z3">Z</span>
              </div>
            )}

            {(animState === 'confused' || animState === 'error' || animState === 'malware_alert' || animState === 'legal_alert') && (
              <div className="insi-question-bubble">!</div>
            )}

            {(animState === 'thinking' || animState === 'heavy_ai') && (
              <div className="insi-ai-energy-crown">
                <span className="energy-orb o1" />
                <span className="energy-orb o2" />
                <span className="energy-orb o3" />
              </div>
            )}

            {(animState === 'audio_sync' || animState === 'dancing' || animState === 'speaking' || isSpeakingState) && (
              <div className="insi-music-notes">
                <span className="m-note n1">♪</span>
                <span className="m-note n2">♫</span>
                <span className="m-note n3">♬</span>
              </div>
            )}

            {(animState === 'celebrating' ||
              animState === 'magic_import' ||
              animState === 'orbiting' ||
              animState === 'security_pass') && (
              <div className="insi-sparkles">
                <span className="spark s1">✦</span>
                <span className="spark s2">★</span>
                <span className="spark s3">✦</span>
              </div>
            )}
          </div>

          {/* Main Dove Rig — Pure Transparent Bird Only (No Blue Background Circle) + Articulated Flapping Wings */}
          <div className="insi-robot-rig insi-dove-rig">
            <div className="insi-dove-body-wrap">
              {!doveImgFailed ? (
                <>
                  <img
                    src={DOVE_IMAGE_URL}
                    alt="INSI white and silver-gray dove assistant with vivid blue wing feathers"
                    className="insi-dove-artwork"
                    draggable={false}
                    onError={() => setDoveImgFailed(true)}
                  />
                  {/* Articulated Upper-Wing Layer that Flaps Up and Down During Flight */}
                  <img
                    src={DOVE_IMAGE_URL}
                    alt=""
                    aria-hidden="true"
                    className="insi-dove-wing-flap-layer"
                    draggable={false}
                  />
                </>
              ) : (
                /* Vector Dove Fallback (Zero-Broken-Image Policy) */
                <svg viewBox="0 0 120 120" className="insi-dove-fallback-svg" aria-hidden="true">
                  <path
                    d="M28 74 C22 52, 42 32, 68 38 C78 22, 98 18, 106 32 C94 42, 88 52, 92 64 C102 66, 108 72, 102 78 C86 84, 54 88, 28 74 Z"
                    fill="#f8fafc"
                    stroke="#38bdf8"
                    strokeWidth="3"
                  />
                  <path d="M44 54 C56 32, 78 26, 94 34 C78 48, 66 58, 44 54 Z" fill="#0ea5e9" />
                  <circle cx="84" cy="48" r="3.5" fill="#0f172a" />
                  <polygon points="94,48 106,51 94,54" fill="#334155" />
                </svg>
              )}

              {/* Natural Eye-Blink & Cursor-Tracking Glint Overlay */}
              <div
                className="insi-dove-eye-blink"
                style={{
                  transform: `translate(${pointerTrack.eyeX}px, ${pointerTrack.eyeY}px)`
                }}
                aria-hidden="true"
              />

              {/* Avian Props (Magic Wand Sparkle, Security Shield) */}
              {(animState === 'magic_import' || animState === 'celebrating') && (
                <span className="insi-dove-prop-badge prop-magic" aria-hidden="true">
                  ✨
                </span>
              )}
              {(animState === 'malware_alert' || animState === 'security_scan' || animState === 'security_pass') && (
                <span className="insi-dove-prop-badge prop-shield" aria-hidden="true">
                  🛡️
                </span>
              )}
            </div>

            {/* Subtle Claw Shadow When Perched on Project Dossier */}
            <div className="insi-dove-perch-bar" aria-hidden="true">
              <span className="perch-glow-dot" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Bottom-Right Control Dock:
          - Completely invisible until "Hey, Inci" summons the bird (NO "Enable Voice" button!)
          - When the dove appears (`visible` or `panelOpen`), the "INSI Dove" button appears with it! */}
      {(visible || panelOpen) && (
        <div className="insi-floating-dock" role="region" aria-label="INSI Dove Assistant Controls">
          <button
            type="button"
            className={`insi-dock-toggle-btn ${panelOpen ? 'active' : ''} ${isListeningActive ? 'listening' : ''}`}
            onClick={() => setPanelOpen((prev) => !prev)}
            aria-expanded={panelOpen}
            aria-controls="insi-assistant-panel"
            aria-label={panelOpen ? 'Close INSI Assistant Panel' : 'Open INSI Assistant Panel'}
          >
            <img
              src={DOVE_IMAGE_URL}
              alt=""
              className="insi-dock-thumb"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="insi-dock-text">
              <strong>INSI Dove</strong>
              <small>
                {isListeningActive
                  ? '● Always Listening ("Hey, Inci")'
                  : 'Website Manager Active'}
              </small>
            </span>
            <span className="insi-dock-chevron" aria-hidden="true">
              {panelOpen ? '✕' : '▲'}
            </span>
          </button>
        </div>
      )}

      {/* 3. Open / Close INSI Assistant Panel (Modal / Drawer) */}
      {panelOpen && (
        <aside
          id="insi-assistant-panel"
          className="insi-assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-label="INSI Dove Assistant & Local Command Router"
          data-testid="insi-assistant-panel"
        >
          {/* Panel Header */}
          <header className="insi-panel-header">
            <div className="insi-panel-brand">
              <div className="insi-panel-avatar-wrap">
                <img
                  src={DOVE_IMAGE_URL}
                  alt="INSI Dove Avatar"
                  className="insi-panel-avatar"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h2 className="insi-panel-title">
                  INSI Dove Assistant
                  <span className="insi-local-badge">Always-On Wake Phrase</span>
                </h2>
                <p className="insi-panel-subtitle">
                  Default wake phrase: <strong>&ldquo;Hey, Inci&rdquo;</strong> (also recognizes{' '}
                  <code>Hey In C I</code>, <code>Wake up Inci</code>)
                </p>
              </div>
            </div>
            <button
              type="button"
              className="insi-panel-close-btn"
              onClick={() => setPanelOpen(false)}
              aria-label="Close INSI Assistant Panel"
            >
              ✕
            </button>
          </header>

          {/* Honest Browser & Wake-Word Scope Notice */}
          <div className="insi-scope-banner">
            <span>🕊️</span>
            <p>
              INSI automatically listens for <strong>&ldquo;Hey, Inci&rdquo;</strong> while this site is open. When
              called, the dove flies in, executes your command, and flies off when finished.
            </p>
          </div>

          {/* Voice Status & Automatic Microphone Controls */}
          <section className="insi-voice-controls-card" aria-label="Voice and Microphone Controls">
            <div className="insi-voice-status-row">
              <div className={`insi-voice-indicator status-${voiceStatus}`}>
                <span className="pulse-dot" />
                <span>
                  {voiceStatus === 'listening_wake' && 'Always Listening Actively for "Hey, Inci"…'}
                  {voiceStatus === 'push_to_talk' && 'Instant Voice Command Active — Speak Now…'}
                  {voiceStatus === 'requesting_permission' && 'Requesting Browser Microphone Permission…'}
                  {voiceStatus === 'permission_denied' && 'Browser Mic Permission Blocked (Allow in Address Bar)'}
                  {voiceStatus === 'unsupported' && 'Browser Speech Recognition Unavailable (Use Text/Buttons)'}
                  {(voiceStatus === 'idle' || voiceStatus === 'error') && 'Auto-Resuming Wake-Word Listener…'}
                </span>
              </div>
              {lastHeardTranscript && (
                <span className="insi-last-heard" title="Last normalized transcript">
                  Heard: &ldquo;{lastHeardTranscript}&rdquo;
                </span>
              )}
            </div>

            {voiceErrorMsg && (
              <div className="insi-voice-error-box" role="alert">
                {voiceErrorMsg}
              </div>
            )}

            <div className="insi-voice-btn-grid">
              <button
                type="button"
                className="insi-ctrl-btn active"
                disabled={!speechSupported}
                onClick={() => void startExplicitVoiceSession('continuous', { silent: false })}
              >
                🟢 Auto-Listening (&ldquo;Hey, Inci&rdquo;)
              </button>

              <button
                type="button"
                className={`insi-ctrl-btn ${voiceStatus === 'push_to_talk' ? 'primary' : ''}`}
                disabled={!speechSupported}
                onClick={() => void startExplicitVoiceSession('ptt', { silent: false })}
              >
                🗣 Speak Command Now
              </button>

              <button
                type="button"
                className={`insi-ctrl-btn ${voiceMuted ? 'warning' : ''}`}
                onClick={() => {
                  setVoiceMuted((prev) => {
                    const next = !prev;
                    if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                    return next;
                  });
                }}
              >
                {voiceMuted ? '🔇 Voice Muted' : '🔊 Spoken Reply On'}
              </button>
            </div>

            {/* Distinct Indian Voice Selector + Motion Controls */}
            <div className="insi-voice-prefs-row">
              <label className="insi-pref-label">
                <span>Task Voice (Distinct from Summary):</span>
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="insi-voice-select"
                  aria-label="Select Indian Voice for INSI Task Completion"
                >
                  <option value="indian_distinct_auto">
                    🇮🇳 Auto Distinct Indian Voice (Pitch 1.18x · Avian Chime)
                  </option>
                  {selectableVoices.map((v) => (
                    <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>

              <div className="insi-motion-toggles">
                <button
                  type="button"
                  className={`insi-mini-toggle ${followCursorMode ? 'on' : ''}`}
                  onClick={() => setFollowCursorMode((prev) => !prev)}
                  title="Toggle between perching on the active tab or flying near your mouse cursor"
                >
                  {followCursorMode ? '🕊️ Following Cursor' : '📌 Perched on Active Tab'}
                </button>
                <button
                  type="button"
                  className={`insi-mini-toggle ${reducedMotion ? 'on' : ''}`}
                  onClick={() => setReducedMotion((prev) => !prev)}
                >
                  {reducedMotion ? '⏸ Reduced Motion On' : '✨ Full Bird Motion'}
                </button>
              </div>
            </div>
          </section>

          {/* Consequential Action Confirmation Gate */}
          {pendingConfirmation && (
            <div className="insi-confirm-gate" role="alertdialog" aria-label="Confirm Consequential Action">
              <div className="insi-confirm-header">
                <strong>⚠️ Confirm Before INSI Executes</strong>
              </div>
              <p className="insi-confirm-desc">{pendingConfirmation.prompt}</p>
              <div className="insi-confirm-actions">
                <button
                  type="button"
                  className="insi-confirm-btn confirm"
                  onClick={handleConfirmPendingAction}
                >
                  ✓ Confirm & Execute
                </button>
                <button
                  type="button"
                  className="insi-confirm-btn cancel"
                  onClick={handleCancelPendingAction}
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}

          {/* Panel Mode Tabs: Assistant & Quick Actions vs Editable Local Command Router */}
          <div className="insi-panel-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={panelTab === 'assistant'}
              className={`insi-panel-tab ${panelTab === 'assistant' ? 'active' : ''}`}
              onClick={() => setPanelTab('assistant')}
            >
              🕊️ Assistant & Quick Controls
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panelTab === 'router'}
              className={`insi-panel-tab ${panelTab === 'router' ? 'active' : ''}`}
              onClick={() => setPanelTab('router')}
            >
              ⚙️ Local Command Router ({commandRouter.length})
            </button>
          </div>

          {panelTab === 'assistant' ? (
            <div className="insi-panel-body">
              {/* Text Command Input (Always available when voice is off or unsupported) */}
              <form className="insi-command-form" onSubmit={handleCommandFormSubmit}>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder='Type a command (e.g., "Hey, Inci, switch to Hyderabad Metro" or "Top 3 leaders")…'
                  className="insi-command-input"
                  aria-label="Type a command for INSI Dove Assistant"
                />
                <button type="submit" className="insi-command-send-btn">
                  Run
                </button>
              </form>

              {/* Bird Animation & Action Chips */}
              <div className="insi-quick-section">
                <span className="insi-section-caption">Dove Motions & Website Actions:</span>
                <div className="insi-chip-grid">
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, fly around workspace and perch on tab', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    🕊️ Fly Round & Perch
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, dance', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    🎵 Dove Dance
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, cast magic', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    ✨ Magic Sparkles
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, switch to Hyderabad Metro', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    🚇 Hyderabad Metro
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, switch to Shopping Mall', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    🛍️ Shopping Mall
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, highlight top 3 leaders', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    🏆 Top 3 Leaders
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, flag bottom 2 underperforming', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    🚨 Flag Bottom 2
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, stand on Project Dossier', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    📌 Stand on Project Dossier
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, download PDF report', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    📄 Download PDF
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, download Excel workbook', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    📊 Download Excel
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, download CSV data', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    📥 Download CSV
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, open data table', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    📋 Open Data Table
                  </button>
                  <button
                    type="button"
                    className="insi-action-chip warning"
                    onClick={() =>
                      handleSpokenTranscript('Hey, Inci, reset all filters', {
                        requireWakeWord: false,
                        speakReply: true
                      })
                    }
                  >
                    🔄 Reset Filters (Asks First)
                  </button>
                </div>
              </div>

              {/* Activity & Honest Feedback Log */}
              <div className="insi-log-list" aria-live="polite">
                {assistantLog.map((item) => (
                  <div key={item.id} className={`insi-log-item kind-${item.kind || 'info'}`}>
                    <div className="insi-log-top">
                      <strong>{item.title}</strong>
                      {item.timestamp && <small>{item.timestamp}</small>}
                    </div>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Editable Local Command Router Tab */
            <div className="insi-panel-body">
              <div className="insi-router-header-row">
                <p className="insi-router-help">
                  Customize wake trigger phrases or add new local routes mapped to real InsightBoard actions. Changes
                  save locally in your browser.
                </p>
                <button
                  type="button"
                  className="insi-mini-toggle"
                  onClick={handleResetRouterDefaults}
                >
                  ↺ Reset Defaults
                </button>
              </div>

              {/* Add Custom Route Form */}
              <form className="insi-new-route-form" onSubmit={handleAddCustomRoute}>
                <input
                  type="text"
                  placeholder="Route label (e.g. Show Category Pie)"
                  value={newRouteLabel}
                  onChange={(e) => setNewRouteLabel(e.target.value)}
                  className="insi-route-input"
                  aria-label="New route label"
                />
                <input
                  type="text"
                  placeholder="Trigger phrases, comma-separated (e.g. category pie, zone share)"
                  value={newRouteTriggers}
                  onChange={(e) => setNewRouteTriggers(e.target.value)}
                  className="insi-route-input"
                  aria-label="New route trigger phrases"
                />
                <input
                  type="text"
                  placeholder="Target dashboard command (e.g. Show revenue share by category as a pie chart)"
                  value={newRouteCommand}
                  onChange={(e) => setNewRouteCommand(e.target.value)}
                  className="insi-route-input"
                  aria-label="Target dashboard command"
                />
                <div className="insi-new-route-footer">
                  <label className="insi-checkbox-label">
                    <input
                      type="checkbox"
                      checked={newRouteConfirm}
                      onChange={(e) => setNewRouteConfirm(e.target.checked)}
                    />
                    <span>Ask confirmation before executing</span>
                  </label>
                  <button type="submit" className="insi-command-send-btn">
                    + Add Route
                  </button>
                </div>
              </form>

              {/* Existing Routes List */}
              <div className="insi-router-list">
                {commandRouter.map((route) => (
                  <div key={route.id} className="insi-router-item">
                    <div className="insi-router-item-head">
                      <strong>{route.label}</strong>
                      <div className="insi-router-item-actions">
                        <button
                          type="button"
                          className={`insi-route-badge ${route.requiresConfirmation ? 'confirm-on' : ''}`}
                          onClick={() => handleToggleRouteConfirmation(route.id)}
                          title="Toggle whether INSI asks for confirmation before running this route"
                        >
                          {route.requiresConfirmation ? '🔒 Asks Confirmation' : '⚡ Instant'}
                        </button>
                        <button
                          type="button"
                          className="insi-route-run-btn"
                          onClick={() =>
                            handleSpokenTranscript(route.triggers[0] || route.commandText, {
                              requireWakeWord: false,
                              speakReply: true
                            })
                          }
                        >
                          ▶ Test
                        </button>
                      </div>
                    </div>

                    {editingRouteId === route.id ? (
                      <div className="insi-route-edit-row">
                        <input
                          type="text"
                          value={editingTriggersText}
                          onChange={(e) => setEditingTriggersText(e.target.value)}
                          className="insi-route-input"
                          aria-label={`Edit triggers for ${route.label}`}
                        />
                        <button
                          type="button"
                          className="insi-route-save-btn"
                          onClick={() => handleSaveEditedTriggers(route.id)}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="insi-route-triggers-row">
                        <span className="triggers-text">
                          Triggers: <code>{route.triggers.join(', ')}</code>
                        </span>
                        <button
                          type="button"
                          className="insi-route-edit-btn"
                          onClick={() => {
                            setEditingRouteId(route.id);
                            setEditingTriggersText(route.triggers.join(', '));
                          }}
                        >
                          ✎ Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
