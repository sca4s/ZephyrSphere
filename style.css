/* Custom CSS Houdini Property for Upper-Left Blurred Radial Spread Transition */
@property --plague-radius {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 150%;
}

:root {
  --ui-scale: 1;
  --font-main: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;

  /* Light Theme Palette */
  --surface-bg: rgba(255, 255, 255, 0.64);
  --surface-border: rgba(255, 255, 255, 0.86);
  --surface-shadow: 0 14px 34px rgba(104, 119, 158, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.94);
  --text-primary: #243046;
  --text-secondary: #5a6b8c;
  --accent-grad: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  --accent-strong: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
  --pill-bg: rgba(255, 255, 255, 0.72);
}

[data-theme="dark"] {
  --surface-bg: rgba(26, 32, 54, 0.68);
  --surface-border: rgba(182, 203, 255, 0.28);
  --surface-shadow: 0 16px 38px rgba(6, 9, 20, 0.52), inset 0 1px 1px rgba(255, 255, 255, 0.22);
  --text-primary: #eef3ff;
  --text-secondary: #a5b6da;
  --accent-grad: linear-gradient(135deg, #3b41c5 0%, #a981bb 55%, #ffc8a9 100%);
  --accent-strong: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --pill-bg: rgba(42, 52, 84, 0.76);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
  -webkit-user-select: none;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: var(--font-main);
  color: var(--text-primary);
  background: #d9e7ff;
  touch-action: none;
}

#canvas-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  touch-action: none;
}

/* Frosted Translucent Surface + Individual Upper-Left Plague Spread Transition */
.ui-surface {
  position: relative;
  background: var(--surface-bg);
  backdrop-filter: blur(22px) saturate(185%);
  -webkit-backdrop-filter: blur(22px) saturate(185%);
  border: 1px solid var(--surface-border);
  box-shadow: var(--surface-shadow);
  border-radius: 22px;
  color: var(--text-primary);
  overflow: hidden;
  transition:
    transform 0.48s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.42s ease,
    max-height 0.48s cubic-bezier(0.22, 1, 0.36, 1),
    margin 0.48s cubic-bezier(0.22, 1, 0.36, 1),
    padding 0.48s cubic-bezier(0.22, 1, 0.36, 1),
    border-width 0.48s ease;
}

/* Individual blurred upper-left spreading wave clone inserted dynamically during theme switch */
.theme-spread-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  z-index: 25;
  --plague-radius: 0%;
  -webkit-mask-image: radial-gradient(
    circle at 0% 0%,
    rgba(0, 0, 0, 1) calc(var(--plague-radius) - 28%),
    rgba(0, 0, 0, 0.45) calc(var(--plague-radius) - 12%),
    rgba(0, 0, 0, 0) var(--plague-radius)
  );
  mask-image: radial-gradient(
    circle at 0% 0%,
    rgba(0, 0, 0, 1) calc(var(--plague-radius) - 28%),
    rgba(0, 0, 0, 0.45) calc(var(--plague-radius) - 12%),
    rgba(0, 0, 0, 0) var(--plague-radius)
  );
  filter: blur(8px);
  animation: spreadFromTopLeft 0.95s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes spreadFromTopLeft {
  0% {
    --plague-radius: 0%;
    opacity: 0.95;
  }
  75% {
    --plague-radius: 175%;
    opacity: 0.85;
  }
  100% {
    --plague-radius: 220%;
    opacity: 0;
  }
}

/* Top Utility Bar — Symmetrical height and spacing on both left and right */
#top-utility-bar {
  position: fixed;
  top: 8px;
  left: 12px;
  right: 12px;
  height: 38px;
  z-index: 30;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.brand-badge,
.top-equal-pill {
  pointer-events: auto;
  height: 36px;
  min-width: 148px;
  padding: 0 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.84rem;
  letter-spacing: -0.01em;
}

.utility-actions {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pill-btn {
  border: 1px solid var(--surface-border);
  background: var(--pill-bg);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.2s ease, background 0.25s ease;
}

.pill-btn:hover {
  transform: translateY(-1px);
}

/* Initiation Screens */
.init-screen {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.96);
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.init-screen.active {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

.modal-card {
  width: min(560px, 94vw);
  max-height: 84vh;
  overflow-y: auto;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wide-modal {
  width: min(760px, 95vw);
}

.compact-modal {
  width: min(400px, 92vw);
  text-align: center;
}

.modal-header h1, .modal-header h2 {
  font-size: 1.45rem;
  letter-spacing: -0.03em;
  margin-bottom: 4px;
}

.modal-header p {
  font-size: 0.84rem;
  color: var(--text-secondary);
}

/* Unified 2-Card Device Grid */
.device-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.device-card {
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  cursor: pointer;
}

.device-card:hover {
  transform: translateY(-3px);
}

.device-svg {
  font-size: 2rem;
}

.device-card span {
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.saved-banner {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 16px;
}

.saved-banner p {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.custom-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  font-weight: 700;
}

.biome-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.biome-pill {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 3px;
  padding: 10px 12px !important;
}

.biome-pill small {
  font-size: 0.68rem;
  font-weight: 400;
  opacity: 0.82;
  line-height: 1.2;
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-pill {
  flex: 1 1 135px;
  padding: 10px 14px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  text-align: center;
}

.option-pill.active {
  background: var(--accent-grad);
  color: #1c2536;
  border-color: rgba(255, 255, 255, 0.95);
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 4px;
}

/* Pause & Gameover Actions — Uniform Full-Width Equal Sizing */
.pause-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 4px;
}

.equal-modal-btn {
  width: 100% !important;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: none !important;
}

.pause-scene-box {
  background: var(--pill-bg);
  padding: 12px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.scene-select {
  width: 100%;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid var(--surface-border);
  background: var(--surface-bg);
  color: var(--text-primary);
  font-family: var(--font-main);
  font-size: 0.84rem;
  font-weight: 600;
  outline: none;
}

.pause-sky-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.pause-sky-btn {
  text-align: center;
  padding: 7px 6px;
  font-size: 0.76rem;
}

.pause-sky-btn.active {
  background: var(--accent-grad);
  color: #1c2536;
  font-weight: 700;
}

.primary-btn, .secondary-btn {
  padding: 11px 18px;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  font-weight: 700;
  font-size: 0.86rem;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.primary-btn {
  background: var(--accent-strong);
  color: #fff;
  flex: 1;
}

.secondary-btn {
  background: var(--pill-bg);
  color: var(--text-primary);
}

/* HUD Layout — Symmetrical Top Margin so Left & Right Panels are Equidistant from Top Bar */
#game-hud {
  position: fixed;
  inset: 52px 12px 10px 12px;
  z-index: 15;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.hud-column {
  display: flex;
  flex-direction: column;
  width: clamp(205px, 21vw, 265px);
}

.left-column {
  transform-origin: top left;
}

.right-column {
  transform-origin: top right;
}

.hud-panel {
  pointer-events: auto;
  padding: 10px 12px;
  margin-bottom: 8px;
}

/* Equalize Session Metrics & Queue & Command Height */
.top-sym-panel {
  min-height: 122px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* Slide-out & Cascading Collapse Animation */
.left-column .hud-panel.panel-hidden {
  transform: translateX(-135%);
  opacity: 0;
  max-height: 0 !important;
  min-height: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-width: 0 !important;
  pointer-events: none;
}

.right-column .hud-panel.panel-hidden {
  transform: translateX(135%);
  opacity: 0;
  max-height: 0 !important;
  min-height: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-width: 0 !important;
  pointer-events: none;
}

.device-controls.panel-hidden {
  transform: translateX(-50%) translateY(150%) !important;
  opacity: 0;
  pointer-events: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.compact-header {
  margin-bottom: 4px;
}

.hide-panel-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--surface-border);
  background: var(--pill-bg);
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.gameover-stats {
  margin: 6px 0;
}

.stat-item {
  background: var(--pill-bg);
  padding: 5px 8px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
}

.stat-item small {
  font-size: 0.58rem;
  color: var(--text-secondary);
}

.stat-item strong {
  font-size: 0.86rem;
  margin-top: 1px;
}

.telemetry-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.76rem;
}

.telemetry-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--pill-bg);
  padding: 5px 8px;
  border-radius: 10px;
  gap: 6px;
}

/* Queue & Command Stack — Matches Session Metrics height cleanly */
.arsenal-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.queue-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--pill-bg);
  padding: 5px 7px;
  border-radius: 10px;
  min-width: 0;
}

.queue-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.queue-label {
  font-size: 0.55rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}

.queue-text strong {
  font-size: 0.74rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ball-dot {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 50%;
  display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
}

.command-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.action-pill {
  width: 100%;
  text-align: center;
  padding: 6px 6px;
  font-size: 0.74rem;
  font-weight: 700;
}

.pause-pill {
  background: var(--accent-grad);
  color: #1c2536;
}

.biome-hud-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.companion-status {
  font-size: 0.78rem;
  line-height: 1.25;
  color: var(--text-primary);
}

/* Bottom Device Control Deck */
.device-controls {
  pointer-events: auto;
  position: fixed;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  transform-origin: bottom center;
  padding: 8px 12px;
  border-radius: 20px;
  width: min(500px, 95vw);
}

.touch-slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  background: var(--pill-bg);
  padding: 4px 10px;
  border-radius: 10px;
}

.slider-tag {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
}

#aim-slider {
  flex: 1;
  accent-color: #66a6ff;
  height: 6px;
  cursor: pointer;
}

.control-buttons-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.ctrl-btn {
  border: 1px solid var(--surface-border);
  background: var(--pill-bg);
  color: var(--text-primary);
  padding: 7px 6px;
  border-radius: 11px;
  font-weight: 700;
  font-size: 0.74rem;
  cursor: pointer;
  white-space: nowrap;
  text-align: center;
}

.ctrl-btn.accent {
  background: var(--accent-grad);
  color: #1f2a44;
}

.ctrl-btn.shoot {
  background: var(--accent-strong);
  color: #ffffff;
}

/* Overlays (Countdown, Pause & Game Over) */
.overlay-screen {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(6px);
}

.countdown-bubble {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
}

#countdown-number {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1;
}

#countdown-subtext {
  font-size: 0.74rem;
  color: var(--text-secondary);
  margin-top: 6px;
}

.hidden {
  display: none !important;
}

/* Mobile & Portrait Layout — Symmetrical Top Cards that Never Overlap the Rink */
@media (max-width: 820px) {
  #top-utility-bar {
    top: 6px;
    left: 8px;
    right: 8px;
    height: 34px;
  }

  .brand-badge,
  .top-equal-pill {
    height: 32px;
    min-width: 132px;
    font-size: 0.78rem;
    padding: 0 12px;
  }

  #game-hud {
    inset: 44px 8px 6px 8px;
  }

  .hud-column {
    width: calc(50vw - 12px);
    max-width: 210px;
  }

  .hud-panel {
    padding: 8px 9px;
    margin-bottom: 6px;
    border-radius: 16px;
  }

  .top-sym-panel {
    min-height: 112px;
  }

  #panel-physics,
  #panel-companion {
    display: none;
  }

  .control-buttons-row {
    grid-template-columns: repeat(3, 1fr);
  }

  .ctrl-btn {
    padding: 7px 6px;
    font-size: 0.76rem;
  }
}
