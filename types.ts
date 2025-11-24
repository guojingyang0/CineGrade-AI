export enum LutFormat {
  CUBE = 'cube',
  THREE_DL = '3dl',
  VLT = 'vlt',
  PNG = 'png' // HaldCLUT
}

export enum CameraProfile {
  REC709 = 'Rec.709',
  SONY_SLOG3 = 'Sony S-Log3',
  CANON_CLOG = 'Canon C-Log',
  ARRI_LOGC = 'Arri LogC',
  DJI_DLOG = 'DJI D-Log',
  BLACKMAGIC_FILM = 'Blackmagic Film'
}

export interface ColorAnalysis {
  contrast: number; // -1.0 to 1.0
  saturation: number; // 0.0 to 2.0
  temperature: number; // -1.0 (Cool) to 1.0 (Warm)
  tint: number; // -1.0 (Green) to 1.0 (Magenta)
  shadowsColor: [number, number, number]; // RGB 0-1
  highlightsColor: [number, number, number]; // RGB 0-1
  description: string;
}

export interface GradingHistoryItem {
  id: string;
  timestamp: number;
  params: ColorAnalysis;
  promptUsed: string;
  name: string; // Auto-generated name
}

export interface GeneratedLut {
  name: string;
  content: string; // The content of the .cube file
  format: LutFormat;
}