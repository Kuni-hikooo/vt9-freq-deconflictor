export interface ScheduleLine {
  lineNum: number;
  callsign: string;
  briefTime: number;
  scheduledTO: number;
  scheduledLand: number;
  eventType: string;
  flightTime: number;
  remarks: string;
  rawText: string;
}

export interface Flight {
  id: string;
  callsign: string;
  lines: ScheduleLine[];
  eventType: string;
  briefTime: number;
  scheduledTO: number;
  scheduledLand: number;
  flightType: "single" | "section" | "division";
  isStudentSwap: boolean;
}

export interface AirspaceAssignment {
  airspace: "area4" | "moa2";
  blockUnits: number;
  physicalBlock: string;
  flexedDown: boolean;
}

export interface TacanAssignment {
  base: number;
  paired: number;
  presetName?: string;
  presetFreq?: number;
  isOverflow: boolean;
}

export interface FrequencyAssignment {
  preset: number | null;
  presetName: string | null;
  cms: number[];
}

export interface Conflict {
  type: string;
  message: string;
  involvedFlightIds: string[];
}

export interface DeconflictResult {
  flight: Flight;
  airspace: AirspaceAssignment | null;
  tacan: TacanAssignment[];
  frequencies: FrequencyAssignment;
  conflicts: Conflict[];
}
