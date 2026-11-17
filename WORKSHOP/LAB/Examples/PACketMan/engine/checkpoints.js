export function checkpointLevel(level, index) {
  const checkpoint = level.checkpoints[index];
  return {
    ...level,
    briefing: checkpoint.briefing,
    hints: checkpoint.hints,
    challenge: { ...level.challenge, ...checkpoint.challenge },
    network: {
      ...level.network,
      links: level.network.links.map((link) => ({
        ...link,
        ...checkpoint.linkOverrides.find((override) => override.id === link.id),
      })),
    },
  };
}

export function currentCheckpointLevel(state) {
  return checkpointLevel(state.document.levels[state.levelIndex], state.checkpointIndex);
}

export function assistanceKey(state, kind) {
  const level = state.document.levels[state.levelIndex];
  return `${level.id}:${level.checkpoints[state.checkpointIndex].id}:${kind}`;
}

function coordinateMap(paths) {
  return new Map(paths.flat().map((cell) => [cell.join(","), cell]));
}

export function mazeCoordinates(maze) {
  return coordinateMap([
    maze.approach, maze.detours,
    ...maze.sections.flatMap((section) => [
      ...Object.values(section.paths), section.connector, section.detours,
    ]),
  ]);
}

export function accessibleCells(state) {
  const maze = state.document.maze;
  return new Set(coordinateMap([
    maze.approach, maze.detours,
    ...state.checkpointChoices.flatMap((choice, index) => {
      const section = maze.sections[index];
      const paths = choice.routeId ? [section.paths[choice.routeId]] : Object.values(section.paths);
      return [...paths, section.connector, section.detours];
    }),
  ]).keys());
}
