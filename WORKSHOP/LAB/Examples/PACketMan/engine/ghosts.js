import { mazeCoordinates } from "./checkpoints.js";

export const GHOST_STEP_MS = 750;
export const GHOST_GRACE_TICKS = 4;

export function ghostSafeCells(maze) {
  return new Set([maze.start, maze.destination, ...maze.sections.map((section) => section.gate)]
    .map((cell) => cell.join(",")));
}

export function ghostWalkableCells(maze) {
  const safe = ghostSafeCells(maze);
  return new Map([...mazeCoordinates(maze)].filter(([key]) => !safe.has(key)));
}

export function createGhosts(maze) {
  return maze.ghosts.map((ghost) => ({ ...ghost, position: [...ghost.spawn], patrolIndex: 0 }));
}

function neighbors([row, column]) {
  return [[row - 1, column], [row, column - 1], [row + 1, column], [row, column + 1]];
}

function distancesFrom(cells, start) {
  const distances = new Map();
  if (!cells.has(start.join(","))) return distances;
  const queue = [start];
  distances.set(start.join(","), 0);
  for (let index = 0; index < queue.length; index += 1) {
    const cell = queue[index];
    for (const next of neighbors(cell)) {
      const key = next.join(",");
      if (cells.has(key) && !distances.has(key)) {
        distances.set(key, distances.get(cell.join(",")) + 1);
        queue.push(next);
      }
    }
  }
  return distances;
}

export function stepGhosts(maze, ghosts, packetPosition) {
  const cells = ghostWalkableCells(maze);
  const chaseDistances = distancesFrom(cells, packetPosition);
  return ghosts.map((ghost) => {
    const key = ghost.position.join(",");
    let distances = chaseDistances;
    let patrolIndex = ghost.patrolIndex;
    if (!chaseDistances.has(key)) {
      if (key === ghost.patrol[patrolIndex].join(",")) {
        patrolIndex = (patrolIndex + 1) % ghost.patrol.length;
      }
      distances = distancesFrom(cells, ghost.patrol[patrolIndex]);
    }
    const distance = distances.get(key);
    if (distance === undefined) throw new Error(`Ghost "${ghost.id}" cannot reach its patrol.`);
    const position = distance === 0 ? ghost.position : neighbors(ghost.position)
      .find((cell) => distances.get(cell.join(",")) === distance - 1);
    if (!position) throw new Error(`Ghost "${ghost.id}" has no legal next step.`);
    return { ...ghost, position: [...position], patrolIndex };
  });
}

export function retreatGhost(maze, ghosts, ghostId, packetPosition) {
  if (!ghosts.some((ghost) => ghost.id === ghostId)) throw new Error(`Unknown caught ghost "${ghostId}".`);
  const cells = ghostWalkableCells(maze);
  const distances = distancesFrom(cells, packetPosition);
  const occupied = new Set(ghosts.filter((ghost) => ghost.id !== ghostId).map((ghost) => ghost.position.join(",")));
  let destination = null;
  let farthest = 0;
  for (const [key, distance] of distances) {
    if (distance > farthest && !occupied.has(key)) {
      destination = cells.get(key);
      farthest = distance;
    }
  }
  if (!destination) throw new Error(`Ghost "${ghostId}" has no retreat tile.`);
  return ghosts.map((ghost) => ghost.id === ghostId
    ? { ...ghost, position: [...destination], patrolIndex: 0 } : ghost);
}
