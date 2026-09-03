export interface TranscriptSegment {
  start?: number; // in seconds
  end?: number;   // in seconds
  text: string;
  speaker?: string;
}

export interface ContextMarker {
  start: number; // in seconds
  type: "chapter" | "slide";
  title?: string;
  description?: string;
  text?: string;
}

export interface ExtractionResult {
  segments: TranscriptSegment[];
  markers: ContextMarker[];
  lectureTitle?: string;
  courseName?: string;
  recordingDate?: string;
  language?: string;
  availableLanguages?: string[];
}

export type AdapterStatus = 
  | "unsupported"
  | "supported_no_transcript"
  | "loading"
  | "ready"
  | "error";

export interface AdapterInfo {
  platform: string;
  status: AdapterStatus;
  errorReason?: string;
  languages?: string[];
  currentLanguage?: string;
}

export interface DiagnosticInfo {
  version: string;
  browser: string;
  adapterPlatform: string;
  urlPattern: string; // sanitized
  status: AdapterStatus;
  errorCode?: string;
  segmentCount: number;
  markerCount: number;
  isFrame: boolean;
  dynamicLoading: boolean;
}
