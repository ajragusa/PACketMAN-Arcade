# PACketMan · Quickstart

## Prerequisites

- A current desktop browser with JavaScript modules enabled.
- Python 3 for the standard-library local static server.
- No package installation, backend, account, or network service is required to play.

## Run the game

From the repository root:

```sh
cd WORKSHOP/LAB/Examples/PACketMan
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in a browser. Keep the terminal running while playing. Stop the server with `Ctrl-C`.

During staged Level 1 development, use [http://127.0.0.1:8000/?dev=1](http://127.0.0.1:8000/?dev=1). This explicit local mode accepts a valid partial campaign so the first level can be played before Levels 2–6 are authored. Without `?dev=1`, startup requires all six ordered levels; the release check must reject partial campaign data.

Do not open `index.html` with `file://`: browser module and JSON loading require HTTP. Assets and content use relative URLs so a repository-subpath deployment can resolve them.

## Play with ghosts

Move with arrows, WASD, direction buttons, or adjacent tiles. Echo, Jitter, and Loop chase continuously between questions. Start, numbered gates, and destination are safe; ghosts may use dim corridors that are locked for you.

A catch freezes all movement for an extra question on the current topic. Wrong answers retry without losing progress. Correct feedback waits for **Return to maze**, then the catcher retreats and you get a short protected escape window. Extra questions do not clear required checkpoints.

Use **Pause chase**, **P**, or **Escape** to plan or read hints. Leaving the page pauses active play; return and explicitly resume when ready. Questions themselves have no deadline.

## Run the browser tests

With the same server running, open [http://127.0.0.1:8000/tests/](http://127.0.0.1:8000/tests/). The page must show a non-zero executed count, totals, and failed case IDs. Any failure or zero discovered tests is a failed run.

The runner covers domain rules, ties, boundary cases, invalid content, retries, Level 6 drops, progression, and the partial-development versus complete-campaign validation modes. A valid one-level document must be accepted in development mode and rejected by the strict campaign check. Test expectations are independently reviewed examples; do not derive expected results by calling the implementation under test.

It also exercises ghost movement, captures, safe cells, retries, retreat/protection, question rotation, and resets. Run the same 48 cases in Node with `npm test` from the game directory.

## Manual verification before release

1. Start a fresh session and complete all three checkpoints in each of the six levels: eighteen decisions in total.
2. In Level 1, verify the tied first-checkpoint routes, the faster direct route at checkpoint two, and the unavailable direct link at checkpoint three. Check that the chosen corridor opens and later sections remain locked.
3. Make a plausible wrong decision at a later checkpoint; confirm the explanation identifies the rule and retries locally without losing earlier gates or bits. Explore and backtrack through a side path without collecting the same bit twice.
4. Stand still in an unlocked ordinary corridor until a ghost catches you. Confirm a current-topic question opens and every ghost freezes. Answer incorrectly, retry the same question, answer correctly, and acknowledge feedback; check unchanged position/checkpoints/bits, retreat, and temporary protection.
5. Pause with the button and P/Escape. Read a hint safely, resume, and verify motion returns. Leave the page during active play and return; it must stay paused until you resume. Safe checkpoints and open questions must prevent captures.
6. In Level 6, choose a lowest-risk strategy, observe a scripted drop, retry without penalty, and verify that delivery completes the level.
7. Complete a keyboard-only playthrough; check visible focus, readable feedback, ghost-answer focus, and decision focus order. Timer ticks must not reset focus or scroll.
8. Enable reduced motion and use a narrow browser window; verify that no essential state depends on animation, color, or hover. Check the extra-question panel as well as the maze.
9. Interrupt data loading or use invalid authored data in a test fixture; verify a visible content error that is not treated as learner failure.
10. Record pass, fail, or not run with date, browser/environment, and evidence in `README.md`.
