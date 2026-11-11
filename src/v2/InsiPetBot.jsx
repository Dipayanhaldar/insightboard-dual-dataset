import React, { useCallback, useEffect, useRef, useState } from 'react';
import './InsiPetBot.css';
import {
  insi,
  INSI_CORNERS,
  INSI_SIZES,
  INSI_STATES
} from './insiController.js';
import {
  detectWakeWordAndCommand,
  executeInsiCommand
} from './insiOperatorEngine.js';
import {
  playInsiAppear,
  playInsiChime,
  playInsiDisappear,
  playInsiSnore
} from './uiSound.js';

const CORNER_POSITIONS = {
  'bottom-right': { bottom: '72px', right: '16px', top: 'auto', left: 'auto' },
  'bottom-left': { bottom: '20px', left: '16px', top: 'auto', right: 'auto' },
  'top-right': { top: '62px', right: '16px', bottom: 'auto', left: 'auto' },
  'mid-right': { bottom: '190px', right: '14px', top: 'auto', left: 'auto' },
  'top-left': { top: '62px', left: '16px', bottom: 'auto', right: 'auto' },
  'mid-left': { bottom: '190px', left: '14px', top: 'auto', right: 'auto' },
  'heading-perch': { top: '66px', left: '34%', bottom: 'auto', right: 'auto' },
  'kpi-perch': { top: '192px', right: '26%', bottom: 'auto', left: 'auto' }
};

const AMBIENT_ACTIVITIES = [
  { state: 'roaming_heading', prop: 'chair_laptop', size: 'sm', corner: 'heading-perch' },
  { state: 'flexing', prop: 'flex_muscles', size: 'md', corner: 'bottom-right' },
  { state: 'dancing', prop: 'audio_deck', size: 'md', corner: 'top-right' },
  { state: 'pulling_dashboard', prop: 'flex_muscles', size: 'sm', corner: 'kpi-perch' },
  { state: 'reading', prop: 'chair_laptop', size: 'sm', corner: 'bottom-left' },
  { state: 'drinking', prop: 'coffee_chair', size: 'sm', corner: 'mid-right' },
  { state: 'viewing_charts', prop: 'chart_holo', size: 'md', corner: 'bottom-right' },
  { state: 'security_pass', prop: 'security_shield', size: 'sm', corner: 'top-left' }
];

export default function InsiPetBot({
  rows = [],
  fields = [],
  datasetName = 'Active Dataset',
  emptyDashboard = false,
  onVoiceCommandAction
}) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [animState, setAnimState] = useState('idle');
  const [activeProp, setActiveProp] = useState('chair_laptop');
  const [sizeVariant, setSizeVariant] = useState('md');
  const [auraColor, setAuraColor] = useState('#00F0FF');
  const [corner, setCorner] = useState('bottom-right');
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0, headTilt: 0 });

  const fadeTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const sleepingFromInactivityRef = useRef(false);
  const cornerIdxRef = useRef(0);
  const sizeIdxRef = useRef(0);
  const activityIdxRef = useRef(0);

  // Always-On Echo-Free "Hey INSI" / "Hey Incy" / "Hey Siri" Voice Guardian Refs
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const ignoreMicUntilRef = useRef(0);
  const activeUtteranceRef = useRef(null);
  const maxSpeakTimerRef = useRef(null);
  const interimTimerRef = useRef(null);
  const lastInterimWakeTimeRef = useRef(0);
  const lastTranscriptRef = useRef({ text: '', time: 0 });
  const lastSpokenReplyRef = useRef({ text: '', time: 0, count: 0 });
  const lastProcessedResultIdxRef = useRef(-1);
  const wakeConversationUntilRef = useRef(0);
  const micInitializedRef = useRef(false);
  const latestContextRef = useRef({ rows, fields, datasetName, onVoiceCommandAction });

  useEffect(() => {
    latestContextRef.current = { rows, fields, datasetName, onVoiceCommandAction };
  }, [rows, fields, datasetName, onVoiceCommandAction]);

  const clearTimers = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
  }, []);

  const showInsi = useCallback(
    (nextState = 'idle', options = {}) => {
      clearTimers();

      const validState = INSI_STATES.includes(nextState) ? nextState : 'idle';
      const durationMs = Number(options.durationMs) || 5000;

      const chosenCorner =
        options.corner && CORNER_POSITIONS[options.corner]
          ? options.corner
          : validState === 'roaming_heading'
          ? 'heading-perch'
          : validState === 'pulling_dashboard'
          ? 'kpi-perch'
          : INSI_CORNERS[cornerIdxRef.current % INSI_CORNERS.length];
      cornerIdxRef.current = (cornerIdxRef.current + 1) % INSI_CORNERS.length;

      const chosenSize =
        options.size && INSI_SIZES.includes(options.size)
          ? options.size
          : INSI_SIZES[sizeIdxRef.current % INSI_SIZES.length];
      sizeIdxRef.current = (sizeIdxRef.current + 1) % INSI_SIZES.length;

      const resolvedProp =
        options.prop ||
        (validState === 'malware_alert' || validState === 'security_pass' || validState === 'security_scan'
          ? 'security_shield'
          : validState === 'legal_alert'
          ? 'legal_gavel'
          : validState === 'flexing' || validState === 'pulling_dashboard'
          ? 'flex_muscles'
          : validState === 'magic_import' || validState === 'celebrating'
          ? 'magician_wand'
          : validState === 'heavy_ai' || validState === 'thinking'
          ? 'ai_power_core'
          : validState === 'audio_sync' || validState === 'dancing'
          ? 'audio_deck'
          : validState === 'viewing_charts' || validState === 'observing'
          ? 'chart_holo'
          : validState === 'drinking'
          ? 'coffee_chair'
          : 'chair_laptop');

      setCorner(chosenCorner);
      setSizeVariant(chosenSize);
      setActiveProp(resolvedProp);
      setAuraColor(options.auraColor || '#00F0FF');
      setAnimState(validState);
      setLeaving(false);
      setVisible(true);

      const soundType = options.sound || 'appear';
      if (soundType === 'celebrate') {
        playInsiChime('signin');
      } else if (soundType === 'snore') {
        playInsiSnore();
      } else {
        playInsiAppear();
      }

      if (!options.persist) {
        fadeTimerRef.current = setTimeout(() => {
          setLeaving(true);
          playInsiDisappear();
        }, Math.max(2200, durationMs - 650));

        hideTimerRef.current = setTimeout(() => {
          setVisible(false);
          setLeaving(false);
        }, durationMs);
      }
    },
    [clearTimers]
  );

  // Real-Time Pointer & Motion Tracking: Eyes and head smoothly track the user's cursor across the screen
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (typeof window === 'undefined') return;
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      setEyeOffset({
        x: Math.max(-3.2, Math.min(3.2, Number((nx * 3.2).toFixed(2)))),
        y: Math.max(-2.4, Math.min(2.4, Number((ny * 2.4).toFixed(2)))),
        headTilt: Math.max(-5, Math.min(5, Number((nx * 4.5).toFixed(2))))
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // Half-Duplex Echo-Free Speech Output with Strict Anti-Repetition & V8 GC Protection
  // IMPORTANT: Never call `recognition.abort()` during speech — keeping the SpeechRecognition stream
  // open preserves the browser's microphone permission/gesture session while ignoring self-echo via `isSpeakingRef`.
  const speakWithoutEcho = useCallback((textToSpeak) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !textToSpeak) return;

    let finalSpeech = String(textToSpeak).trim();
    if (!finalSpeech) return;

    // Never repeat the exact same sentence twice in a row
    if (lastSpokenReplyRef.current.text === finalSpeech) {
      lastSpokenReplyRef.current.count += 1;
      const variations = [
        `Action confirmed! ${finalSpeech.split('.').slice(1).join('.').trim() || finalSpeech}`,
        `Updated on your live board. ${finalSpeech.split('.')[0]}.`,
        `Task complete! All charts and KPIs are synchronized.`
      ];
      finalSpeech = variations[lastSpokenReplyRef.current.count % variations.length];
    } else {
      lastSpokenReplyRef.current = { text: finalSpeech, time: Date.now(), count: 0 };
    }

    if (maxSpeakTimerRef.current) clearTimeout(maxSpeakTimerRef.current);
    if (interimTimerRef.current) clearTimeout(interimTimerRef.current);

    // Gate incoming STT transcripts while speaking so INSI never hears its own voice
    isSpeakingRef.current = true;
    ignoreMicUntilRef.current = Date.now() + 7000;

    const finishSpeechAndResumeMic = () => {
      if (maxSpeakTimerRef.current) {
        clearTimeout(maxSpeakTimerRef.current);
        maxSpeakTimerRef.current = null;
      }
      isSpeakingRef.current = false;
      ignoreMicUntilRef.current = Date.now() + 1100;
      if (recognitionRef.current && !isListeningRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    };

    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      if (typeof window.speechSynthesis.resume === 'function') {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(finalSpeech);
      // Keep strong reference so Chromium V8 never garbage-collects utterance before onend fires
      activeUtteranceRef.current = utterance;
      utterance.lang = 'en-IN';
      utterance.rate = 1.04;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices?.() || [];
      const preferredVoice =
        voices.find((v) => /en[-_]IN/i.test(v.lang)) ||
        voices.find((v) => /en[-_](GB|US)/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        ignoreMicUntilRef.current = Date.now() + 6500;
        insi.audioSync();
      };

      utterance.onend = finishSpeechAndResumeMic;
      utterance.onerror = finishSpeechAndResumeMic;

      // Safety watchdog: never allow isSpeakingRef to remain stuck true if browser drops onend
      maxSpeakTimerRef.current = setTimeout(finishSpeechAndResumeMic, 6500);

      window.speechSynthesis.speak(utterance);
    } catch {
      finishSpeechAndResumeMic();
    }
  }, []);

  // Process a spoken or typed command across the entire application shell
  const handleSpokenTranscript = useCallback(
    (rawTranscript, { requireWakeWord = true, speakReply = true } = {}) => {
      if ((isSpeakingRef.current || Date.now() < ignoreMicUntilRef.current) && requireWakeWord) return null;
      const cleaned = String(rawTranscript || '').trim();
      if (!cleaned || cleaned.length < 2) return null;

      const now = Date.now();
      const lowerCleaned = cleaned.toLowerCase();

      // Guard 1: Ignore speaker echo if the microphone picked up INSI's own recent spoken sentence
      const lastSpokenLower = lastSpokenReplyRef.current.text.toLowerCase();
      if (
        requireWakeWord &&
        lastSpokenLower &&
        now - lastSpokenReplyRef.current.time < 8500 &&
        (lastSpokenLower.includes(lowerCleaned) || lowerCleaned.includes(lastSpokenLower.slice(0, 24)))
      ) {
        return null;
      }

      // Guard 2: Deduplicate identical STT transcripts within 3.5 seconds
      if (
        requireWakeWord &&
        lastTranscriptRef.current.text.toLowerCase() === lowerCleaned &&
        now - lastTranscriptRef.current.time < 3500
      ) {
        return null;
      }

      const wake = detectWakeWordAndCommand(cleaned);
      const withinActiveWakeWindow = now < wakeConversationUntilRef.current;

      // Also accept unmistakable dashboard voice commands if browser STT clipped the "Hey INSI" prefix on mic warm-up
      const isDirectDashboardCommand =
        /\b(switch\s+to|hyderabad\s+metro|shopping\s+mall|show\s+top|show\s+bottom|pie\s+chart|bar\s+chart|line\s+chart|open\s+table|data\s+table|export\s+pdf|export\s+excel|export\s+csv|open\s+calendar|dark\s+mode|light\s+mode|reset\s+filter)\b/i.test(
          lowerCleaned
        );

      if (requireWakeWord && !wake.wakeWordDetected && !withinActiveWakeWindow && !isDirectDashboardCommand) {
        return null;
      }

      lastTranscriptRef.current = { text: cleaned, time: now };
      // Keep a 20-second active follow-up window after saying "Hey INSI" or issuing a dashboard command
      if (wake.wakeWordDetected || isDirectDashboardCommand) {
        wakeConversationUntilRef.current = now + 20000;
      }

      const cmd = (wake.wakeWordDetected ? wake.cleanCommand : cleaned).toLowerCase();
      const ctx = latestContextRef.current;

      // 1. Security / Virus / Malware / Legal scan command
      if (/\b(virus|malware|security|scan|hack|legal|compliance)\b/.test(cmd)) {
        const sec = insi.scanSecurity({ rows: ctx.rows, fields: ctx.fields });
        const spoken =
          sec.status === 'clean'
            ? `Security scan complete across ${ctx.rows.length} records in ${ctx.datasetName}. Zero malware, formula injections, or legal compliance issues detected.`
            : `Security alert! Flagged ${sec.threatsFound.length + sec.legalFlags.length} potential risks. Check the dashboard notice.`;
        if (speakReply) speakWithoutEcho(spoken);
        if (ctx.onVoiceCommandAction) {
          ctx.onVoiceCommandAction({ type: 'security_scan', report: sec, spoken });
        }
        return null;
      }

      // 2. Robot physical action commands
      if (/\b(dance|breakdance|groove)\b/.test(cmd)) {
        insi.dance();
        if (speakReply) speakWithoutEcho('Dancing live on your dashboard!');
        return null;
      }
      if (/\b(flex|muscle|strong|power)\b/.test(cmd)) {
        insi.flex();
        if (speakReply) speakWithoutEcho('Flexing full robotic power for your analytics!');
        return null;
      }
      if (/\b(roam|walk|run|patrol)\b/.test(cmd)) {
        insi.roamHeading();
        if (speakReply) speakWithoutEcho('Patrolling across your main dashboard headings now.');
        return null;
      }

      // 3. Execute full INSI data operator + full-website automation plan
      const result = executeInsiCommand({
        rows: ctx.rows,
        fields: ctx.fields,
        datasetName: ctx.datasetName,
        command: wake.wakeWordDetected ? cleaned : `Hey INSI, ${cleaned}`,
        activeMode: 'demo_sandbox'
      });

      insi.applyMascotState(result.mascot_state);
      // When switching to Hyderabad Metro, let the authentic Metro MP3 announcement play without TTS overlap
      if (speakReply && result.voice_reply && result.automation_plan?.switchPreset !== 'metro') {
        speakWithoutEcho(result.voice_reply);
      }

      if (ctx.onVoiceCommandAction) {
        ctx.onVoiceCommandAction({
          type: 'automate_all',
          result,
          rawCommand: cleaned
        });
      }

      return result;
    },
    [speakWithoutEcho]
  );

  // Expose `window.insiSpeak` and `window.insiExecuteCommand` globally across the app shell
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.insiSpeak = speakWithoutEcho;
      window.insiExecuteCommand = (cmdText, opts = {}) =>
        handleSpokenTranscript(cmdText, { requireWakeWord: false, speakReply: true, ...opts });
    }
  }, [speakWithoutEcho, handleSpokenTranscript]);

  // Global, Persistent Web Speech API Listener + Site-Wide Audio Unlocker ("Hey INSI", "Hey Incy", "Hey Siri")
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // Unlock browser AudioContext & SpeechSynthesis on any user gesture to bypass site-wide audio restrictions
    const unlockSiteWideAudio = () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          setTimeout(() => {
            try {
              ctx.close();
            } catch {}
          }, 300);
        }
        if ('speechSynthesis' in window && typeof window.speechSynthesis.resume === 'function') {
          window.speechSynthesis.resume();
        }
      } catch {}
    };

    if (!SpeechRecognition) return undefined;

    const createOrGetRecognition = () => {
      if (recognitionRef.current) return recognitionRef.current;

      const recognition = new SpeechRecognition();
      // Use browser's native locale (or en-US/en-IN fallback) so speech models match the user's accent
      recognition.lang =
        (typeof navigator !== 'undefined' && /^en/i.test(navigator.language || '') ? navigator.language : '') ||
        'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;

      recognition.onstart = () => {
        isListeningRef.current = true;
        micInitializedRef.current = true;
        lastProcessedResultIdxRef.current = -1;
        try {
          localStorage.setItem('insightboard-mic-granted', 'true');
        } catch {}
      };

      recognition.onresult = (event) => {
        const now = Date.now();
        const mutedForSelfSpeech = isSpeakingRef.current || now < ignoreMicUntilRef.current;

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (i <= lastProcessedResultIdxRef.current) continue;
          const res = event.results[i];
          if (!res) continue;

          // If INSI is currently speaking (or within post-speech echo cooldown), mark this result index
          // as consumed so it is never re-processed after speech finishes
          if (mutedForSelfSpeech) {
            if (res.isFinal) {
              lastProcessedResultIdxRef.current = i;
            }
            continue;
          }

          // Collect all phonetic alternatives returned by the browser speech engine
          const alternatives = [];
          for (let a = 0; a < res.length; a += 1) {
            const t = String(res[a]?.transcript || '').trim();
            if (t) alternatives.push(t);
          }
          if (!alternatives.length) continue;

          // Prefer whichever alternative matches the "Hey INSI" wake word or direct command
          const matchedAlt = alternatives.find((alt) => detectWakeWordAndCommand(alt).wakeWordDetected);
          const withinWakeWindow = now < wakeConversationUntilRef.current;
          const directCmdAlt = alternatives.find((alt) =>
            /\b(switch\s+to|hyderabad\s+metro|shopping\s+mall|show\s+top|show\s+bottom|pie\s+chart|bar\s+chart|line\s+chart|open\s+table|data\s+table|export\s+pdf|export\s+excel|export\s+csv|open\s+calendar|dark\s+mode|light\s+mode|reset\s+filter)\b/i.test(
              alt
            )
          );
          const chosenTranscript = matchedAlt || directCmdAlt || (withinWakeWindow ? alternatives[0] : '');

          if (!chosenTranscript) continue;

          // Instant Visual & Sonic Wake-Up (<150ms) the moment "Hey INSI" is heard in interim speech
          if ((matchedAlt || directCmdAlt) && now - lastInterimWakeTimeRef.current > 2200) {
            lastInterimWakeTimeRef.current = now;
            wakeConversationUntilRef.current = now + 20000;
            showInsi('waving', {
              prop: 'chair_laptop',
              size: 'md',
              corner: 'bottom-right',
              auraColor: '#00F0FF',
              durationMs: 6500
            });
          }

          if (res.isFinal) {
            if (interimTimerRef.current) {
              clearTimeout(interimTimerRef.current);
              interimTimerRef.current = null;
            }
            lastProcessedResultIdxRef.current = i;
            handleSpokenTranscript(chosenTranscript, { requireWakeWord: true, speakReply: true });
          } else {
            // Interim settlement debounce (650ms): responds immediately even if ambient noise delays isFinal
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
                handleSpokenTranscript(settledText, { requireWakeWord: true, speakReply: true });
              }
            }, 650);
          }
        }
      };

      recognition.onerror = (err) => {
        const errCode = String(err?.error || '');
        if (errCode === 'aborted' || errCode === 'no-speech') {
          isListeningRef.current = false;
          return;
        }
        isListeningRef.current = false;
        if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
          micInitializedRef.current = false;
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        lastProcessedResultIdxRef.current = -1;
        // Automatically restart continuous listening whenever session ends (e.g. after silence timeout)
        setTimeout(() => {
          if (!isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {}
          }
        }, 200);
      };

      recognitionRef.current = recognition;
      return recognition;
    };

    // Synchronously start recognition (critical for browser user-gesture activation on all devices)
    const ensureRecognitionStarted = () => {
      if (isListeningRef.current) return;
      try {
        const rec = createOrGetRecognition();
        rec.start();
      } catch {
        // Already started or awaiting user gesture — safe no-op
      }
    };

    const bootMicTimer = setTimeout(() => {
      ensureRecognitionStarted();
    }, 300);

    // Watch the Browser Permissions API so the EXACT instant the user clicks "Allow" in the
    // browser's address-bar microphone popup (which happens outside the DOM), recognition starts immediately!
    let permissionStatus = null;
    const handlePermissionChange = () => {
      if (permissionStatus && permissionStatus.state === 'granted') {
        micInitializedRef.current = true;
        ensureRecognitionStarted();
      }
    };
    if (typeof navigator !== 'undefined' && navigator.permissions && typeof navigator.permissions.query === 'function') {
      navigator.permissions
        .query({ name: 'microphone' })
        .then((status) => {
          permissionStatus = status;
          if (status.state === 'granted') {
            micInitializedRef.current = true;
            ensureRecognitionStarted();
          }
          status.onchange = handlePermissionChange;
        })
        .catch(() => {});
    }

    // Unconditional watchdog: every 2 seconds, if SpeechRecognition is not actively listening, attempt start()
    // (Once microphone permission is granted by the user, start() succeeds immediately even from a timer)
    const watchdogInterval = setInterval(() => {
      if (!isListeningRef.current) {
        ensureRecognitionStarted();
      }
    }, 2000);

    const onUserInteraction = () => {
      unlockSiteWideAudio();
      if (!isListeningRef.current) {
        ensureRecognitionStarted();
      }
    };

    let lastPointerAttempt = 0;
    const onPointerMoveWake = () => {
      if (isListeningRef.current) return;
      const now = Date.now();
      if (now - lastPointerAttempt > 1500) {
        lastPointerAttempt = now;
        ensureRecognitionStarted();
      }
    };

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && !isListeningRef.current) {
        ensureRecognitionStarted();
      }
    };

    window.addEventListener('pointerdown', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
    window.addEventListener('click', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });
    window.addEventListener('pointermove', onPointerMoveWake, { passive: true });
    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      clearTimeout(bootMicTimer);
      clearInterval(watchdogInterval);
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
      if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
      if (maxSpeakTimerRef.current) clearTimeout(maxSpeakTimerRef.current);
      window.removeEventListener('pointerdown', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('click', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      window.removeEventListener('pointermove', onPointerMoveWake);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      if (recognitionRef.current) {
        try {
          micInitializedRef.current = false;
          isListeningRef.current = false;
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [handleSpokenTranscript, showInsi]);

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
          }, 550);
          return;
        }
        showInsi(detail.state || 'idle', {
          prop: detail.prop,
          size: detail.size,
          auraColor: detail.auraColor,
          durationMs: detail.durationMs,
          corner: detail.corner,
          sound: detail.sound
        });
      });
    };

    const onLegacySummon = (event) => {
      const action = String(event?.detail?.action || '').toLowerCase();
      if (action === 'signin') {
        insi.react('signin');
      } else if (action === 'dataset') {
        insi.react('charts_ready');
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

    const onAudioPlay = () => {
      insi.audioSync();
    };

    window.addEventListener('insi:state', onControllerState);
    window.addEventListener('insi:summon', onLegacySummon);
    document.addEventListener('play', onAudioPlay, true);

    return () => {
      window.removeEventListener('insi:state', onControllerState);
      window.removeEventListener('insi:summon', onLegacySummon);
      document.removeEventListener('play', onAudioPlay, true);
    };
  }, [clearTimers, showInsi]);

  // Initial website load: insi appears in compact form, waves, flexes, and roams
  useEffect(() => {
    const bootTimer = setTimeout(() => {
      showInsi('waving', {
        prop: 'chair_laptop',
        size: 'sm',
        corner: 'bottom-right',
        durationMs: 4400
      });
      stepTimerRef.current = setTimeout(() => {
        setAnimState('flexing');
        setActiveProp('flex_muscles');
      }, 1600);
    }, 1400);

    return () => {
      clearTimeout(bootTimer);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [showInsi]);

  useEffect(() => {
    if (emptyDashboard) {
      insi.react('empty');
    }
  }, [emptyDashboard]);

  // Long inactivity (60s): sleeps quietly, wakes up surprised when user moves/clicks
  useEffect(() => {
    const scheduleInactivitySleep = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        sleepingFromInactivityRef.current = true;
        showInsi('sleeping', {
          prop: 'chair_laptop',
          size: 'sm',
          corner: 'bottom-right',
          durationMs: 6800,
          sound: 'snore'
        });
      }, 60000);
    };

    const handleUserActivity = () => {
      if (sleepingFromInactivityRef.current) {
        sleepingFromInactivityRef.current = false;
        showInsi('surprised', {
          prop: 'chair_laptop',
          size: 'sm',
          corner: 'bottom-right',
          durationMs: 2800
        });
      }
      scheduleInactivitySleep();
    };

    scheduleInactivitySleep();
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [showInsi]);

  // Ambient roaming guardian cycle: roams headings, flexes, dances, pulls dashboard, checks security
  useEffect(() => {
    const ambientInterval = setInterval(() => {
      if (sleepingFromInactivityRef.current) return;
      const pick = AMBIENT_ACTIVITIES[activityIdxRef.current % AMBIENT_ACTIVITIES.length];
      activityIdxRef.current += 1;
      showInsi(pick.state, {
        prop: pick.prop,
        size: pick.size,
        corner: pick.corner,
        durationMs: 4800
      });
    }, 45000);

    return () => clearInterval(ambientInterval);
  }, [showInsi]);

  if (!visible) return null;

  const posStyle = CORNER_POSITIONS[corner] || CORNER_POSITIONS['bottom-right'];
  const showChairAndBooks =
    (activeProp === 'chair_laptop' || activeProp === 'coffee_chair') &&
    animState !== 'roaming_heading' &&
    animState !== 'walking' &&
    animState !== 'dancing' &&
    animState !== 'flexing' &&
    animState !== 'pulling_dashboard' &&
    animState !== 'malware_alert' &&
    animState !== 'legal_alert';

  return (
    <div
      className={`insi-pet-stage ${leaving ? 'insi-leaving' : 'insi-entering'} state-${animState} prop-${activeProp} size-${sizeVariant} corner-${corner}`}
      style={{
        ...posStyle,
        '--insi-aura': auraColor,
        '--insi-head-tilt': `${eyeOffset.headTilt}deg`
      }}
      data-testid="insi-ai-mascot"
      data-insi-state={animState}
      data-insi-prop={activeProp}
      data-insi-size={sizeVariant}
      data-insi-aura={auraColor}
      aria-hidden="true"
    >
      {/* Pure Emotive Non-Verbal Expressions Layer (Zero Text Below Mascot) */}
      <div className="insi-fx-layer">
        {animState === 'sleeping' && (
          <div className="insi-zzz-group">
            <span className="insi-z z1">z</span>
            <span className="insi-z z2">Z</span>
            <span className="insi-z z3">Z</span>
          </div>
        )}
        {(animState === 'confused' || animState === 'malware_alert' || animState === 'legal_alert') && (
          <div className="insi-emotive-bubbles">
            <span
              className="insi-question-bubble"
              style={{
                background:
                  animState === 'malware_alert'
                    ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                    : animState === 'legal_alert'
                    ? 'linear-gradient(135deg, #f59e0b, #b45309)'
                    : undefined
              }}
            >
              {animState === 'malware_alert' ? '!' : animState === 'legal_alert' ? '§' : '?'}
            </span>
          </div>
        )}
        {(animState === 'heavy_ai' || animState === 'thinking' || animState === 'flexing') && (
          <div className="insi-ai-energy-crown">
            <span className="energy-orb o1" />
            <span className="energy-orb o2" />
            <span className="energy-orb o3" />
          </div>
        )}
        {(animState === 'audio_sync' || animState === 'dancing') && (
          <div className="insi-music-notes">
            <span className="m-note n1">♪</span>
            <span className="m-note n2">♫</span>
            <span className="m-note n3">♬</span>
          </div>
        )}
        {(animState === 'magic_import' || animState === 'celebrating' || animState === 'happy' || animState === 'security_pass') && (
          <div className="insi-sparkles">
            <span className="spark s1">✦</span>
            <span className="spark s2">★</span>
            <span className="spark s3">✦</span>
          </div>
        )}
      </div>

      {/* Compact, Nimble 3D Futuristic White & Metallic-Blue Robot Guardian Rig */}
      <div className="insi-robot-rig">
        <div className="insi-ambient-halo" />
        {(animState === 'heavy_ai' || activeProp === 'ai_power_core' || animState === 'malware_alert') && (
          <div className="insi-quantum-ring-outer" />
        )}

        <svg
          className="insi-robot-svg"
          viewBox="0 0 180 176"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="insi-white-shell" x1="15%" y1="5%" x2="85%" y2="95%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            <radialGradient id="insi-head-dome" cx="35%" cy="25%" r="72%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>

            <linearGradient id="insi-sky-bezel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="45%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            <linearGradient id="insi-metallic-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            <linearGradient id="insi-visor-glass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="55%" stopColor="#060b16" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="insi-eye-glow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="45%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="insi-chair-leather" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="48%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <linearGradient id="insi-chair-inner" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="40%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            <linearGradient id="insi-magic-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>

          <ellipse
            className="insi-floor-shadow"
            cx="95"
            cy="164"
            rx="46"
            ry="6.5"
            fill="rgba(15, 23, 42, 0.28)"
          />

          {/* SCENE OBJECT 1: COGNAC-BROWN PEDESTAL ARMCHAIR & STACK OF BOOKS */}
          {showChairAndBooks && (
            <g className="insi-chair-and-books">
              <g className="insi-book-stack">
                <rect x="14" y="152" width="34" height="6" rx="1.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
                <rect x="16" y="146" width="31" height="6" rx="1.5" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                <rect x="15" y="140" width="30" height="6" rx="1.5" fill="#b45309" stroke="#78350f" strokeWidth="1" />
                <rect x="18" y="134" width="27" height="6" rx="1.5" fill="#64748b" stroke="#1e293b" strokeWidth="1" />
                <rect x="19" y="128" width="25" height="6" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="1" />
                <rect x="21" y="122" width="22" height="6" rx="1.5" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
              </g>

              <path
                d="M78 138 L98 138 L108 156 C108 159, 68 159, 68 156 Z"
                fill="url(#insi-chair-leather)"
                stroke="#78350f"
                strokeWidth="1.2"
              />
              <ellipse cx="88" cy="157" rx="22" ry="4" fill="#78350f" />

              <path
                d="M46 68 C44 54, 128 54, 130 70 L134 118 C134 134, 114 142, 90 142 C64 142, 48 132, 48 116 Z"
                fill="url(#insi-chair-leather)"
                stroke="#fbbf24"
                strokeWidth="1.2"
                strokeOpacity="0.45"
              />
              <path
                d="M54 72 C54 60, 122 60, 122 72 L124 116 C124 128, 108 135, 89 135 C68 135, 55 127, 55 114 Z"
                fill="url(#insi-chair-inner)"
              />
            </g>
          )}

          {/* ROBOT TORSO WITH FRIENDLY GEOMETRIC CHEST SMILEY (:U:) */}
          <g className="insi-robot-torso">
            <rect x="83" y="69" width="16" height="10" rx="4" fill="url(#insi-metallic-blue)" />
            <line x1="84" y1="74" x2="98" y2="74" stroke="#93c5fd" strokeWidth="1.4" />
            <ellipse cx="91" cy="80" rx="16" ry="4" fill="url(#insi-sky-bezel)" />

            <path
              d="M66 80 C66 75, 116 75, 116 80 L112 116 C112 122, 70 122, 70 116 Z"
              fill="url(#insi-white-shell)"
              stroke="#cbd5e1"
              strokeWidth="1.4"
            />

            <g className="insi-chest-emblem" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round">
              <path d="M84 89 Q86 86 89 88" fill="none" />
              <path d="M94 88 Q97 86 99 89" fill="none" />
              <circle cx="85" cy="95" r="1.2" fill="#1e293b" />
              <circle cx="98" cy="95" r="1.2" fill="#1e293b" />
              <path d="M88 94 L88 101 C88 104, 95 104, 95 101 L95 94" fill="none" />
              <line x1="87" y1="107" x2="96" y2="107" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
            </g>
          </g>

          {/* ROBOT LEGS, METALLIC BLUE KNEE JOINTS & SCULPTED SHOES */}
          <g className="insi-robot-legs">
            <rect x="73" y="114" width="36" height="10" rx="5" fill="url(#insi-metallic-blue)" />

            <g className="insi-leg-left">
              <circle cx="80" cy="124" r="7.5" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.2" />
              <path
                d="M73 126 L87 126 L85 151 L75 151 Z"
                fill="url(#insi-white-shell)"
                stroke="#94a3b8"
                strokeWidth="1.2"
              />
              <circle cx="73" cy="153" r="4.5" fill="#1e293b" stroke="#93c5fd" strokeWidth="1.2" />
              <path
                d="M72 149 C72 143, 95 143, 96 154 C96 159, 72 159, 72 154 Z"
                fill="url(#insi-white-shell)"
                stroke="#60a5fa"
                strokeWidth="1.4"
              />
              <path d="M80 154 Q88 151 95 155" stroke="url(#insi-sky-bezel)" strokeWidth="3" strokeLinecap="round" />
            </g>

            <g className="insi-leg-right">
              <circle cx="104" cy="124" r="7.5" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.2" />
              <path
                d="M97 126 L111 126 L109 151 L99 151 Z"
                fill="url(#insi-white-shell)"
                stroke="#94a3b8"
                strokeWidth="1.2"
              />
              <circle cx="98" cy="153" r="4.5" fill="#1e293b" stroke="#93c5fd" strokeWidth="1.2" />
              <path
                d="M97 149 C97 143, 120 143, 121 154 C121 159, 97 159, 97 154 Z"
                fill="url(#insi-white-shell)"
                stroke="#60a5fa"
                strokeWidth="1.4"
              />
              <path d="M105 154 Q113 151 120 155" stroke="url(#insi-sky-bezel)" strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>

          {/* LEFT ARM & ARTICULATED BLUE HAND */}
          <g className="insi-arm-left">
            <circle cx="63" cy="86" r="7.5" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.1" />
            <ellipse cx="60" cy="86" rx="2.5" ry="4" fill="#e2e8f0" />
            <rect
              x="54"
              y="91"
              width="13"
              height="22"
              rx="6.5"
              transform="rotate(-12 54 91)"
              fill="url(#insi-white-shell)"
              stroke="#94a3b8"
              strokeWidth="1.1"
            />
            <circle cx="67" cy="110" r="5.5" fill="url(#insi-metallic-blue)" />
            <path d="M70 108 L76 108 M70 111 L76 111" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* LAPTOP WITH "101" ON LID */}
          {showChairAndBooks && activeProp === 'chair_laptop' && (
            <g className="insi-prop-laptop101">
              <rect x="78" y="111" width="34" height="5" rx="2" fill="#92400e" stroke="#f59e0b" strokeWidth="0.9" />
              <polygon
                points="98,112 114,82 140,82 124,112"
                fill="url(#insi-white-shell)"
                stroke="#94a3b8"
                strokeWidth="1.3"
              />
              <text
                x="119"
                y="103"
                textAnchor="middle"
                fill="#64748b"
                fontSize="13"
                fontWeight="700"
                fontFamily="monospace"
                transform="skewX(-24)"
              >
                101
              </text>
            </g>
          )}

          {/* RIGHT ARM + DYNAMIC OBJECT PROPS */}
          <g className="insi-arm-right">
            <circle cx="118" cy="86" r="7.5" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.1" />
            <rect
              x="114"
              y="90"
              width="13"
              height="22"
              rx="6.5"
              fill="url(#insi-white-shell)"
              stroke="#94a3b8"
              strokeWidth="1.1"
            />
            <circle cx="121" cy="111" r="5.5" fill="url(#insi-metallic-blue)" />

            {/* MAGICIAN STICK / MAGIC WAND (When Data is Imported) */}
            {(activeProp === 'magician_wand' || animState === 'magic_import') && (
              <g className="insi-prop-wand">
                <line x1="121" y1="110" x2="156" y2="68" stroke="#0f172a" strokeWidth="4.2" strokeLinecap="round" />
                <line x1="121" y1="110" x2="127" y2="103" stroke="#f8fafc" strokeWidth="4.2" strokeLinecap="round" />
                <line x1="149" y1="76" x2="156" y2="68" stroke="#fef08a" strokeWidth="4.4" strokeLinecap="round" />
                <polygon
                  className="insi-wand-star"
                  points="158,56 161,63 169,64 163,69 165,76 158,72 151,76 153,69 147,64 155,63"
                  fill="url(#insi-magic-gold)"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
                <path
                  className="insi-magic-arc"
                  d="M156 64 Q128 24 64 42"
                  stroke="url(#insi-magic-gold)"
                  strokeWidth="2.2"
                  strokeDasharray="4 4"
                  fill="none"
                />
              </g>
            )}

            {/* STEAMING ESPRESSO CUP */}
            {(activeProp === 'coffee_chair' || animState === 'drinking') && (
              <g className="insi-prop-coffee">
                <rect x="116" y="96" width="15" height="16" rx="3.5" fill="#ffffff" stroke="#b45309" strokeWidth="1.5" />
                <rect x="116" y="101" width="15" height="6" fill="#b45309" />
                <path d="M131 99 C136 99, 136 108, 131 108" stroke="#ffffff" strokeWidth="1.8" fill="none" />
              </g>
            )}
          </g>

          {/* CYBER-GUARDIAN SECURITY / VIRUS / MALWARE SHIELD & DEVELOPER LEGAL GAVEL */}
          {(activeProp === 'security_shield' ||
            animState === 'malware_alert' ||
            animState === 'security_pass' ||
            animState === 'security_scan') && (
            <g className="insi-prop-security-shield">
              <path
                d="M140 66 L164 74 L164 98 C164 114, 152 124, 140 130 C128 124, 116 114, 116 98 L116 74 Z"
                fill={animState === 'malware_alert' ? 'rgba(239, 68, 68, 0.88)' : 'rgba(16, 185, 129, 0.88)'}
                stroke="#ffffff"
                strokeWidth="2"
              />
              {animState === 'malware_alert' ? (
                <path
                  d="M132 88 L148 104 M148 88 L132 104"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M131 96 L138 103 L151 89"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </g>
          )}

          {(activeProp === 'legal_gavel' || animState === 'legal_alert') && (
            <g className="insi-prop-legal">
              <circle cx="142" cy="96" r="22" fill="rgba(245, 158, 11, 0.9)" stroke="#ffffff" strokeWidth="2" />
              <line x1="142" y1="80" x2="142" y2="112" stroke="#ffffff" strokeWidth="2.5" />
              <line x1="128" y1="88" x2="156" y2="88" stroke="#ffffff" strokeWidth="2.5" />
              <polygon points="128,88 123,98 133,98" fill="#ffffff" />
              <polygon points="156,88 151,98 161,98" fill="#ffffff" />
            </g>
          )}

          {/* HEAVY AI QUANTUM CORE */}
          {(activeProp === 'ai_power_core' || animState === 'heavy_ai') && (
            <g className="insi-prop-aicore">
              <circle
                className="insi-quantum-orb"
                cx="91"
                cy="105"
                r="16"
                fill="rgba(56, 189, 248, 0.25)"
                stroke="#38bdf8"
                strokeWidth="2"
              />
              <circle cx="91" cy="105" r="6" fill="#e0f2fe" />
            </g>
          )}

          {/* HOLOGRAPHIC 3D CHART SCANNER */}
          {(activeProp === 'chart_holo' || animState === 'viewing_charts') && (
            <g className="insi-prop-chartholo">
              <rect x="118" y="70" width="46" height="34" rx="6" fill="rgba(15, 23, 42, 0.84)" stroke="#38bdf8" strokeWidth="1.5" />
              <rect className="holo-bar b1" x="125" y="88" width="6" height="10" rx="1.5" fill="#38bdf8" />
              <rect className="holo-bar b2" x="135" y="81" width="6" height="17" rx="1.5" fill="#2dd4bf" />
              <rect className="holo-bar b3" x="145" y="75" width="6" height="23" rx="1.5" fill="#fbbf24" />
            </g>
          )}

          {/* AUDIO EQUALIZER WAVE DECK */}
          {(activeProp === 'audio_deck' || animState === 'audio_sync' || animState === 'dancing') && (
            <g className="insi-prop-audiodeck">
              <rect x="56" y="112" width="70" height="20" rx="10" fill="rgba(15, 23, 42, 0.88)" stroke="#38bdf8" strokeWidth="1.5" />
              <line className="eq-bar eq1" x1="68" y1="127" x2="68" y2="117" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq2" x1="77" y1="128" x2="77" y2="115" stroke="#2dd4bf" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq3" x1="86" y1="128" x2="86" y2="114" stroke="#a855f7" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq4" x1="95" y1="128" x2="95" y2="116" stroke="#facc15" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq5" x1="104" y1="128" x2="104" y2="114" stroke="#f43f5e" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq6" x1="113" y1="127" x2="113" y2="118" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" />
            </g>
          )}

          {/* SMOOTH ROUNDED WHITE DOME HEAD, BLUE VISOR BEZEL & MOTION-TRACKING EYES */}
          <g className="insi-robot-head">
            {(activeProp === 'audio_deck' || animState === 'audio_sync' || animState === 'dancing') && (
              <path
                d="M52 44 C52 10, 130 10, 130 44"
                stroke="#38bdf8"
                strokeWidth="4.5"
                strokeLinecap="round"
                fill="none"
              />
            )}

            <rect
              x="54"
              y="18"
              width="74"
              height="54"
              rx="27"
              fill="url(#insi-head-dome)"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            <g className="insi-ear-left">
              <ellipse cx="54" cy="45" rx="6" ry="11" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.1" />
              <ellipse cx="53" cy="45" rx="3" ry="6" fill="#e2e8f0" />
            </g>
            <g className="insi-ear-right">
              <ellipse cx="128" cy="45" rx="6" ry="11" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.1" />
              <ellipse cx="129" cy="45" rx="3" ry="6" fill="#e2e8f0" />
            </g>

            <path
              d="M68 24 Q91 20 114 24"
              stroke="#ffffff"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.92"
            />

            <rect
              x="63"
              y="29"
              width="56"
              height="33"
              rx="15"
              fill="url(#insi-sky-bezel)"
              stroke="#1d4ed8"
              strokeWidth="1.2"
            />

            <rect
              x="67"
              y="33"
              width="48"
              height="25"
              rx="12"
              fill="url(#insi-visor-glass)"
            />

            <path
              d="M79 66 Q91 68 103 66"
              stroke="#334155"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="2 2"
            />

            {/* HUMAN FEELINGS & MOTION-TRACKING DIGITAL EYES */}
            <g
              className="insi-digital-eyes"
              transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`}
            >
              {animState === 'sleeping' ? (
                <>
                  <path d="M73 46 Q80 52 87 46" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M95 46 Q102 52 109 46" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" />
                </>
              ) : animState === 'malware_alert' ? (
                <>
                  {/* High-Risk Malware / Hacking Alert Crimson Visor Eyes */}
                  <path d="M74 40 L86 50 M86 40 L74 50" stroke="#ef4444" strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M96 40 L108 50 M108 40 L96 50" stroke="#ef4444" strokeWidth="3.4" strokeLinecap="round" />
                </>
              ) : animState === 'legal_alert' ? (
                <>
                  {/* Developer Legal / Compliance Caution Amber Eyes */}
                  <circle cx="80" cy="45" r="7" fill="#f59e0b" />
                  <circle cx="102" cy="45" r="7" fill="#f59e0b" />
                  <circle cx="80" cy="45" r="2.8" fill="#ffffff" />
                  <circle cx="102" cy="45" r="2.8" fill="#ffffff" />
                </>
              ) : animState === 'happy' ||
                animState === 'celebrating' ||
                animState === 'dancing' ||
                animState === 'magic_import' ||
                animState === 'audio_sync' ||
                animState === 'security_pass' ? (
                <>
                  <path d="M73 48 Q80 37 87 48" stroke="url(#insi-eye-glow)" strokeWidth="3.6" strokeLinecap="round" fill="none" />
                  <path d="M95 48 Q102 37 109 48" stroke="url(#insi-eye-glow)" strokeWidth="3.6" strokeLinecap="round" fill="none" />
                  <ellipse cx="72" cy="52" rx="3.5" ry="1.8" fill="#f472b6" opacity="0.65" />
                  <ellipse cx="110" cy="52" rx="3.5" ry="1.8" fill="#f472b6" opacity="0.65" />
                </>
              ) : animState === 'confused' ? (
                <>
                  <rect x="73" y="43" width="13" height="7" rx="3.5" fill="url(#insi-eye-glow)" />
                  <circle cx="102" cy="45" r="6.5" fill="url(#insi-eye-glow)" />
                  <circle cx="100" cy="43" r="2" fill="#ffffff" />
                </>
              ) : (
                <>
                  <ellipse cx="80" cy="45" rx="7.5" ry="7" fill="url(#insi-eye-glow)" />
                  <ellipse cx="102" cy="45" rx="7.5" ry="7" fill="url(#insi-eye-glow)" />
                  <circle cx="80" cy="45" r="4.2" fill="#090d16" />
                  <circle cx="102" cy="45" r="4.2" fill="#090d16" />
                  <circle className="insi-eye-glint" cx="77.5" cy="42.5" r="2.2" fill="#ffffff" />
                  <circle className="insi-eye-glint" cx="99.5" cy="42.5" r="2.2" fill="#ffffff" />
                </>
              )}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
