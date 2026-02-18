
export type ShiftType = 'OPEN' | 'MIDDLE' | 'CLOSE' | 'OFF' | 'LEAVE' | 'DUAL_OPEN' | 'DUAL_MIDDLE' | 'DUAL_CLOSE';

export interface ShiftInfo {
  id: string;
  label: string;
  color: string;
}

export interface ShiftData {
  value: string;
  isManual: boolean;
}

export interface Staff {
  id: string;
  name: string;
  cinema: 'BUWON' | 'OUTLET';
  position: string;
}

export interface DaySchedule {
  [staffId: string]: ShiftData;
}

export interface MonthSchedule {
  [dateKey: string]: DaySchedule;
}

export interface Cinema {
  id: 'BUWON' | 'OUTLET';
  name: string;
  color: string;
}

export interface StaffStats {
  id: string;
  name: string;
  position: string;
  cinema: string;
  counts: {
    OPEN: number;
    MIDDLE: number;
    CLOSE: number;
    OFF: number;
    LEAVE: number;
    weekendWork: number;
  };
}

export interface ShortageAlert {
  date: string;
  cinemaName: string;
  count: number;
  dayName: string;
}
