import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// --- Types ---
export interface Player {
  id: number;
  name: string;
  web_name: string;
  team_id: number;
  team_name: string;
  team_short: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  price: number;
  price_display: string;
  total_points: number;
  event_points: number;
  form: number;
  selected_by_percent: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  expected_goals: number | null;
  expected_assists: number | null;
  expected_goal_involvements: number | null;
  news: string;
  chance_of_playing_next_round: number | null;
  status: string;
  fpl_score: number | null;
}

export interface PickSuggestion {
  player_id: number;
  name: string;
  web_name: string;
  team_id: number;
  team_name: string;
  team_short: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  price: number;
  price_display: string;
  pick_score: number;
  fpl_score: number;
  fixture_score: number | null;
  avg_fdr_3: number | null;
  avg_fdr_5: number | null;
  form: number | null;
  ownership: number | null;
  total_points: number | null;
  status: string;
  news: string;
  category: "recommended" | "budget" | "differential" | "watch" | "avoid";
  reasons: string[];
  risks: string[];
}

export interface PlayerDetail extends Player {
  score_breakdown: Record<string, number | null>;
  reasons: string[];
  risks: string[];
  confidence: number;
  recommendation: "BUY" | "HOLD" | "SELL" | "WATCH";
}

export interface Gameweek {
  id: number;
  name: string;
  deadline_time: string | null;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  average_entry_score: number | null;
  highest_score: number | null;
  top_element: number | null;
}

export interface Fixture {
  id: number;
  gameweek: number;
  team_h: number;
  team_h_name: string;
  team_h_short: string;
  team_a: number;
  team_a_name: string;
  team_a_short: string;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string | null;
  finished: boolean;
  team_h_score: number | null;
  team_a_score: number | null;
}

export interface FixtureDifficultyRow {
  team_id: number;
  team_name: string;
  team_short: string;
  avg_fdr_3: number | null;
  avg_fdr_5: number | null;
  avg_fdr_8: number | null;
  swing_alert: string | null;
  alert_type: string | null;
  alert_severity: "buy" | "watch" | "sell" | "avoid" | null;
  fixture_score: number | null;
  gw_fixtures: {
    gw: number;
    opponent_short: string;
    fdr: number;
    is_home: boolean | null;
    color: "green" | "yellow" | "red";
    label: string;
    fixture_count?: number;
  }[];
}

export interface SquadPlayer {
  player_id: number;
  name: string;
  web_name: string;
  position: string;
  team_id: number;
  team_name?: string;
  team_short?: string;
  price: number;
  purchase_price: number | null;
  is_starting: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
  bench_order: number | null;
  status: string;
  news: string;
  chance_of_playing: number | null;
  fpl_score: number | null;
  form: number | null;
  expected_goals?: number | null;
  expected_assists?: number | null;
}

export interface Squad {
  id: number;
  gameweek: number;
  fpl_team_id: string | null;
  team_value: number | null;
  bank: number | null;
  free_transfers: number;
  overall_rank: number | null;
  gameweek_rank: number | null;
  total_points: number | null;
  gameweek_points: number | null;
  formation: string | null;
  chips: {
    wildcard_1: boolean;
    wildcard_2: boolean;
    freehit_1: boolean;
    freehit_2: boolean;
    bench_boost: boolean;
    triple_captain: boolean;
  };
  players: SquadPlayer[];
}

export interface CaptainCandidate {
  rank: number;
  player_id: number;
  player_name: string;
  position: string;
  captain_score: number;
  base_fpl_score: number;
  fixture_difficulty: number | null;
  is_home: boolean | null;
  ownership: number | null;
  form: number | null;
  reasons: string[];
  risks: string[];
}

export interface TransferSuggestion {
  player_out_name: string;
  player_out_id: number;
  player_out_price: number;
  player_out_score: number;
  horizon_fdr_out: number;
  player_in_name: string;
  player_in_id: number;
  player_in_price: number;
  player_in_score: number;
  horizon_fdr_in: number;
  score_gain: number;
  transfer_cost: number;
  net_gain: number;
  confidence: number;
  recommendation: string;
  reason: string;
}

export interface XIResult {
  formation: string;
  gk: PlayerXI[];
  defenders: PlayerXI[];
  midfielders: PlayerXI[];
  forwards: PlayerXI[];
  bench: PlayerXI[];
  total_score: number;
}

export interface PlayerXI {
  id: number;
  name: string;
  position: string;
  price: number;
  team_id: number;
  fpl_score: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  status: string;
  form: number | null;
  chance_of_playing: number | null;
}

// --- API calls ---
export const fplApi = {
  // Sync
  sync: () => api.post("/sync"),
  getSyncStatus: () => api.get("/sync/status"),

  // Players
  getPlayers: (params?: {
    position?: string;
    team_id?: number;
    min_price?: number;
    max_price?: number;
    sort_by?: string;
    search?: string;
    limit?: number;
    offset?: number;
    status?: string;
  }) => api.get<{ total: number; players: Player[] }>("/players", { params }),

  getPlayer: (id: number) => api.get<PlayerDetail>(`/players/${id}`),
  computeScores: () => api.post("/players/compute-scores"),

  // Pick assistant
  getPickSuggestions: (params?: {
    position?: string;
    budget?: number;
    exclude_ids?: string;
    category?: string;
    limit?: number;
  }) => api.get<{ suggestions: PickSuggestion[] }>("/picks/suggestions", { params }),

  // Gameweeks
  getGameweeks: () => api.get<Gameweek[]>("/gameweeks"),
  getCurrentGW: () => api.get<Gameweek>("/gameweeks/current"),
  getChipPlannerData: () => api.get<{ 
    special_gameweeks: { gameweek: number, blanks: string[], doubles: string[] }[],
    squad_horizon: { gameweek: number, average_fdr: number, has_blank: boolean, has_double: boolean }[],
    recommendations: string[]
  }>("/gameweeks/chip-planner/data"),

  // Fixtures
  getFixtures: (params?: { gameweek?: number; team_id?: number }) =>
    api.get<Fixture[]>("/fixtures", { params }),
  getFixtureDifficulty: (num_gw?: number) =>
    api.get<FixtureDifficultyRow[]>("/fixtures/difficulty", { params: { num_gw } }),

  // Squad
  getSquad: () => api.get<{ message?: string; squad: Squad | null }>("/squad"),
  getSquadInfo: () => api.get<{ overall_rank: number | null; total_points: number | null; gameweek_points: number | null; gameweek_rank: number | null; fpl_team_id: string | null }>("/squad/info"),
  saveSquad: (data: any) => api.post("/squad", data),
  importSquad: (team_id: string) => api.post("/squad/import", { team_id }),
  getOptimalXI: () => api.get<XIResult>("/squad/xi"),
  getCaptainPicks: () =>
    api.get<{ candidates: CaptainCandidate[]; recommended_captain: string | null; recommended_vc: string | null }>("/squad/captain"),
  getTransferRecommendations: () =>
    api.get<{ free_transfers: number; bank: number; suggestions: TransferSuggestion[] }>("/squad/transfers"),

  // Simulator
  whatIf: (player_out_id: number, player_in_id: number) =>
    api.post("/simulator/what-if", { player_out_id, player_in_id }),

  // Health
  health: () => api.get("/health"),
};

export default fplApi;
