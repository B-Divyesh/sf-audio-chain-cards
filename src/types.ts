export type ToolKind = 'Audacity / editor' | 'FFmpeg' | 'Other';
export type Verdict = 'Review' | 'Better' | 'Same' | 'Worse';

export interface ChainStep {
  id: string;
  title: string;
  tool: ToolKind;
  action: string;
  settings: string;
  listenFor: string;
  ffmpegFilter?: string;
  complete: boolean;
}

export interface ReviewLabel {
  id: string;
  seconds: number;
  note: string;
  verdict: Verdict;
  createdAt: string;
}

export interface ChainCard {
  schemaVersion: 1;
  id: string;
  title: string;
  goal: string;
  safetyNote: string;
  createdAt: string;
  updatedAt: string;
  steps: ChainStep[];
  labels: ReviewLabel[];
  history: Array<{ at: string; note: string }>;
}

export interface PortableCard {
  format: 'chain-cards';
  version: 1;
  exportedAt: string;
  card: ChainCard;
}
