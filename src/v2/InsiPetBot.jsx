import React, { useCallback, useEffect, useRef, useState } from 'react';
import './InsiPetBot.css';
import {
  insi,
  INSI_CORNERS,
  INSI_SIZES,
  INSI_STATES
} from './insiController.js';
import {
  playInsiAppear,
  playInsiChime,
  playInsiDisappear,
  playInsiSnore
} from './uiSound.js';

const CORNER_POSITIONS = {
  'bottom-right': { bottom: '76px', right: '26px', top: 'auto', left: 'auto' },
  'bottom-left': { bottom: '28px', left: '26px', top: 'auto', right: 'auto' },
  'top-right': { top: '88px', right: '28px', bottom: 'auto', left: 'auto' },
  'mid-right': { top: '44%', right: '24px', bottom: 'auto', left: 'auto' },
  'top-left': { top: '88px', left: '28px', bottom: 'auto', right: 'auto' },
  'mid-left': { top: '46%', left: '24px', bottom: 'auto', right: 'auto' }
};

const AMBIENT_ACTIVITIES = [
  { state: 'idle', prop: 'chair_laptop', size: 'md' },
  { state: 'reading', prop: 'chair_laptop', size: 'sm' },
  { state: 'drinking', prop: 'coffee_chair', size: 'md' },
  { state: 'viewing_charts', prop: 'chart_holo', size: 'md' },
  { state: 'typing', prop: 'chair_laptop', size: 'lg' },
  { state: 'walking', prop: 'chair_laptop', size: 'sm' }
];

export default function InsiPetBot({
  emptyDashboard = false
}) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [animState, setAnimState] = useState('idle');
  const [activeProp, setActiveProp] = useState('chair_laptop');
  const [sizeVariant, setSizeVariant] = useState('md');
  const [corner, setCorner] = useState('bottom-right');

  const fadeTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const sleepingFromInactivityRef = useRef(false);
  const cornerIdxRef = useRef(0);
  const sizeIdxRef = useRef(1);
  const activityIdxRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
  }, []);

  const showInsi = useCallback(
    (nextState = 'idle', options = {}) => {
      clearTimers();

      const validState = INSI_STATES.includes(nextState) ? nextState : 'idle';
      const durationMs = Number(options.durationMs) || 4800;

      // Cycle placement across 6 non-blocking zones
      const chosenCorner =
        options.corner && CORNER_POSITIONS[options.corner]
          ? options.corner
          : INSI_CORNERS[cornerIdxRef.current % INSI_CORNERS.length];
      cornerIdxRef.current = (cornerIdxRef.current + 1) % INSI_CORNERS.length;

      // Cycle size across sm, md, lg, xl
      const chosenSize =
        options.size && INSI_SIZES.includes(options.size)
          ? options.size
          : INSI_SIZES[sizeIdxRef.current % INSI_SIZES.length];
      sizeIdxRef.current = (sizeIdxRef.current + 1) % INSI_SIZES.length;

      // Resolve prop object for this state
      const resolvedProp =
        options.prop ||
        (validState === 'magic_import' || validState === 'celebrating'
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
        }, Math.max(2000, durationMs - 650));

        hideTimerRef.current = setTimeout(() => {
          setVisible(false);
          setLeaving(false);
        }, durationMs);
      }
    },
    [clearTimers]
  );

  // Subscribe to `insi` controller events & legacy `insi:summon` events
  useEffect(() => {
    const onControllerState = (event) => {
      const detail = event?.detail;
      if (!detail) return;
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
        durationMs: detail.durationMs,
        corner: detail.corner,
        sound: detail.sound
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
      } else if (action === 'success' || action === 'import') {
        insi.react('data_import');
      } else if (action === 'ai' || action === 'heavy_ai') {
        insi.react('heavy_ai');
      } else {
        insi.observe();
      }
    };

    // Automatically sync and dance whenever any <audio> element plays on the page!
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

  // Initial website load: insi briefly appears in its brown pedestal chair with the 101 laptop, waves hello, and disappears
  useEffect(() => {
    const bootTimer = setTimeout(() => {
      showInsi('observing', {
        prop: 'chair_laptop',
        size: 'md',
        corner: 'bottom-right',
        durationMs: 4500
      });
      stepTimerRef.current = setTimeout(() => {
        setAnimState('waving');
        setActiveProp('chair_laptop');
      }, 1500);
    }, 1500);

    return () => {
      clearTimeout(bootTimer);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [showInsi]);

  // Empty dashboard: sleeps quietly in chair
  useEffect(() => {
    if (emptyDashboard) {
      insi.react('empty');
    }
  }, [emptyDashboard]);

  // Long inactivity (60s): falls asleep, wakes up surprised when user interacts
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
          size: 'md',
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

  // Lower ambient frequency (every 95 seconds) doing a different activity in a different place & size each time
  useEffect(() => {
    const ambientInterval = setInterval(() => {
      if (sleepingFromInactivityRef.current) return;
      const pick = AMBIENT_ACTIVITIES[activityIdxRef.current % AMBIENT_ACTIVITIES.length];
      activityIdxRef.current += 1;
      showInsi(pick.state, {
        prop: pick.prop,
        size: pick.size,
        durationMs: 4600
      });
    }, 95000);

    return () => clearInterval(ambientInterval);
  }, [showInsi]);

  if (!visible) return null;

  const posStyle = CORNER_POSITIONS[corner] || CORNER_POSITIONS['bottom-right'];
  const showChairAndBooks =
    activeProp === 'chair_laptop' ||
    activeProp === 'coffee_chair' ||
    animState === 'idle' ||
    animState === 'reading' ||
    animState === 'typing' ||
    animState === 'sleeping';

  return (
    <div
      className={`insi-pet-stage ${leaving ? 'insi-leaving' : 'insi-entering'} state-${animState} prop-${activeProp} size-${sizeVariant} corner-${corner}`}
      style={posStyle}
      data-testid="insi-ai-mascot"
      data-insi-state={animState}
      data-insi-prop={activeProp}
      data-insi-size={sizeVariant}
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
        {animState === 'confused' && (
          <div className="insi-emotive-bubbles">
            <span className="insi-question-bubble">?</span>
            <span className="insi-sweat-drop" />
          </div>
        )}
        {(animState === 'heavy_ai' || animState === 'thinking') && (
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
        {(animState === 'magic_import' || animState === 'celebrating' || animState === 'happy') && (
          <div className="insi-sparkles">
            <span className="spark s1">✦</span>
            <span className="spark s2">★</span>
            <span className="spark s3">✦</span>
          </div>
        )}
      </div>

      {/* 3D Futuristic White & Metallic-Blue Robot Mascot Rig (Inspired by Reference Art) */}
      <div className="insi-robot-rig">
        <div className="insi-ambient-halo" />
        {(animState === 'heavy_ai' || activeProp === 'ai_power_core') && (
          <div className="insi-quantum-ring-outer" />
        )}

        <svg
          className="insi-robot-svg"
          viewBox="0 0 180 176"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 3D White Ceramic Robot Shell */}
            <linearGradient id="insi-white-shell" x1="15%" y1="5%" x2="85%" y2="95%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* 3D Smooth Rounded Head Dome */}
            <radialGradient id="insi-head-dome" cx="35%" cy="25%" r="72%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>

            {/* Metallic Sky/Cobalt Blue Visor Bezel & Joints (matching reference image) */}
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

            {/* Deep Glossy Navy Visor */}
            <linearGradient id="insi-visor-glass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="55%" stopColor="#060b16" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Expressive Glowing Cyan/Blue Eyes */}
            <linearGradient id="insi-eye-glow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="45%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            {/* Cognac-Brown Mid-Century Pedestal Scoop Chair (matching reference image) */}
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

            {/* Magician Gold/Cyan Gradient */}
            <linearGradient id="insi-magic-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>

          {/* Floor Shadow */}
          <ellipse
            className="insi-floor-shadow"
            cx="95"
            cy="164"
            rx="54"
            ry="7.5"
            fill="rgba(15, 23, 42, 0.32)"
          />

          {/* ============================================================
              SCENE OBJECT 1: COGNAC-BROWN PEDESTAL ARMCHAIR & STACK OF BOOKS
              (Matches uploaded reference image /public/assets/aistudio/AI-chatbots_a8dcf8ca.jpeg)
             ============================================================ */}
          {showChairAndBooks && (
            <g className="insi-chair-and-books">
              {/* Stack of 6 Books on the Left (matching reference image) */}
              <g className="insi-book-stack">
                <rect x="14" y="152" width="34" height="6" rx="1.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
                <rect x="16" y="146" width="31" height="6" rx="1.5" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                <rect x="15" y="140" width="30" height="6" rx="1.5" fill="#b45309" stroke="#78350f" strokeWidth="1" />
                <rect x="18" y="134" width="27" height="6" rx="1.5" fill="#64748b" stroke="#1e293b" strokeWidth="1" />
                <rect x="19" y="128" width="25" height="6" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="1" />
                <rect x="21" y="122" width="22" height="6" rx="1.5" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
              </g>

              {/* Pedestal Trumpet Base of the Brown Chair */}
              <path
                d="M78 138 L98 138 L108 156 C108 159, 68 159, 68 156 Z"
                fill="url(#insi-chair-leather)"
                stroke="#78350f"
                strokeWidth="1.2"
              />
              <ellipse cx="88" cy="157" rx="22" ry="4" fill="#78350f" />

              {/* Curved Scoop Shell Backrest & Armrests */}
              <path
                d="M46 68 C44 54, 128 54, 130 70 L134 118 C134 134, 114 142, 90 142 C64 142, 48 132, 48 116 Z"
                fill="url(#insi-chair-leather)"
                stroke="#fbbf24"
                strokeWidth="1.2"
                strokeOpacity="0.45"
              />
              {/* Inner Warm Cushion */}
              <path
                d="M54 72 C54 60, 122 60, 122 72 L124 116 C124 128, 108 135, 89 135 C68 135, 55 127, 55 114 Z"
                fill="url(#insi-chair-inner)"
              />
            </g>
          )}

          {/* ============================================================
              ROBOT TORSO WITH FRIENDLY GEOMETRIC CHEST SMILEY (:U:)
             ============================================================ */}
          <g className="insi-robot-torso">
            {/* Segmented Metallic Blue Neck */}
            <rect x="83" y="69" width="16" height="10" rx="4" fill="url(#insi-metallic-blue)" />
            <line x1="84" y1="74" x2="98" y2="74" stroke="#93c5fd" strokeWidth="1.4" />

            {/* Blue Collar Ring */}
            <ellipse cx="91" cy="80" rx="16" ry="4" fill="url(#insi-sky-bezel)" />

            {/* Smooth Sculpted White Chest */}
            <path
              d="M66 80 C66 75, 116 75, 116 80 L112 116 C112 122, 70 122, 70 116 Z"
              fill="url(#insi-white-shell)"
              stroke="#cbd5e1"
              strokeWidth="1.4"
            />

            {/* Friendly Geometric Chest Smiley Pattern from Reference Image */}
            <g className="insi-chest-emblem" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round">
              <path d="M84 89 Q86 86 89 88" fill="none" />
              <path d="M94 88 Q97 86 99 89" fill="none" />
              <circle cx="85" cy="95" r="1.2" fill="#1e293b" />
              <circle cx="98" cy="95" r="1.2" fill="#1e293b" />
              <path d="M88 94 L88 101 C88 104, 95 104, 95 101 L95 94" fill="none" />
              <line x1="87" y1="107" x2="96" y2="107" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
            </g>
          </g>

          {/* ============================================================
              ROBOT LEGS, METALLIC BLUE KNEE JOINTS & SCULPTED SHOES
             ============================================================ */}
          <g className="insi-robot-legs">
            {/* Pelvis Joint */}
            <rect x="73" y="114" width="36" height="10" rx="5" fill="url(#insi-metallic-blue)" />

            {/* Left Leg & Knee Ball Joint */}
            <g className="insi-leg-left">
              <circle cx="80" cy="124" r="7.5" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.2" />
              <path
                d="M73 126 L87 126 L85 151 L75 151 Z"
                fill="url(#insi-white-shell)"
                stroke="#94a3b8"
                strokeWidth="1.2"
              />
              {/* Left Rounded Futuristic Shoe + Ankle Wheel Disc */}
              <circle cx="73" cy="153" r="4.5" fill="#1e293b" stroke="#93c5fd" strokeWidth="1.2" />
              <path
                d="M72 149 C72 143, 95 143, 96 154 C96 159, 72 159, 72 154 Z"
                fill="url(#insi-white-shell)"
                stroke="#60a5fa"
                strokeWidth="1.4"
              />
              <path d="M80 154 Q88 151 95 155" stroke="url(#insi-sky-bezel)" strokeWidth="3" strokeLinecap="round" />
            </g>

            {/* Right Leg & Knee Ball Joint */}
            <g className="insi-leg-right">
              <circle cx="104" cy="124" r="7.5" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.2" />
              <path
                d="M97 126 L111 126 L109 151 L99 151 Z"
                fill="url(#insi-white-shell)"
                stroke="#94a3b8"
                strokeWidth="1.2"
              />
              {/* Right Rounded Futuristic Shoe + Ankle Wheel Disc */}
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

          {/* ============================================================
              LEFT ARM & ARTICULATED BLUE HAND
             ============================================================ */}
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
            {/* Articulated Blue Hand */}
            <circle cx="67" cy="110" r="5.5" fill="url(#insi-metallic-blue)" />
            <path d="M70 108 L76 108 M70 111 L76 111" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* ============================================================
              LAPTOP WITH "101" ON LID (From Reference Image)
             ============================================================ */}
          {activeProp === 'chair_laptop' && (
            <g className="insi-prop-laptop101">
              {/* Brown Laptop Base on Lap */}
              <rect x="78" y="111" width="34" height="5" rx="2" fill="#92400e" stroke="#f59e0b" strokeWidth="0.9" />
              {/* Angled White Laptop Screen with "101" */}
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

          {/* ============================================================
              RIGHT ARM + DYNAMIC OBJECT PROPS (Magician Wand, Coffee, AI Core, Chart)
             ============================================================ */}
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

            {/* OBJECT 2: MAGICIAN STICK / MAGIC WAND (When Data is Imported) */}
            {(activeProp === 'magician_wand' || animState === 'magic_import') && (
              <g className="insi-prop-wand">
                {/* Sleek Magician Stick with White Tips & Glowing Star */}
                <line
                  x1="121"
                  y1="110"
                  x2="156"
                  y2="68"
                  stroke="#0f172a"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <line
                  x1="121"
                  y1="110"
                  x2="127"
                  y2="103"
                  stroke="#f8fafc"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <line
                  x1="149"
                  y1="76"
                  x2="156"
                  y2="68"
                  stroke="#fef08a"
                  strokeWidth="4.4"
                  strokeLinecap="round"
                />
                {/* Glowing Starburst at Tip of Magician Stick */}
                <polygon
                  className="insi-wand-star"
                  points="158,56 161,63 169,64 163,69 165,76 158,72 151,76 153,69 147,64 155,63"
                  fill="url(#insi-magic-gold)"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
                {/* Magic Arc & Levitating Data Cubes */}
                <path
                  className="insi-magic-arc"
                  d="M156 64 Q128 24 64 42"
                  stroke="url(#insi-magic-gold)"
                  strokeWidth="2.2"
                  strokeDasharray="4 4"
                  fill="none"
                />
                <rect
                  className="insi-magic-cube c1"
                  x="138"
                  y="36"
                  width="10"
                  height="10"
                  rx="2"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
                <rect
                  className="insi-magic-cube c2"
                  x="32"
                  y="54"
                  width="9"
                  height="9"
                  rx="2"
                  fill="#a855f7"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              </g>
            )}

            {/* OBJECT 3: STEAMING ESPRESSO CUP (When Drinking) */}
            {(activeProp === 'coffee_chair' || animState === 'drinking') && (
              <g className="insi-prop-coffee">
                <rect x="116" y="96" width="15" height="16" rx="3.5" fill="#ffffff" stroke="#b45309" strokeWidth="1.5" />
                <rect x="116" y="101" width="15" height="6" fill="#b45309" />
                <path d="M131 99 C136 99, 136 108, 131 108" stroke="#ffffff" strokeWidth="1.8" fill="none" />
                <path className="insi-steam-1" d="M120 93 Q118 87 122 83" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
                <path className="insi-steam-2" d="M126 93 Q128 87 124 83" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            )}
          </g>

          {/* ============================================================
              OBJECT 4: HEAVY AI QUANTUM CORE & BINARY MATRIX (When AI is Used)
             ============================================================ */}
          {(activeProp === 'ai_power_core' || animState === 'heavy_ai') && (
            <g className="insi-prop-aicore">
              {/* Glowing Quantum Orb Held Between Hands */}
              <circle
                className="insi-quantum-orb"
                cx="91"
                cy="105"
                r="16"
                fill="rgba(56, 189, 248, 0.25)"
                stroke="#38bdf8"
                strokeWidth="2"
              />
              <ellipse
                className="insi-quantum-orbit-1"
                cx="91"
                cy="105"
                rx="26"
                ry="8"
                stroke="#60a5fa"
                strokeWidth="1.5"
                strokeDasharray="5 3"
                transform="rotate(-22 91 105)"
              />
              <ellipse
                className="insi-quantum-orbit-2"
                cx="91"
                cy="105"
                rx="26"
                ry="8"
                stroke="#a855f7"
                strokeWidth="1.5"
                strokeDasharray="5 3"
                transform="rotate(28 91 105)"
              />
              <circle cx="91" cy="105" r="6" fill="#e0f2fe" />
              {/* Lightning / Neural Synapses */}
              <path
                className="insi-neural-bolt"
                d="M42 82 L58 96 L48 102 L66 112"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                className="insi-neural-bolt"
                d="M142 82 L124 96 L134 102 L116 112"
                stroke="#a855f7"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {/* ============================================================
              OBJECT 5: HOLOGRAPHIC 3D CHART SCANNER (When Viewing Charts)
             ============================================================ */}
          {(activeProp === 'chart_holo' || animState === 'viewing_charts') && (
            <g className="insi-prop-chartholo">
              <rect
                x="118"
                y="70"
                width="46"
                height="34"
                rx="6"
                fill="rgba(15, 23, 42, 0.84)"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <rect className="holo-bar b1" x="125" y="88" width="6" height="10" rx="1.5" fill="#38bdf8" />
              <rect className="holo-bar b2" x="135" y="81" width="6" height="17" rx="1.5" fill="#2dd4bf" />
              <rect className="holo-bar b3" x="145" y="75" width="6" height="23" rx="1.5" fill="#fbbf24" />
              <polyline
                points="126,85 138,78 150,73"
                stroke="#f43f5e"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {/* ============================================================
              OBJECT 6: AUDIO EQUALIZER WAVE DECK (When Audio is Generated/Heard)
             ============================================================ */}
          {(activeProp === 'audio_deck' || animState === 'audio_sync' || animState === 'dancing') && (
            <g className="insi-prop-audiodeck">
              <rect
                x="56"
                y="112"
                width="70"
                height="20"
                rx="10"
                fill="rgba(15, 23, 42, 0.88)"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <line className="eq-bar eq1" x1="68" y1="127" x2="68" y2="117" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq2" x1="77" y1="128" x2="77" y2="115" stroke="#2dd4bf" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq3" x1="86" y1="128" x2="86" y2="114" stroke="#a855f7" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq4" x1="95" y1="128" x2="95" y2="116" stroke="#facc15" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq5" x1="104" y1="128" x2="104" y2="114" stroke="#f43f5e" strokeWidth="3.2" strokeLinecap="round" />
              <line className="eq-bar eq6" x1="113" y1="127" x2="113" y2="118" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" />
            </g>
          )}

          {/* ============================================================
              SMOOTH ROUNDED WHITE DOME HEAD, BLUE VISOR BEZEL & EXPRESSIVE EYES
              (Matches /public/assets/aistudio/AI-chatbots_a8dcf8ca.jpeg)
             ============================================================ */}
          <g className="insi-robot-head">
            {/* Studio Headphones Arch when in Audio Sync / Dancing Mode */}
            {(activeProp === 'audio_deck' || animState === 'audio_sync' || animState === 'dancing') && (
              <path
                d="M52 44 C52 10, 130 10, 130 44"
                stroke="#38bdf8"
                strokeWidth="4.5"
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Smooth Rounded White 3D Head Dome */}
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

            {/* Concentric Metallic Blue Side Ear Discs (matching reference image) */}
            <g className="insi-ear-left">
              <ellipse cx="54" cy="45" rx="6" ry="11" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.1" />
              <ellipse cx="53" cy="45" rx="3" ry="6" fill="#e2e8f0" />
            </g>
            <g className="insi-ear-right">
              <ellipse cx="128" cy="45" rx="6" ry="11" fill="url(#insi-sky-bezel)" stroke="#1e3a8a" strokeWidth="1.1" />
              <ellipse cx="129" cy="45" rx="3" ry="6" fill="#e2e8f0" />
            </g>

            {/* Top Forehead Specular Highlight */}
            <path
              d="M68 24 Q91 20 114 24"
              stroke="#ffffff"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.92"
            />

            {/* Thick Sky-Blue Visor Bezel Frame (Signature Look of Reference Robot) */}
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

            {/* Inner Deep Glossy Dark Visor */}
            <rect
              x="67"
              y="33"
              width="48"
              height="25"
              rx="12"
              fill="url(#insi-visor-glass)"
            />

            {/* Subtle Horizontal Chin Speaker Grille */}
            <path
              d="M79 66 Q91 68 103 66"
              stroke="#334155"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="2 2"
            />

            {/* Visor Glass Specular Glint */}
            <path
              d="M72 37 Q84 34 94 37"
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* HUMAN FEELINGS & EXPRESSIVE DIGITAL EYES */}
            <g className="insi-digital-eyes">
              {animState === 'sleeping' ? (
                <>
                  <path d="M73 46 Q80 52 87 46" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M95 46 Q102 52 109 46" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" />
                </>
              ) : animState === 'happy' || animState === 'celebrating' || animState === 'dancing' || animState === 'magic_import' || animState === 'audio_sync' ? (
                <>
                  {/* Joyful Smiling Arc Eyes */}
                  <path d="M73 48 Q80 37 87 48" stroke="url(#insi-eye-glow)" strokeWidth="3.6" strokeLinecap="round" fill="none" />
                  <path d="M95 48 Q102 37 109 48" stroke="url(#insi-eye-glow)" strokeWidth="3.6" strokeLinecap="round" fill="none" />
                  {/* Rosy Digital Cheek Glows */}
                  <ellipse cx="72" cy="52" rx="3.5" ry="1.8" fill="#f472b6" opacity="0.65" />
                  <ellipse cx="110" cy="52" rx="3.5" ry="1.8" fill="#f472b6" opacity="0.65" />
                </>
              ) : animState === 'confused' ? (
                <>
                  {/* Puzzled Asymmetrical Eyes */}
                  <rect x="73" y="43" width="13" height="7" rx="3.5" fill="url(#insi-eye-glow)" />
                  <circle cx="102" cy="45" r="6.5" fill="url(#insi-eye-glow)" />
                  <circle cx="100" cy="43" r="2" fill="#ffffff" />
                  <line x1="72" y1="38" x2="86" y2="41" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="95" y1="40" x2="109" y2="36" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
                </>
              ) : animState === 'heavy_ai' || animState === 'thinking' ? (
                <>
                  {/* Supercharged Focused AI Cyber Eyes */}
                  <circle cx="80" cy="45" r="7.5" fill="url(#insi-eye-glow)" />
                  <circle cx="102" cy="45" r="7.5" fill="url(#insi-eye-glow)" />
                  <circle cx="80" cy="45" r="3.2" fill="#ffffff" />
                  <circle cx="102" cy="45" r="3.2" fill="#ffffff" />
                  <path d="M72 37 L87 40" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
                  <path d="M110 37 L95 40" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
                </>
              ) : animState === 'surprised' ? (
                <>
                  <circle cx="80" cy="45" r="8" fill="url(#insi-eye-glow)" />
                  <circle cx="102" cy="45" r="8" fill="url(#insi-eye-glow)" />
                  <circle cx="78" cy="42" r="2.6" fill="#ffffff" />
                  <circle cx="100" cy="42" r="2.6" fill="#ffffff" />
                </>
              ) : (
                <>
                  {/* Large Glossy Expressive Eyes with Dual Specular Reflections (Matching Reference Photo) */}
                  <ellipse cx="80" cy="45" rx="7.5" ry="7" fill="url(#insi-eye-glow)" />
                  <ellipse cx="102" cy="45" rx="7.5" ry="7" fill="url(#insi-eye-glow)" />
                  <circle cx="80" cy="45" r="4.2" fill="#090d16" />
                  <circle cx="102" cy="45" r="4.2" fill="#090d16" />
                  <circle className="insi-eye-glint" cx="77.5" cy="42.5" r="2.2" fill="#ffffff" />
                  <circle className="insi-eye-glint" cx="99.5" cy="42.5" r="2.2" fill="#ffffff" />
                  <circle cx="82.5" cy="47.5" r="1" fill="#bae6fd" />
                  <circle cx="104.5" cy="47.5" r="1" fill="#bae6fd" />
                </>
              )}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
