import { accessibleCells, assistanceKey, currentCheckpointLevel, mazeCoordinates } from "../engine/checkpoints.js";
import { ghostSafeCells } from "../engine/ghosts.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function ghostSprite(ghost) {
  return `<span class="ghost-sprite" data-ghost-id="${escapeHtml(ghost.id)}" data-tone="${escapeHtml(ghost.tone)}" aria-hidden="true"><span class="ghost-face"></span></span>`;
}

function ghostStatus(state) {
  if (state.view !== "playing-grid") return "Ghosts paused";
  if (state.ghostGraceTicks > 0) return "Protected - move away safely";
  if (ghostSafeCells(state.document.maze).has(state.position.join(","))) return "Safe zone";
  return "Ghost chase active";
}

export function updateGhosts(root, state) {
  const maze = root.querySelector(".maze-board");
  if (!maze) return;
  for (const cell of maze.querySelectorAll("[data-ghost-occupied]")) {
    cell.setAttribute("aria-label", cell.dataset.cellLabel);
    cell.removeAttribute("data-ghost-occupied");
  }
  for (const sprite of maze.querySelectorAll(".ghost-sprite")) sprite.remove();
  for (const ghost of state.ghosts) {
    const cell = maze.querySelector(`[data-cell="${ghost.position.join(",")}"]`);
    if (!cell) throw new Error(`Ghost "${ghost.id}" is outside the rendered maze.`);
    cell.insertAdjacentHTML("beforeend", ghostSprite(ghost));
    cell.setAttribute("aria-label", `${cell.getAttribute("aria-label")}, ${ghost.name} ghost`);
    cell.setAttribute("data-ghost-occupied", "true");
  }
  maze.dataset.protected = String(state.ghostGraceTicks > 0);
  const status = root.querySelector("[data-ghost-status]");
  const text = ghostStatus(state);
  if (status && status.textContent !== text) status.textContent = text;
  for (const location of root.querySelectorAll("[data-ghost-position]")) {
    const ghost = state.ghosts.find((item) => item.id === location.dataset.ghostPosition);
    location.textContent = `row ${ghost.position[0] + 1}, column ${ghost.position[1] + 1}`;
  }
}

function routeMetrics(level, route) {
  const links = route.linkIds.map((id) => level.network.links.find((link) => link.id === id));
  return {
    hops: links.length,
    latency: links.reduce((total, link) => total + link.latencyMs, 0),
    risk: links.reduce((total, link) => total + link.riskPoints, 0),
    available: links.every((link) => link.available),
  };
}

function sourceList(level, document) {
  const sources = level.sourceIds
    .map((id) => document.sources.find((source) => source.id === id))
    .filter(Boolean);
  return `<ul class="source-list">${sources.map((source) => `
    <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} — ${escapeHtml(source.section)}</a></li>
  `).join("")}</ul>`;
}

function levelHeader(level, index) {
  return `
    <div class="level-head">
      <div>
        <p class="eyebrow">Lesson ${index + 1} of 6</p>
        <h1>${escapeHtml(level.title)}</h1>
        <p class="muted">${escapeHtml(level.learningOutcome)}</p>
      </div>
      <span class="progress-label">${index + 1} / 6</span>
    </div>
    <div class="progress-track" role="progressbar" aria-label="Campaign progress" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${index}">
      <div class="progress-fill" style="width:${(index / 6) * 100}%"></div>
    </div>`;
}

function briefingView(state, level) {
  const index = state.levelIndex;
  return `
    <section class="panel briefing-panel" aria-labelledby="level-title">
      ${levelHeader(level, index)}
      <div class="briefing-layout">
        <div class="briefing-copy">
          <p class="arcade-badge"><span aria-hidden="true"></span> Link active · Packet 001</p>
          <h2 id="level-title" tabindex="-1">Briefing</h2>
          <p class="lead">${escapeHtml(level.briefing)}</p>
          <p><strong>Objective:</strong> ${escapeHtml(level.completion.required)}</p>
          <p>Clear all three checkpoints before delivering. Each checkpoint changes the scenario within this lesson's topic.</p>
          <p>Three ghosts roam the maze. Getting caught pauses the chase for an extra question; wrong answers retry without losing progress. Numbered checkpoints are safe spots. Press P or Escape to pause.</p>
          <ol class="mission-list">${level.checkpoints.map((checkpoint) => `<li>${escapeHtml(checkpoint.title)}</li>`).join("")}</ol>
          ${sourceList(level, state.document)}
        </div>
        <aside class="briefing-arcade" aria-label="Arcade preview">
          <p class="preview-label">Ready to route</p>
          <div class="preview-track" aria-hidden="true">
            <span class="preview-bit"></span><span class="preview-bit"></span>
            <span class="preview-packet"><i></i></span>
            <span class="preview-bit"></span><span class="preview-bit"></span>
            <span class="preview-node"></span>
          </div>
          <p class="preview-caption">3 checkpoints. 3 paths each.<br>Explore, collect bits, deliver.</p>
          <div class="button-row"><button class="primary" data-action="start">Start lesson</button></div>
        </aside>
      </div>
    </section>`;
}

function routeSummary(level, route, riskMode = false) {
  const metrics = routeMetrics(level, route);
  const linkLatencies = route.linkIds.map((id) =>
    level.network.links.find((link) => link.id === id)?.latencyMs ?? "?");
  const values = riskMode
    ? `${metrics.risk} risk points`
    : `${metrics.hops} hops · ${linkLatencies.join(" + ")} ms = ${metrics.latency} ms`;
  return `<strong>${escapeHtml(route.label)}</strong> — ${values}${metrics.available ? "" : " · unavailable"}`;
}

function board(state) {
  const maze = state.document.maze;
  const cells = mazeCoordinates(maze);
  const open = accessibleCells(state);
  const collected = new Set(state.collectedCells);
  const rows = [];
  for (let row = 0; row < maze.rows; row += 1) {
    let cellsHtml = "";
    for (let column = 0; column < maze.columns; column += 1) {
      const key = `${row},${column}`;
      if (!cells.has(key)) {
        cellsHtml += `<span class="maze-wall" aria-hidden="true"></span>`;
        continue;
      }
      const current = state.position[0] === row && state.position[1] === column;
      const destination = maze.destination[0] === row && maze.destination[1] === column;
      const next = open.has(key) && Math.abs(state.position[0] - row) + Math.abs(state.position[1] - column) === 1;
      const gateIndex = maze.sections.findIndex((section) => section.gate.join(",") === key);
      const gate = gateIndex >= 0;
      const cleared = gate && gateIndex < state.checkpointChoices.length;
      const bit = !current && !destination && !gate && !collected.has(key);
      const packetText = current ? "Controlled packet" : destination ? "Destination" : `Open cell, row ${row + 1}, column ${column + 1}${bit ? ", collectible network bit" : ""}`;
      const label = `${packetText}${gate ? `, checkpoint ${gateIndex + 1}${cleared ? " cleared" : ""}, safe zone` : ""}${next ? ", available next step" : ""}${!open.has(key) ? ", locked corridor" : ""}`;
      const ghosts = state.ghosts.filter((ghost) => ghost.position.join(",") === key);
      cellsHtml += `<button class="maze-cell" role="gridcell" data-cell="${key}" tabindex="${current ? 0 : -1}"
        data-cell-label="${escapeHtml(label)}"
        aria-label="${escapeHtml(label + ghosts.map((ghost) => `, ${ghost.name} ghost`).join(""))}"
        ${ghosts.length ? 'data-ghost-occupied="true"' : ""}
        aria-disabled="${!open.has(key)}"
        aria-current="${current ? "location" : "false"}"
        data-packet="${current}" data-destination="${destination}" data-gate="${gate}" data-cleared="${cleared}" data-next="${next}" data-bit="${bit}" data-locked="${!open.has(key)}">
        ${current ? `<span class="packet-sprite" data-direction="${state.direction}" aria-hidden="true"><i></i></span>` : destination ? `<span class="cell-objective" aria-hidden="true">▣</span>` : gate ? `<span class="gate-marker" aria-hidden="true">${gateIndex + 1}</span>` : bit ? `<span class="network-bit" aria-hidden="true"></span>` : ""}
        ${ghosts.map(ghostSprite).join("")}
      </button>`;
    }
    rows.push(`<div class="maze-row" role="row">${cellsHtml}</div>`);
  }
  return `<div class="maze-board" role="grid" aria-label="Network maze grid" data-protected="${state.ghostGraceTicks > 0}" data-frozen="${state.view !== "playing-grid"}" style="--columns:${maze.columns}">${rows.join("")}</div>`;
}

function routeOptions(level, challenge, kind) {
  const riskMode = kind === "risk";
  return `<div class="choice-list" aria-label="Available choices">${level.network.routes.map((route) => {
    const metrics = routeMetrics(level, route);
    if (kind === "risk") {
      const reduced = Math.max(0, metrics.risk - challenge.riskReductionPoints);
      return `
        <button data-choice="route" data-value="${escapeHtml(route.id)}" data-reduce-risk="false" ${metrics.available ? "" : "disabled"}>
          Choose ${escapeHtml(route.label)} (${metrics.risk} modeled risk points)
        </button>
        <button class="powerup" data-choice="route" data-value="${escapeHtml(route.id)}" data-reduce-risk="true" ${metrics.available ? "" : "disabled"}>
          Choose ${escapeHtml(route.label)} + shielding action (${reduced} modeled risk points)
        </button>`;
    }
    return `<button data-choice="route" data-value="${escapeHtml(route.id)}" ${metrics.available ? "" : "disabled"}>${routeSummary(level, route, riskMode)}</button>`;
  }).join("")}</div>`;
}

function challengeDetails(level, state) {
  const challenge = level.challenge;
  switch (challenge.type) {
    case "routing":
      return `<h3>Route comparison</h3>${routeOptions(level, challenge, "route")}
        <p class="muted">Traceroute reveals one route's hop timings; it does not choose for you.</p>`;
    case "acl":
      return `
        <h3>Packet fields</h3>
        <table class="data-table"><thead><tr><th>Packet</th><th>Source</th><th>Port</th><th>Protocol</th></tr></thead><tbody>
          ${challenge.packets.map((packet) => `<tr><td>${escapeHtml(packet.label)}</td><td>${escapeHtml(packet.sourceIp)}</td><td>${packet.destinationPort}</td><td>${escapeHtml(packet.protocol.toUpperCase())}</td></tr>`).join("")}
        </tbody></table>
        <h3>Ordered filter</h3>
        <ol>${challenge.rules.map((rule) => `<li>${escapeHtml(rule.id)}: ${escapeHtml(rule.protocol)} / port ${escapeHtml(rule.destinationPort)} → ${state.ruleEditArmed && rule.id === challenge.editableRule.id ? "allow (temporary edit)" : escapeHtml(rule.action)}</li>`).join("")}</ol>
        <p>Default action: <strong>${escapeHtml(challenge.defaultAction)}</strong></p>
        <button class="powerup" data-action="edit-rule">${state.ruleEditArmed ? "Disarm one-crossing edit" : "Arm one-crossing rule edit"}</button>
        <div class="choice-list">${challenge.packets.map((packet) => `<button data-choice="packet" data-value="${escapeHtml(packet.id)}">Try ${escapeHtml(packet.label)}</button>`).join("")}</div>`;
    case "transport":
      return `
        <h3>Delivery need</h3><p>${escapeHtml(challenge.need)}</p>
        <div class="choice-list">
          <button data-choice="transport" data-value="tcp">TCP — ordered stream with retransmission behavior</button>
          <button data-choice="transport" data-value="udp">UDP — independent datagrams; no transport-level delivery guarantee</button>
        </div>`;
    case "subnet-gateway":
      return `
        <h3>Address check</h3>
        <ul class="data-list">
          <li>Source: <strong>${escapeHtml(challenge.sourceIp)}</strong></li>
          <li>Destination: <strong>${escapeHtml(challenge.destinationIp)}</strong></li>
          <li>Local prefix: <strong>${escapeHtml(challenge.prefix)}</strong></li>
          <li>Configured gateway: <strong>${escapeHtml(challenge.gateway)}</strong></li>
          <li>Local example: <strong>${escapeHtml(challenge.localExample)}</strong></li>
        </ul>
        <div class="choice-list">
          <button data-choice="path" data-value="local">Deliver on the local subnet</button>
          <button data-choice="path" data-value="gateway">Send to the configured gateway</button>
        </div>`;
    case "qos":
      return `
        <h3>Shared bottleneck</h3><p>Policy: <strong>${escapeHtml(challenge.queuePolicy)}</strong>; service order: ${challenge.serviceOrder.map(escapeHtml).join(" → ")}.</p>
        <div class="choice-list">${challenge.classes.map((item) => `<button data-choice="class" data-value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`).join("")}</div>`;
    case "congestion-loss":
      return `
        <h3>Candidate risk strategies</h3>
        <p>Shielding reduces the selected route's displayed risk score by ${challenge.riskReductionPoints} points; it does not guarantee delivery.</p>
        ${routeOptions(level, challenge, "risk")}`;
    default:
      return "<p>This challenge is unavailable.</p>";
  }
}

function trafficPanel(level) {
  if (!level.backgroundPackets?.length) return "";
  return `
    <section class="card" aria-labelledby="traffic-title">
      <h2 id="traffic-title">Traffic ownership</h2>
      <p><span class="packet-tag player">YOU CONTROL</span> One learner packet moves with the arrow keys.</p>
      <ul class="data-list">${level.backgroundPackets.map((packet) => `
        <li><span class="packet-tag background">SCRIPTED</span> ${escapeHtml(packet.label)} (${escapeHtml(packet.trafficClass)}) shares link <strong>${escapeHtml(packet.linkId)}</strong>.</li>
      `).join("")}</ul>
      <p>Shared bottleneck: <strong>${escapeHtml(level.bottleneckLinkId)}</strong>. Background packets are scripted and do not move under player control.</p>
    </section>`;
}

function promptPanel(level, state) {
  const feedback = state.view === "feedback";
  const title = feedback ? "Try another choice" : "Decision gate";
  const evaluation = state.lastEvaluation;
  return `
    <section class="card decision-panel ${feedback ? "feedback" : ""}" data-kind="${feedback ? "error" : ""}" aria-labelledby="decision-title">
      <p class="eyebrow">Checkpoint ${state.checkpointIndex + 1} / 3</p>
      <h2 id="decision-title" tabindex="-1">${title}: ${escapeHtml(level.checkpoints[state.checkpointIndex].title)}</h2>
      <p>${escapeHtml(level.briefing)}</p>
      ${feedback ? `<p role="status">${escapeHtml(evaluation?.message ?? state.notice)}</p><button class="primary" data-action="retry-decision">Return to the choices</button>` : challengeDetails(level, state)}
    </section>`;
}

function ghostPanel(state, level) {
  const question = level.ghostQuestions[state.encounter.questionIndex];
  const ghost = state.ghosts.find((item) => item.id === state.encounter.ghostId);
  const success = state.view === "ghost-success";
  const answering = state.view === "ghost-question";
  return `
    <section class="card decision-panel ghost-panel" data-ghost-question-id="${escapeHtml(question.id)}" aria-labelledby="ghost-title">
      <p class="eyebrow">Ghost encounter · ${escapeHtml(level.title)}</p>
      <h2 id="ghost-title" tabindex="-1">${success ? "You outsmarted the ghost!" : `Caught by ${escapeHtml(ghost.name)}`}</h2>
      <p id="ghost-safety">All ghosts are paused. Progress is safe: ${state.checkpointChoices.length} / 3 checkpoints cleared and ${state.bitsCollected} network bits collected.</p>
      <h3 id="ghost-question">${escapeHtml(question.prompt)}</h3>
      ${answering ? `<div class="choice-list">${question.choices.map((choice) => `
        <button data-choice="ghost" data-value="${escapeHtml(choice.id)}" aria-describedby="ghost-title ghost-question ghost-safety">${escapeHtml(choice.label)}</button>
      `).join("")}</div>` : `<p role="status">${escapeHtml(state.encounter.evaluation.message)}</p>
        <button class="primary" data-action="${success ? "continue-ghost" : "retry-ghost"}">${success ? "Return to maze" : "Retry ghost question"}</button>`}
      <p class="muted">${success ? "When you return, this ghost retreats and you are protected for a short escape window." : "Answer correctly to send the ghost away. There is no time limit or lost progress."}</p>
    </section>`;
}

function ghostGuide(state) {
  return `<details class="card ghost-guide">
    <summary>Ghosts and safe zones</summary>
    <p>Each ghost patrols its own region and chases you when you enter it. Ghosts can use dim corridors, but never enter numbered checkpoints, the start, or the destination.</p>
    <p>Questions and pause mode freeze every ghost. A correct answer sends the catcher away and gives you a short protected escape window. Press P or Escape to pause while planning.</p>
    <ul class="ghost-roster">${state.ghosts.map((ghost) => `<li>
      <span class="ghost-swatch" data-tone="${escapeHtml(ghost.tone)}" aria-hidden="true"></span>
      <strong>${escapeHtml(ghost.name)}</strong>
      <span data-ghost-position="${escapeHtml(ghost.id)}">row ${ghost.position[0] + 1}, column ${ghost.position[1] + 1}</span>
    </li>`).join("")}</ul>
  </details>`;
}

function gameView(state, level) {
  const active = currentCheckpointLevel(state);
  const prompt = state.view === "decision-prompt" || state.view === "feedback";
  const encounter = state.view.startsWith("ghost-");
  const paused = state.view === "paused";
  let contextPanel;
  if (encounter) contextPanel = ghostPanel(state, level);
  else if (paused) {
    contextPanel = `<section class="card decision-panel pause-panel"><h2>Chase paused</h2><p>Your packet and every ghost are frozen. Review the maze or a hint, then use Resume chase or press P / Escape.</p></section>`;
  } else if (prompt) contextPanel = promptPanel(active, state);
  else {
    contextPanel = `<section class="card"><p class="eyebrow">${state.checkpointChoices.length} / 3 checkpoints cleared</p><h2>${escapeHtml(level.checkpoints[state.checkpointIndex].title)}</h2><p>${escapeHtml(active.briefing)}</p><p>Upper and lower mean the north and south corridors; direct crosses the middle. Clear all three gates before reaching the destination.</p></section>`;
  }
  const traceroute = state.tracerouteVisible
    ? `<section class="card" data-traceroute aria-labelledby="trace-title"><h2 id="trace-title">Traceroute probe</h2><ol>${active.network.routes[0].linkIds.map((id, index) => {
      const link = active.network.links.find((item) => item.id === id);
      return `<li>Hop ${index + 1}: ${escapeHtml(link.from)} → ${escapeHtml(link.to)}, ${link.latencyMs} ms</li>`;
    }).join("")}</ol></section>`
    : "";
  return `
    <div class="game-heading">${levelHeader(level, state.levelIndex)}</div>
    <ol class="checkpoint-track" aria-label="Checkpoint progress">${level.checkpoints.map((checkpoint, index) => `
      <li data-state="${index < state.checkpointChoices.length ? "cleared" : index === state.checkpointChoices.length ? "next" : "locked"}">
        <strong>${index + 1}</strong> ${escapeHtml(checkpoint.title)} <span>${index < state.checkpointChoices.length ? "Cleared" : index === state.checkpointChoices.length ? "Next" : "Locked"}</span>
      </li>`).join("")}</ol>
    <div class="game-layout">
      <div class="game-column">
        <section class="card" aria-labelledby="maze-title">
          <div class="arcade-status">
            <h2 id="maze-title">Move through the network</h2>
            <p class="bit-counter" role="status" aria-live="polite"><span>Network bits</span><strong>${String(state.bitsCollected).padStart(3, "0")}</strong></p>
          </div>
          <p class="maze-instructions">Arrow keys / WASD, direction buttons, or adjacent tiles. Numbered gates pause for a decision. Dim corridors are locked; explore lit side paths for extra bits.</p>
          <div class="chase-controls">
            <p class="ghost-status" data-ghost-status role="status">${ghostStatus(state)}</p>
            <button data-action="toggle-pause" aria-keyshortcuts="p Escape" ${state.view === "playing-grid" || paused ? "" : "disabled"}>${paused ? "Resume chase" : "Pause chase"} <span aria-hidden="true">(P / Esc)</span></button>
          </div>
          ${board(state)}
          <fieldset class="direction-pad" ${state.view !== "playing-grid" ? "disabled" : ""}>
            <legend class="sr-only">Move packet</legend>
            <button data-move="up" aria-label="Move up">↑</button>
            <button data-move="left" aria-label="Move left">←</button>
            <button data-move="down" aria-label="Move down">↓</button>
            <button data-move="right" aria-label="Move right">→</button>
          </fieldset>
          <p class="network-key"><span class="packet-tag player"><span class="legend-packet" aria-hidden="true"></span> Controlled packet</span> <span class="legend-destination" aria-hidden="true">▣</span> Destination · Gates 1 → 2 → 3</p>
          <p class="status" role="status" aria-live="polite">${escapeHtml(state.notice)}</p>
          <div class="button-row">
            ${level.challenge.type === "routing" ? `<button data-action="traceroute" ${encounter ? "disabled" : ""}>Reveal traceroute probe</button>` : ""}
            <button data-action="hint-method" ${encounter ? "disabled" : ""}>Show method hint</button>
            ${state.assistanceUsed.includes(assistanceKey(state, "method")) ? `<button data-action="hint-solution" ${encounter ? "disabled" : ""}>Show worked solution</button>` : ""}
            <button class="quiet" data-action="restart">Restart session</button>
          </div>
          ${state.shownHint && !encounter ? `<p class="hint-copy" role="status">${escapeHtml(state.shownHint)}</p>` : ""}
        </section>
        ${traceroute}
      </div>
      <aside class="side-column" aria-label="Lesson information">
        ${contextPanel}
        ${ghostGuide(state)}
        ${trafficPanel(active)}
        <details class="card" ${prompt ? "open" : ""}><summary>Current checkpoint's network links</summary><p>Values describe the next network segment, not grid movement time.</p><ul class="data-list">${active.network.links.map((link) => `
          <li>${escapeHtml(link.id)}: ${link.latencyMs} ms · ${link.riskPoints} risk points · ${link.available ? "available" : "unavailable"}</li>
        `).join("")}</ul></details>
      </aside>
    </div>`;
}

function completionView(state, level) {
  const next = state.levelIndex + 1;
  return `
    <section class="panel" aria-labelledby="complete-title">
      ${levelHeader(level, state.levelIndex)}
      <h2 id="complete-title" tabindex="-1">Lesson complete</h2>
      <p class="lead">${escapeHtml(state.notice || level.completion.required)}</p>
      <p>All ${state.checkpointChoices.length} checkpoints cleared. ${state.bitsCollected} network bits collected across the campaign.</p>
      <p>Completed lessons: ${state.completedLevelIds.length} of ${state.document.levels.length}.</p>
      <button class="primary" data-action="advance">${next < state.document.levels.length ? `Continue to lesson ${next + 1}` : "View campaign summary"}</button>
    </section>`;
}

function summaryView(state) {
  const checkpoints = state.document.levels.filter((level) => state.completedLevelIds.includes(level.id))
    .reduce((total, level) => total + level.checkpoints.length, 0);
  return `
    <section class="panel" aria-labelledby="summary-title">
      <p class="eyebrow">Campaign complete</p>
      <h1 id="summary-title" tabindex="-1">Your network route is complete</h1>
      <p class="lead">You completed ${state.completedLevelIds.length} of ${state.document.levels.length} lessons.</p>
      <p>${checkpoints} checkpoints cleared. ${state.bitsCollected} network bits collected.</p>
      <p>${state.ghostQuestionsSolved} extra ghost questions answered.</p>
      <h2>Completed lessons</h2>
      <ul class="completion-list">${state.completedLevelIds.map((id) => {
        const level = state.document.levels.find((item) => item.id === id);
        return `<li>${escapeHtml(level?.title ?? id)}</li>`;
      }).join("")}</ul>
      <h2>Assistance used</h2>
      <p>${state.assistanceUsed.length ? `${state.assistanceUsed.length} help item${state.assistanceUsed.length === 1 ? "" : "s"} used.` : "No hints or worked solutions used."}</p>
      <button class="primary" data-action="restart">Start a fresh session</button>
    </section>`;
}

export function renderApp(state) {
  const level = state.document.levels[state.levelIndex];
  if (state.view === "briefing") return briefingView(state, level);
  if (["playing-grid", "decision-prompt", "feedback", "paused", "ghost-question", "ghost-feedback", "ghost-success"].includes(state.view)) {
    return gameView(state, level);
  }
  if (state.view === "dropped-feedback") {
    return `
      <section class="panel feedback" data-kind="error" aria-labelledby="drop-title">
        ${levelHeader(level, state.levelIndex)}
        <h2 id="drop-title" tabindex="-1">Packet dropped by the scripted hazard</h2>
        <p role="status">${escapeHtml(state.notice)}</p>
        <p>Your route-risk decision remains accepted. The next attempt uses the next authored trace and adds no learner penalty.</p>
        <button class="primary" data-action="retry-delivery">Retry delivery</button>
      </section>`;
  }
  if (state.view === "level-complete") return completionView(state, level);
  if (state.view === "summary") return summaryView(state);
  return `<section class="panel"><h1 tabindex="-1">The game is unavailable.</h1></section>`;
}

export function renderContentError(message) {
  return `<section class="panel error-panel" aria-labelledby="error-title">
    <h1 id="error-title" tabindex="-1">Content could not be loaded</h1>
    <p role="alert">${escapeHtml(message)}</p>
    <button class="primary" data-action="retry-load">Retry loading</button>
  </section>`;
}
