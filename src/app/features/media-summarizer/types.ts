export interface Segment {
  id: string;
  name: string;
  start: number;
  end: number;
  duration: number;
  regionId: string | null;
}

export interface Subtitle {
  start: number;
  end: number;
  text: string;
}

export interface Chapter {
  start: number;
  end: number;
  title: string;
}

export interface AiSummary {
  podcastTitle: string;
  episodeTitle: string;
  overallSummary: string;
  chapters: Chapter[];
  keyTakeaways: string[];
  tags: string[];
  error?: string;
}
