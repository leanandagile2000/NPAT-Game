export type DbGame = {
  id: string;
  join_code: string;
  name: string;
  status: "lobby" | "in_progress" | "ended";
  round_duration_minutes: number;
  host_secret: string;
  used_letters: string[];
  host_participant_id: string | null;
  current_round_id: string | null;
  created_at: string;
};

export type DbParticipant = {
  id: string;
  game_id: string;
  display_name: string;
  is_host: boolean;
  created_at: string;
  heartbeat_at: string;
};

export type DbRound = {
  id: string;
  game_id: string;
  round_index: number;
  letter: string;
  status: "active" | "scored" | "aborted";
  started_at: string | null;
  ends_at: string | null;
};

export type DbSub = {
  id: string;
  round_id: string;
  participant_id: string;
  name_text: string | null;
  place_text: string | null;
  animal_text: string | null;
  thing_text: string | null;
  points_name: number;
  points_place: number;
  points_animal: number;
  points_thing: number;
};

/** Latest scored round + submissions for round-results UI between rounds. */
export type LastScoredRoundPayload = {
  round_index: number;
  letter: string;
  submissions: DbSub[];
};

export type GameState = {
  game: DbGame;
  participants: DbParticipant[];
  current_round: (DbRound & { submissions: DbSub[] }) | null;
  /** Most recently scored round (by round_index), if any. */
  last_scored_round: LastScoredRoundPayload | null;
  /** Points per scored round in order (round_index ascending), per participant. */
  round_scores_by_participant: Record<string, number[]>;
  totals: Record<string, { total: number; last_round: number; prior: number }>;
  winners: { names: string[]; score: number } | null;
  became_host?: boolean;
  self: { id: string; is_host: boolean; display_name: string } | null;
};
