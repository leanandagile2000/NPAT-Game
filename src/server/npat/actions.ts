"use server";

import {
  createGameForm as _create,
  joinGameForm as _join,
  updateRoundDurationAction as _dur,
  startGameAction as _sg,
  startNextRoundAction as _snr,
  saveSubmissionAction as _save,
  finalizeRoundIfDueAction as _fin,
  endRoundEarlyAction as _early,
  endGameAction as _end,
  heartbeatAction as _hb,
} from "./games";

export async function createGameForm(
  a: Parameters<typeof _create>[0],
  b: Parameters<typeof _create>[1],
) {
  return _create(a, b);
}

export async function joinGameForm(
  a: Parameters<typeof _join>[0],
  b: Parameters<typeof _join>[1],
) {
  return _join(a, b);
}

export async function updateRoundDurationAction(minutes: number) {
  return _dur(minutes);
}

export async function startGameAction() {
  return _sg();
}

export async function startNextRoundAction() {
  return _snr();
}

export async function saveSubmissionAction(row: Parameters<typeof _save>[0]) {
  return _save(row);
}

export async function finalizeRoundIfDueAction() {
  return _fin();
}

export async function endRoundEarlyAction() {
  return _early();
}

export async function endGameAction() {
  return _end();
}

export async function heartbeatAction() {
  return _hb();
}
