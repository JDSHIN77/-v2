
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Calendar, Users, ChevronLeft, ChevronRight, 
  MonitorPlay, X, Trash2, Sparkles, RefreshCw, Check, Plus, Eraser, Plane
} from 'lucide-react';
import { Staff, MonthSchedule, ShiftType, ShiftInfo, Cinema, ShiftData, StaffStats, LeaveRecord, AnnualLeaveConfig } from './types';
import { DEFAULT_SHIFTS, CINEMAS as INITIAL_CINEMAS, HOLIDAYS } from './constants';
import { formatDateKey, getCinemaMonthRange } from './utils/helpers';
import { MatrixView } from './components/ScheduleMatrix';
import { StaffManagement } from './components/StaffManagement';
import { LeaveManagement } from './components/LeaveManagement';

const CUSTOM_COLORS = [
  'bg-pink-50 text-pink-700 border-pink-200 ring-1 ring-pink-100',
  'bg-cyan-50 text-cyan-700 border-cyan-200 ring-1 ring-cyan-100',
  'bg-lime-50 text-lime-700 border-lime-200 ring-1 ring-lime-100',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 ring-1 ring-fuchsia-100',
  'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-100',
  'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-100',
  'bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-100',
  'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-100',
  'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-100',
  'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-100',
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'staff' | 'leave'>('calendar');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingTarget, setGeneratingTarget] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isManualClearModalOpen, setIsManualClearModalOpen] = useState(false);
  const [weeklyClearTarget, setWeeklyClearTarget] = useState<{weekIdx: number, cinemaId: 'BUWON' | 'OUTLET'} | null>(null);
  
  const [cinemas, setCinemas] = useState<Cinema[]>(INITIAL_CINEMAS);
  const [managedShifts, setManagedShifts] = useState<Record<string, ShiftInfo>>(DEFAULT_SHIFTS);
  const [manualModalData, setManualModalData] = useState<{dateKey: string, staff: Staff, currentShift: ShiftData | undefined} | null>(null);
  const [tempSelectedShift, setTempSelectedShift] = useState<string | null>(null);
  
  // Custom Shift Creation State
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');

  // Leave Management State
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [annualConfig, setAnnualConfig] = useState<AnnualLeaveConfig>({});

  const [staffList, setStaffList] = useState<Staff[]>([
    { id: '1', name: '김미소', cinema: 'BUWON', position: '점장' },
    { id: '2', name: '이열정', cinema: 'BUWON', position: '매니저' },
    { id: '3', name: '박친절', cinema: 'BUWON', position: '운영매니저' },
    { id: '4', name: '최성실', cinema: 'BUWON', position: '운영매니저' },
    { id: '5', name: '정정확', cinema: 'OUTLET', position: '운영매니저' },
    { id: '6', name: '강체력', cinema: 'OUTLET', position: '운영매니저' },
    { id: '7', name: '한성실', cinema: 'OUTLET', position: '운영매니저' },
  ]);
  
  const [schedules, setSchedules] = useState<MonthSchedule>({});

  const generateSchedule = useCallback((targetCinema: 'BUWON' | 'OUTLET', targetWeekIdx?: number) => {
    const isWeekly = targetWeekIdx !== undefined;
    const loadingKey = isWeekly ? `${targetCinema}-${targetWeekIdx}` : targetCinema;
    
    setIsGenerating(true);
    setGeneratingTarget(loadingKey);

    setTimeout(() => {
      const days = getCinemaMonthRange(currentDate);
      let newSchedules = JSON.parse(JSON.stringify(schedules));
      const targetStaff = staffList.filter(s => s.cinema === targetCinema);
      
      if (targetStaff.length < 2) {
          alert('직원이 부족하여 스케줄을 생성할 수 없습니다. (최소 2명 필요)');
          setIsGenerating(false);
          setGeneratingTarget(null);
          return;
      }

      // 1. 통계 초기화
      const balanceStats: Record<string, { OPEN: number, MIDDLE: number, CLOSE: number, WEEKEND: number }> = {};
      targetStaff.forEach(s => {
          balanceStats[s.id] = { OPEN: 0, MIDDLE: 0, CLOSE: 0, WEEKEND: 0 };
      });

      // 기존 데이터 통계 반영
      days.forEach((day, idx) => {
         const currentWeekIdx = Math.floor(idx / 7);
         const dKey = formatDateKey(day);
         const dayData = newSchedules[dKey] || {};
         const isTargetWeek = isWeekly && currentWeekIdx === targetWeekIdx;
         
         targetStaff.forEach(s => {
             const shiftData = dayData[s.id];
             if (shiftData && (!isTargetWeek || shiftData.isManual)) {
                 const shift = shiftData.value;
                 if (shift === 'OPEN' || shift === 'DUAL_OPEN') balanceStats[s.id].OPEN++;
                 if (shift === 'MIDDLE' || shift === 'DUAL_MIDDLE') balanceStats[s.id].MIDDLE++;
                 if (shift === 'CLOSE' || shift === 'DUAL_CLOSE') balanceStats[s.id].CLOSE++;
                 const isWE = day.getDay() === 0 || day.getDay() === 6 || !!HOLIDAYS[dKey];
                 if (isWE && (shift.includes('OPEN') || shift.includes('MIDDLE') || shift.includes('CLOSE'))) {
                     balanceStats[s.id].WEEKEND++;
                 }
             }
         });
      });

      // 2. 스케줄 생성 (주 단위 순회)
      for (let i = 0; i < days.length; i += 7) {
        const weekIdx = Math.floor(i / 7);
        if (isWeekly && weekIdx !== targetWeekIdx) continue;

        const weekIndices: number[] = [];
        for(let j=0; j<7; j++) {
            if(i+j < days.length) weekIndices.push(i+j);
        }
        
        // --- [STEP 1] 일별 최소 필요 인원 계산 ---
        const dailyMinReq = weekIndices.map(dayGlobalIdx => {
            const dKey = formatDateKey(days[dayGlobalIdx]);
            
            // 본인 지점 스태프의 수동 근무 확인
            const targetManuals = targetStaff.map(s => newSchedules[dKey]?.[s.id]).filter(shift => shift?.isManual);
            let hasManualOpen = targetManuals.some(s => s?.value === 'OPEN');
            let hasManualClose = targetManuals.some(s => s?.value === 'CLOSE');

            // 타 지점 스태프의 지원 근무 확인 (겸직)
            // 아울렛 스케줄 생성 시, 타 지점(부원) 직원의 겸직오픈/겸직마감이 있으면 해당 포지션 충족으로 간주
            if (targetCinema === 'OUTLET') {
                 const otherStaff = staffList.filter(s => s.cinema !== targetCinema);
                 otherStaff.forEach(s => {
                     const shift = newSchedules[dKey]?.[s.id];
                     if (shift?.isManual) {
                         if (shift.value === 'DUAL_OPEN') hasManualOpen = true;
                         if (shift.value === 'DUAL_CLOSE') hasManualClose = true;
                     }
                 });
            }
            
            const manualWorkerCount = targetManuals.filter(s => s?.value !== 'OFF').length;
            
            const neededAutoOpen = hasManualOpen ? 0 : 1;
            const neededAutoClose = hasManualClose ? 0 : 1;
            
            return manualWorkerCount + neededAutoOpen + neededAutoClose;
        });

        // --- [STEP 2] 주휴(OFF) 계획 수립 ---
        const dailyActiveWorkers = weekIndices.map(() => targetStaff.length);
        const plannedOffs: Record<string, number[]> = {};
        targetStaff.forEach(s => plannedOffs[s.id] = []);

        // 2-1. 수동 OFF 확인 및 인원 차감
        weekIndices.forEach((dayGlobalIdx, wLocalIdx) => {
            const dKey = formatDateKey(days[dayGlobalIdx]);
            targetStaff.forEach(s => {
                const manualShift = newSchedules[dKey]?.[s.id];
                if (manualShift?.isManual && manualShift.value === 'OFF') {
                    plannedOffs[s.id].push(wLocalIdx);
                    dailyActiveWorkers[wLocalIdx]--;
                }
            });
        });

        // 2-2. 자동 OFF 배정
        targetStaff.forEach(s => {
            const currentOffCount = plannedOffs[s.id].length;
            let needed = 2 - currentOffCount;
            if (needed <= 0) return;

            const busyIndices: number[] = [];
            weekIndices.forEach((dayGlobalIdx, wLocalIdx) => {
                const dKey = formatDateKey(days[dayGlobalIdx]);
                const manualShift = newSchedules[dKey]?.[s.id];
                if (manualShift?.isManual && manualShift.value !== 'OFF') {
                    busyIndices.push(wLocalIdx);
                }
            });

            let candidates = [0,1,2,3,4,5,6].filter(d => 
                !plannedOffs[s.id].includes(d) && !busyIndices.includes(d)
            );

            candidates.sort((a, b) => {
                const getPrevShift = (dayOffset: number) => {
                    const d = days[weekIndices[dayOffset]];
                    const prev = new Date(d); prev.setDate(prev.getDate()-1);
                    return newSchedules[formatDateKey(prev)]?.[s.id]?.value;
                };
                const prevA = getPrevShift(a);
                const prevB = getPrevShift(b);
                
                if (prevA === 'CLOSE' && prevB !== 'CLOSE') return -1;
                if (prevA !== 'CLOSE' && prevB === 'CLOSE') return 1;
                return Math.random() - 0.5;
            });

            for (const dayIdx of candidates) {
                if (needed <= 0) break;
                if (dailyActiveWorkers[dayIdx] > dailyMinReq[dayIdx]) {
                    plannedOffs[s.id].push(dayIdx);
                    dailyActiveWorkers[dayIdx]--;
                    needed--;
                }
            }
        });

        // --- [STEP 3] 일별 근무 배정 ---
        weekIndices.forEach((dayGlobalIdx, wLocalIdx) => { 
            const dateObj = days[dayGlobalIdx];
            const dateKey = formatDateKey(dateObj);
            const prevDate = new Date(dateObj);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevKey = formatDateKey(prevDate);
            const prevSchedules = newSchedules[prevKey] || {};

            if (!newSchedules[dateKey]) newSchedules[dateKey] = {};

            let manualOpen = false;
            let manualClose = false;
            let availableStaff: Staff[] = [];

            // Check own staff manual shifts
            targetStaff.forEach(s => {
                const shift = newSchedules[dateKey][s.id];
                if (shift?.isManual) {
                    if (shift.value === 'OPEN') manualOpen = true;
                    if (shift.value === 'CLOSE') manualClose = true;
                } else {
                    if (plannedOffs[s.id]?.includes(wLocalIdx)) {
                        newSchedules[dateKey][s.id] = { value: 'OFF', isManual: false };
                    } else {
                        availableStaff.push(s);
                    }
                }
            });

            // Check OTHER staff manual shifts (Dual Support)
            // 아울렛 스케줄 생성 시, 타 지점 직원의 겸직 근무가 있으면 해당 포지션은 이미 채워진 것으로 처리
            if (targetCinema === 'OUTLET') {
                 const otherStaff = staffList.filter(s => s.cinema !== targetCinema);
                 otherStaff.forEach(s => {
                     const shift = newSchedules[dateKey]?.[s.id];
                     if (shift?.isManual) {
                         if (shift.value === 'DUAL_OPEN') manualOpen = true;
                         if (shift.value === 'DUAL_CLOSE') manualClose = true;
                     }
                 });
            }

            let needOpen = manualOpen ? 0 : 1;
            let needClose = manualClose ? 0 : 1;

            if (needOpen > 0 && availableStaff.length > 0) {
                const candidates = availableStaff.filter(s => prevSchedules[s.id]?.value !== 'CLOSE');
                const pool = candidates.length > 0 ? candidates : availableStaff;
                pool.sort((a, b) => balanceStats[a.id].OPEN - balanceStats[b.id].OPEN);
                
                const picked = pool[0];
                if (picked) {
                    newSchedules[dateKey][picked.id] = { value: 'OPEN', isManual: false };
                    balanceStats[picked.id].OPEN++;
                    availableStaff = availableStaff.filter(s => s.id !== picked.id);
                    needOpen--;
                }
            }

            if (needClose > 0 && availableStaff.length > 0) {
                availableStaff.sort((a, b) => {
                    const prevA = prevSchedules[a.id]?.value === 'CLOSE';
                    const prevB = prevSchedules[b.id]?.value === 'CLOSE';
                    if (prevA && !prevB) return -1;
                    if (!prevA && prevB) return 1;

                    return balanceStats[a.id].CLOSE - balanceStats[b.id].CLOSE;
                });
                
                const picked = availableStaff[0];
                if (picked) {
                    newSchedules[dateKey][picked.id] = { value: 'CLOSE', isManual: false };
                    balanceStats[picked.id].CLOSE++;
                    availableStaff = availableStaff.filter(s => s.id !== picked.id);
                    needClose--;
                }
            }

            availableStaff.forEach(s => {
                newSchedules[dateKey][s.id] = { value: 'MIDDLE', isManual: false };
                balanceStats[s.id].MIDDLE++;
            });

            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6 || !!HOLIDAYS[dateKey];
            if (isWeekend) {
                targetStaff.forEach(s => {
                    const val = newSchedules[dateKey][s.id]?.value;
                    if (val === 'OPEN' || val === 'MIDDLE' || val === 'CLOSE') {
                        balanceStats[s.id].WEEKEND++;
                    }
                });
            }
        });
      }

      setSchedules(newSchedules);
      setIsGenerating(false);
      setGeneratingTarget(null);
    }, 500);
  }, [currentDate, staffList, schedules]);

  const clearWeeklySchedule = useCallback((weekIdx: number, cinemaId: 'BUWON' | 'OUTLET') => {
    const days = getCinemaMonthRange(currentDate);
    const newSchedules = JSON.parse(JSON.stringify(schedules));
    
    // 주간 날짜 범위 계산
    const startIdx = weekIdx * 7;
    const endIdx = Math.min(startIdx + 7, days.length);
    
    for(let i = startIdx; i < endIdx; i++) {
        const dateKey = formatDateKey(days[i]);
        const daySchedule = newSchedules[dateKey];
        
        if (daySchedule) {
             // 해당 날짜의 모든 스케줄을 순회
             Object.keys(daySchedule).forEach(staffId => {
                 const shift = daySchedule[staffId];
                 // 수동이 아닌(자동) 스케줄만 대상
                 if (!shift.isManual) { 
                     const staff = staffList.find(s => s.id === staffId);
                     // 해당 지점 직원인 경우 삭제
                     if (staff && staff.cinema === cinemaId) {
                         delete daySchedule[staffId];
                     }
                 }
             });
        }
    }
    setSchedules(newSchedules);
  }, [currentDate, schedules, staffList]);

  const clearWeeklyManualSchedule = useCallback((weekIdx: number, cinemaId: 'BUWON' | 'OUTLET') => {
    const days = getCinemaMonthRange(currentDate);
    const newSchedules = JSON.parse(JSON.stringify(schedules));
    
    const startIdx = weekIdx * 7;
    const endIdx = Math.min(startIdx + 7, days.length);
    
    for(let i = startIdx; i < endIdx; i++) {
        const dateKey = formatDateKey(days[i]);
        const daySchedule = newSchedules[dateKey];
        
        if (daySchedule) {
             // 해당 날짜의 모든 스케줄을 순회
             Object.keys(daySchedule).forEach(staffId => {
                 const shift = daySchedule[staffId];
                 // 수동 스케줄만 대상
                 if (shift.isManual) {
                     const staff = staffList.find(s => s.id === staffId);
                     // 해당 지점 직원인 경우 삭제
                     if (staff && staff.cinema === cinemaId) {
                         delete daySchedule[staffId];
                     }
                 }
             });
        }
    }
    setSchedules(newSchedules);
  }, [currentDate, schedules, staffList]);

  const stats = useMemo(() => {
    const days = getCinemaMonthRange(currentDate);
    const resultStats: StaffStats[] = [];

    staffList.forEach(s => {
      const homeCounts = { OPEN: 0, MIDDLE: 0, CLOSE: 0, OFF: 0, LEAVE: 0, weekendWork: 0 };
      const dualCounts = { OPEN: 0, MIDDLE: 0, CLOSE: 0, OFF: 0, LEAVE: 0, weekendWork: 0 };
      let hasDualWork = false;

      days.forEach(day => {
        const dateKey = formatDateKey(day);
        const shiftData = schedules[dateKey]?.[s.id];
        if (shiftData) {
            const shift = shiftData.value;
            const isWE = day.getDay() === 0 || day.getDay() === 6 || !!HOLIDAYS[dateKey];

            if (shift.startsWith('DUAL_')) {
                const norm = shift.replace('DUAL_', '') as 'OPEN'|'MIDDLE'|'CLOSE';
                
                if (s.cinema === 'BUWON') {
                    // Buwon staff working DUAL -> Counts to DUAL stats (to be shown in Outlet)
                    dualCounts[norm]++;
                    if (isWE) dualCounts.weekendWork++;
                    hasDualWork = true;
                } else {
                    // Outlet staff working DUAL -> Counts to Home stats (Outlet)
                    homeCounts[norm]++;
                    if (isWE) homeCounts.weekendWork++;
                }
            } 
            else if (['OPEN', 'MIDDLE', 'CLOSE'].includes(shift)) {
                homeCounts[shift as 'OPEN'|'MIDDLE'|'CLOSE']++;
                if (isWE) homeCounts.weekendWork++;
            }
            else if (shift === 'OFF') homeCounts.OFF++;
            else if (shift === 'LEAVE') homeCounts.LEAVE++;
        }
      });

      // Always push Home Stats
      resultStats.push({
          ...s,
          counts: homeCounts
      });

      // If Buwon staff has DUAL work, push a separate stats entry for Outlet
      if (hasDualWork && s.cinema === 'BUWON') {
          resultStats.push({
              id: `${s.id}_DUAL`,
              name: `${s.name} (겸직)`,
              position: s.position,
              cinema: 'OUTLET',
              counts: dualCounts
          });
      }
    });

    return resultStats;
  }, [schedules, staffList, currentDate]);

  const updateCinemaName = (id: string, newName: string) => {
    setCinemas(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  const handleManualSave = (specificShiftId?: string) => {
    // 인자가 있으면(더블클릭) 그 값을, 없으면(버튼클릭) 상태값을 사용
    const targetShift = typeof specificShiftId === 'string' ? specificShiftId : tempSelectedShift;

    if (!manualModalData || !targetShift) return;
    const next = { ...schedules };
    if(!next[manualModalData.dateKey]) next[manualModalData.dateKey] = {};
    
    // Day object deep copy needed for immediate UI update in some edge cases, 
    // but usually direct assignment works if key didn't exist.
    // However, specifically for deletes, copy is crucial.
    next[manualModalData.dateKey] = { ...next[manualModalData.dateKey] };

    next[manualModalData.dateKey][manualModalData.staff.id] = { 
        value: targetShift, 
        isManual: true 
    };
    
    setSchedules(next);
    setManualModalData(null);
  };

  const handleManualDelete = () => {
    if (!manualModalData) return;
    const next = { ...schedules };
    if(next[manualModalData.dateKey]) {
        next[manualModalData.dateKey] = { ...next[manualModalData.dateKey] };
        delete next[manualModalData.dateKey][manualModalData.staff.id];
    }
    setSchedules(next);
    setManualModalData(null);
  };

  const handleConfirmAddShift = () => {
      if (!newShiftName.trim()) return;
      
      const id = 'CUSTOM_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      // 기존에 추가된 커스텀 쉬프트 개수를 기반으로 색상 순차 선택
      const customShiftsCount = Object.keys(managedShifts).length - 5; // 기본 5개 제외
      const colorIndex = customShiftsCount % CUSTOM_COLORS.length;
      const selectedColor = CUSTOM_COLORS[colorIndex];

      setManagedShifts(prev => ({
          ...prev,
          [id]: { id, label: newShiftName, color: selectedColor }
      }));
      setNewShiftName('');
      setIsAddingShift(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] text-slate-900 overflow-hidden">
      <nav className="shrink-0 bg-white border-b border-slate-200 shadow-sm z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <MonitorPlay size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">근무 매니저 <span className="text-indigo-600">v2</span></h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Schedule System</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button onClick={() => setActiveTab('calendar')} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Calendar size={16}/> 근무표</button>
             <button onClick={() => setActiveTab('staff')} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'staff' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Users size={16}/> 직원 정보</button>
             <button onClick={() => setActiveTab('leave')} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'leave' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Plane size={16}/> 휴가 관리</button>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronLeft size={16} /></button>
                <span className="text-sm font-black px-4 tabular-nums">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</span>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronRight size={16} /></button>
             </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative">
        <div className="h-full flex flex-col max-w-[1600px] mx-auto">
            {activeTab === 'calendar' ? (
                <MatrixView 
                    currentDate={currentDate} 
                    staffList={staffList} 
                    schedules={schedules} 
                    managedShifts={managedShifts} 
                    isGenerating={isGenerating} 
                    generatingTarget={generatingTarget} 
                    onRequestClear={() => setIsClearModalOpen(true)}
                    onRequestManualClear={() => setIsManualClearModalOpen(true)}
                    generateSchedule={generateSchedule} 
                    onClearWeek={clearWeeklySchedule}
                    onClearManualWeek={clearWeeklyManualSchedule}
                    onOpenWeeklyClear={(weekIdx, cinemaId) => setWeeklyClearTarget({weekIdx, cinemaId})}
                    openManualModal={(dk, s, cs) => { 
                        setManualModalData({dateKey: dk, staff: s, currentShift: cs || undefined }); 
                        setTempSelectedShift(cs?.value || null); 
                        setIsAddingShift(false); // Reset adding state
                        setNewShiftName('');
                    }} 
                    stats={stats}
                    cinemas={cinemas}
                    onUpdateCinemaName={updateCinemaName}
                />
            ) : activeTab === 'staff' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <StaffManagement 
                        staffList={staffList} 
                        setStaffList={setStaffList} 
                        managedShifts={managedShifts} 
                        cinemas={cinemas}
                    />
                </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                  <LeaveManagement
                      staffList={staffList}
                      leaveRecords={leaveRecords}
                      setLeaveRecords={setLeaveRecords}
                      annualConfig={annualConfig}
                      setAnnualConfig={setAnnualConfig}
                      currentYear={currentDate.getFullYear()}
                      cinemas={cinemas}
                  />
              </div>
            )}
        </div>
      </main>

      {/* Manual Shift Modal */}
      {manualModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-bold text-slate-900">{manualModalData.staff.name}님 근무 설정</h3>
                  <p className="text-xs font-medium text-slate-400">{manualModalData.dateKey}</p>
               </div>
               <button onClick={() => setManualModalData(null)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
            </div>
            <div className="p-6">
               {isAddingShift ? (
                 <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 mb-2 block">새 근무 유형 이름</label>
                    <div className="space-y-3">
                        <input 
                            autoFocus
                            type="text" 
                            value={newShiftName}
                            onChange={(e) => setNewShiftName(e.target.value)}
                            placeholder="예: 교육, 반차"
                            className="w-full px-3 py-3 text-sm font-bold rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddShift()}
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsAddingShift(false)} className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 transition">취소</button>
                            <button onClick={handleConfirmAddShift} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-md">확인</button>
                        </div>
                    </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-3 gap-2 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                    {(Object.entries(managedShifts) as [string, ShiftInfo][]).map(([key, shift]) => (
                        <button 
                          key={key} 
                          onClick={() => setTempSelectedShift(key)}
                          onDoubleClick={() => handleManualSave(key)}
                          className={`py-3 rounded-2xl text-[11px] font-black border transition-all relative ${tempSelectedShift === key ? 'ring-2 ring-indigo-500 border-indigo-500 z-10 ' + shift.color : 'bg-slate-50 text-slate-500 border-slate-100 opacity-60 hover:opacity-100'}`}
                        >
                          {shift.label}
                          {tempSelectedShift === key && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>}
                        </button>
                    ))}
                 </div>
               )}
               
               {!isAddingShift && (
                   <div className="flex gap-2">
                      <button onClick={handleManualDelete} className="px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center">
                          <Trash2 size={20}/>
                      </button>
                      <button onClick={() => setIsAddingShift(true)} className="px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-indigo-100 hover:text-indigo-600 transition-colors flex items-center justify-center" title="근무 유형 추가">
                          <Plus size={20}/>
                      </button>
                      <button onClick={() => handleManualSave()} disabled={!tempSelectedShift} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          <Check size={18}/> 선택 적용
                      </button>
                   </div>
               )}
               <p className="text-center text-[10px] text-slate-400 mt-4">
                   * 근무 버튼을 <span className="text-indigo-600 font-bold">더블 클릭</span>하면 즉시 적용됩니다.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Clear Modal */}
      {weeklyClearTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[32px] max-w-sm text-center shadow-2xl w-full">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
            <h3 className="text-xl font-bold mb-2 text-slate-900">{weeklyClearTarget.weekIdx + 1}주차 근무 삭제</h3>
            <p className="text-slate-500 text-sm mb-6">
                <span className="font-bold text-slate-800">{weeklyClearTarget.cinemaId === 'BUWON' ? cinemas.find(c=>c.id==='BUWON')?.name : cinemas.find(c=>c.id==='OUTLET')?.name}</span>의 근무 데이터를 삭제합니다.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { 
                  clearWeeklySchedule(weeklyClearTarget.weekIdx, weeklyClearTarget.cinemaId);
                  setWeeklyClearTarget(null);
              }} className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition flex items-center justify-center gap-2">
                  <Eraser size={18} className="text-slate-400"/>
                  자동 생성된 근무만 삭제
              </button>
              <button onClick={() => { 
                  clearWeeklyManualSchedule(weeklyClearTarget.weekIdx, weeklyClearTarget.cinemaId);
                  setWeeklyClearTarget(null);
              }} className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition flex items-center justify-center gap-2">
                  <Trash2 size={18} className="text-red-400"/>
                  수동 입력한 근무만 삭제
              </button>
              <button onClick={() => setWeeklyClearTarget(null)} className="w-full py-3 text-slate-400 text-xs font-bold hover:text-slate-600 mt-2">
                  취소
              </button>
            </div>
          </div>
        </div>
      )}

      {isClearModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[32px] max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><Eraser size={32}/></div>
            <h3 className="text-xl font-bold mb-2 text-slate-900">자동 생성된 근무 삭제</h3>
            <p className="text-slate-500 text-sm mb-8">수동으로 입력한 근무는 유지하고,<br/>자동 생성된 데이터만 삭제합니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsClearModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">취소</button>
              <button onClick={() => { 
                  // Deep copy for consistency
                  const next = JSON.parse(JSON.stringify(schedules));
                  Object.keys(next).forEach(k => {
                      const daySchedule = next[k];
                      Object.keys(daySchedule).forEach(sid => {
                          if(!daySchedule[sid].isManual) delete daySchedule[sid];
                      });
                  });
                  setSchedules(next); 
                  setIsClearModalOpen(false); 
              }} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold">삭제</button>
            </div>
          </div>
        </div>
      )}

      {isManualClearModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[32px] max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
            <h3 className="text-xl font-bold mb-2 text-slate-900 text-red-600">수동 입력 근무 삭제</h3>
            <p className="text-slate-500 text-sm mb-8">직접 입력한 수동 근무 데이터가<br/>모두 삭제됩니다. 계속하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsManualClearModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">취소</button>
              <button onClick={() => { 
                  // Deep copy for consistency
                  const next = JSON.parse(JSON.stringify(schedules));
                  Object.keys(next).forEach(k => {
                      const daySchedule = next[k];
                      Object.keys(daySchedule).forEach(sid => {
                          if(daySchedule[sid].isManual) delete daySchedule[sid];
                      });
                  });
                  setSchedules(next); 
                  setIsManualClearModalOpen(false); 
              }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
