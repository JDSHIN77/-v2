
import React, { useState } from 'react';
import { Calendar, Trash2, RefreshCw, Sparkles, MousePointerClick, Plus, BarChart3, Pencil, Check, Palmtree, Eraser, Lock } from 'lucide-react';
import { Staff, MonthSchedule, ShiftInfo, Cinema, StaffStats, ShiftData } from '../types';
import { formatDateKey, getCinemaMonthRange } from '../utils/helpers';
import { HOLIDAYS } from '../constants';

interface MatrixViewProps {
    currentDate: Date;
    staffList: Staff[];
    schedules: MonthSchedule;
    managedShifts: Record<string, ShiftInfo>;
    isGenerating: boolean;
    generatingTarget: string | null;
    onRequestClear: () => void;
    onRequestManualClear: () => void;
    generateSchedule: (cinemaId: 'BUWON' | 'OUTLET', weekIdx?: number) => void;
    onOpenWeeklyClear: (weekIdx: number, cinemaId: 'BUWON' | 'OUTLET') => void;
    openManualModal: (dateKey: string, staff: Staff, currentShift: ShiftData | null) => void;
    stats: StaffStats[];
    cinemas: Cinema[];
    onUpdateCinemaName: (id: string, name: string) => void;
}

const CinemaHeader: React.FC<{ cinema: Cinema, staffCount: number, onUpdate: (name: string) => void, onGenerate: () => void, isGenerating: boolean }> = ({ cinema, staffCount, onUpdate, onGenerate, isGenerating }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(cinema.name);

    if (isEditing) {
        return (
            <div className={`p-2 flex items-center justify-center gap-2 border-r border-slate-200 ${cinema.id === 'BUWON' ? 'bg-indigo-50' : 'bg-orange-50'}`} style={{ gridColumn: `span ${staffCount + 1}` }}>
                <input 
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { onUpdate(tempName); setIsEditing(false); } if (e.key === 'Escape') { setIsEditing(false); setTempName(cinema.name); } }}
                    className="px-2 py-1 text-xs font-bold rounded border border-slate-300 w-full max-w-[150px]"
                />
                <button onClick={() => { onUpdate(tempName); setIsEditing(false); }} className="p-1 bg-green-500 text-white rounded"><Check size={12}/></button>
            </div>
        );
    }

    return (
        <div 
            className={`p-1.5 flex items-center justify-between px-4 gap-2 text-sm font-bold border-r border-slate-200 group transition-all ${cinema.id === 'BUWON' ? 'text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100' : 'text-orange-700 bg-orange-50/50 hover:bg-orange-100'}`} 
            style={{ gridColumn: `span ${staffCount + 1}` }}
        >
            <div onClick={() => setIsEditing(true)} className="flex items-center gap-2 cursor-pointer">
                <span>{cinema.id === 'BUWON' ? '🏢' : '🛍️'} {cinema.name}</span>
                <Pencil size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
            </div>
            <button 
                onClick={onGenerate}
                disabled={isGenerating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black border shadow-sm transition-all active:scale-95 ${cinema.id === 'BUWON' ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' : 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'} disabled:opacity-50`}
            >
                {isGenerating ? <RefreshCw className="animate-spin" size={12}/> : <Sparkles size={12}/>}
                자동생성
            </button>
        </div>
    );
};

export const MatrixView: React.FC<MatrixViewProps> = ({ 
    currentDate, staffList, schedules, managedShifts, isGenerating, 
    generatingTarget, onRequestClear, onRequestManualClear, generateSchedule, onOpenWeeklyClear, openManualModal, stats, cinemas, onUpdateCinemaName
}) => {
    const days = getCinemaMonthRange(currentDate);
    const buwonStaff = staffList.filter(s => s.cinema === 'BUWON');
    const outletStaff = staffList.filter(s => s.cinema === 'OUTLET');

    const buwonCinema = cinemas.find(c => c.id === 'BUWON')!;
    const outletCinema = cinemas.find(c => c.id === 'OUTLET')!;

    return (
      <div className="flex flex-col h-full p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Calendar className="text-indigo-600" /> 월간 근무 일정표
                </h2>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <MousePointerClick size={14} className="text-blue-500"/>
                    <span className="font-medium text-slate-700">각 지점의 <span className="text-indigo-600 font-bold">자동 생성</span> 버튼을 눌러 근무를 배정하세요.</span>
                </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                 <button onClick={onRequestManualClear} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"><Trash2 size={16} /> 월간 수동 삭제</button>
                 <button onClick={onRequestClear} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"><Eraser size={16} /> 월간 자동 삭제</button>
            </div>
        </div>

        {/* Schedule Matrix - Enforced minimum height to prevent disappearance */}
        <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[500px]">
            <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/10">
                <div className="min-w-max">
                    <div className="sticky top-0 z-30 shadow-sm border-b border-slate-200">
                        <div className="grid bg-slate-50" style={{ gridTemplateColumns: `100px repeat(${buwonStaff.length}, 100px) 60px 2px repeat(${outletStaff.length}, 100px) 60px` }}>
                            <div className="p-3 border-r border-slate-200"></div>
                            <CinemaHeader 
                                cinema={buwonCinema} 
                                staffCount={buwonStaff.length} 
                                onUpdate={(val) => onUpdateCinemaName('BUWON', val)} 
                                onGenerate={() => generateSchedule('BUWON')}
                                isGenerating={isGenerating && generatingTarget === 'BUWON'}
                            />
                            <div className="bg-slate-300"></div>
                            <CinemaHeader 
                                cinema={outletCinema} 
                                staffCount={outletStaff.length} 
                                onUpdate={(val) => onUpdateCinemaName('OUTLET', val)} 
                                onGenerate={() => generateSchedule('OUTLET')}
                                isGenerating={isGenerating && generatingTarget === 'OUTLET'}
                            />
                        </div>
                        <div className="grid bg-white" style={{ gridTemplateColumns: `100px repeat(${buwonStaff.length}, 100px) 60px 2px repeat(${outletStaff.length}, 100px) 60px` }}>
                            <div className="p-3 text-[10px] font-black text-slate-400 text-center flex items-center justify-center border-r border-slate-200 bg-slate-50/50">날짜/요일</div>
                            {buwonStaff.map(s => (
                                <div key={s.id} className="p-3 border-r border-slate-200 text-center">
                                    <div className="font-bold text-slate-800 text-xs truncate">{s.name}</div>
                                    <div className="text-[9px] text-slate-400">{s.position}</div>
                                </div>
                            ))}
                            <div className="p-3 border-r border-slate-200 text-center bg-slate-50/50 flex items-center justify-center font-bold text-[10px] text-slate-400">합계</div>
                            <div className="bg-slate-300"></div>
                            {outletStaff.map(s => (
                                <div key={s.id} className="p-3 border-r border-slate-200 text-center">
                                    <div className="font-bold text-slate-800 text-xs truncate">{s.name}</div>
                                    <div className="text-[9px] text-slate-400">{s.position}</div>
                                </div>
                            ))}
                            <div className="p-3 border-r border-slate-200 text-center bg-slate-50/50 flex items-center justify-center font-bold text-[10px] text-slate-400">합계</div>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100 bg-white">
                        {days.map((dateObj, index) => {
                            const dateKey = formatDateKey(dateObj);
                            const dayData = schedules[dateKey] || {};
                            const dayNum = dateObj.getDate();
                            const dayOfWeek = dateObj.getDay(); 
                            const holidayName = HOLIDAYS[dateKey];
                            const isRed = dayOfWeek === 0 || !!holidayName;
                            const isBlue = !isRed && dayOfWeek === 6; 
                            const isToday = new Date().toLocaleDateString() === dateObj.toLocaleDateString();
                            
                            const weekIndex = Math.floor(index / 7);

                            // Modified Count Logic
                            const buwonCount = staffList.filter(s => {
                                const sh = dayData[s.id]?.value;
                                if (!sh || sh === 'OFF' || sh === 'LEAVE') return false;
                                if (s.cinema === 'BUWON') {
                                    // Buwon staff on DUAL shift does NOT count for Buwon
                                    if (sh.startsWith('DUAL_')) return false;
                                    return true;
                                }
                                return false;
                            }).length;

                            const outletCount = staffList.filter(s => {
                                const sh = dayData[s.id]?.value;
                                if (!sh || sh === 'OFF' || sh === 'LEAVE') return false;
                                if (s.cinema === 'OUTLET') {
                                    // Outlet staff on any shift (that is not OFF/LEAVE) counts for Outlet
                                    return true; 
                                }
                                if (s.cinema === 'BUWON') {
                                    // Buwon staff on DUAL shift counts for Outlet
                                    if (sh.startsWith('DUAL_')) return true;
                                    return false;
                                }
                                return false;
                            }).length;

                            const rowBgClass = isRed ? 'bg-red-50 hover:bg-red-100/80' : isBlue ? 'bg-blue-50 hover:bg-blue-100/80' : 'hover:bg-slate-50';

                            // Calculate Full Date Range for Week Header
                            const weekEndDate = new Date(dateObj);
                            weekEndDate.setDate(dateObj.getDate() + 6);
                            const startMmDd = `${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
                            const endMmDd = `${String(weekEndDate.getMonth() + 1).padStart(2, '0')}.${String(weekEndDate.getDate()).padStart(2, '0')}`;

                            return (
                                <React.Fragment key={dateKey}>
                                    {dayOfWeek === 4 && (
                                        <div className="flex items-center justify-between bg-indigo-50/60 px-4 py-2 border-y border-slate-200 sticky left-0 z-10 w-full group/week">
                                            <span className="text-[10px] font-black text-indigo-700 flex items-center gap-2 min-w-[100px]">
                                                <Calendar size={12}/> {weekIndex + 1}주차 ({startMmDd} ~ {endMmDd})
                                            </span>
                                            
                                            <div className="flex items-center gap-6 opacity-0 group-hover/week:opacity-100 transition-opacity">
                                                {/* BUWON Controls */}
                                                <div className="flex items-center gap-1 bg-white/50 rounded-lg p-0.5 border border-indigo-100/50">
                                                    <button 
                                                        onClick={() => generateSchedule('BUWON', weekIndex)}
                                                        disabled={isGenerating}
                                                        className="px-2 py-1 bg-white text-indigo-600 text-[9px] font-bold rounded border border-indigo-200 shadow-sm hover:bg-indigo-50 flex items-center gap-1"
                                                    >
                                                        {isGenerating && generatingTarget === `BUWON-${weekIndex}` ? <RefreshCw className="animate-spin" size={10}/> : <Sparkles size={10}/>}
                                                        생성
                                                    </button>
                                                    <button 
                                                        onClick={() => onOpenWeeklyClear(weekIndex, 'BUWON')}
                                                        className="px-2 py-1 bg-white text-slate-500 text-[9px] font-bold rounded border border-slate-200 shadow-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 flex items-center gap-1"
                                                    >
                                                        <Trash2 size={10}/> 삭제
                                                    </button>
                                                </div>

                                                {/* OUTLET Controls */}
                                                <div className="flex items-center gap-1 bg-white/50 rounded-lg p-0.5 border border-orange-100/50">
                                                    <button 
                                                        onClick={() => generateSchedule('OUTLET', weekIndex)}
                                                        disabled={isGenerating}
                                                        className="px-2 py-1 bg-white text-orange-600 text-[9px] font-bold rounded border border-orange-200 shadow-sm hover:bg-orange-50 flex items-center gap-1"
                                                    >
                                                        {isGenerating && generatingTarget === `OUTLET-${weekIndex}` ? <RefreshCw className="animate-spin" size={10}/> : <Sparkles size={10}/>}
                                                        생성
                                                    </button>
                                                    <button 
                                                        onClick={() => onOpenWeeklyClear(weekIndex, 'OUTLET')}
                                                        className="px-2 py-1 bg-white text-slate-500 text-[9px] font-bold rounded border border-slate-200 shadow-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 flex items-center gap-1"
                                                    >
                                                        <Trash2 size={10}/> 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className={`grid h-12 border-b border-slate-100 relative ${rowBgClass}`} style={{ gridTemplateColumns: `100px repeat(${buwonStaff.length}, 100px) 60px 2px repeat(${outletStaff.length}, 100px) 60px` }}>
                                        {isToday && <div className="absolute inset-0 border-2 border-indigo-500 z-10 pointer-events-none"></div>}
                                        <div className={`p-1 border-r border-slate-200 flex flex-col items-center justify-center relative ${isToday ? 'z-20' : ''}`}>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-xs font-black ${isRed ? 'text-red-600' : isBlue ? 'text-blue-600' : 'text-slate-700'}`}>{String(dayNum).padStart(2, '0')}</span>
                                                <span className={`text-[9px] font-black ${isRed ? 'text-red-500' : isBlue ? 'text-blue-500' : 'text-slate-400'}`}>{['일','월','화','수','목','금','토'][dayOfWeek]}</span>
                                            </div>
                                            {holidayName && <span className="text-[8px] bg-red-100 text-red-700 font-black px-1 rounded-sm mt-0.5 truncate max-w-[80px]">{holidayName}</span>}
                                        </div>

                                        {buwonStaff.map(staff => {
                                            const shiftData = dayData[staff.id];
                                            const sid = shiftData?.value;
                                            const shift = managedShifts[sid as string];
                                            const isManual = shiftData?.isManual;

                                            return (
                                                <div key={staff.id} onClick={() => openManualModal(dateKey, staff, shiftData || null)} className="p-1 border-r border-slate-100 flex items-center justify-center cursor-pointer group relative">
                                                    {shift ? (
                                                        <div className={`w-full h-full rounded-md text-[10px] font-black flex items-center justify-center transition-all ${shift.color} relative`}>
                                                            {isManual && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-slate-900/40 rounded-full"></div>}
                                                            {shift.label}
                                                        </div>
                                                    ) : <Plus size={14} className="text-slate-300 opacity-0 group-hover:opacity-100"/>}
                                                </div>
                                            );
                                        })}
                                        <div className="p-1 border-r border-slate-200 flex items-center justify-center bg-white/40">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${buwonCount >= 2 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{buwonCount}</span>
                                        </div>
                                        <div className="bg-slate-300"></div>
                                        {outletStaff.map(staff => {
                                            const shiftData = dayData[staff.id];
                                            const sid = shiftData?.value;
                                            const shift = managedShifts[sid as string];
                                            const isManual = shiftData?.isManual;

                                            return (
                                                <div key={staff.id} onClick={() => openManualModal(dateKey, staff, shiftData || null)} className="p-1 border-r border-slate-100 flex items-center justify-center cursor-pointer group relative">
                                                    {shift ? (
                                                        <div className={`w-full h-full rounded-md text-[10px] font-black flex items-center justify-center transition-all ${shift.color} relative`}>
                                                             {isManual && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-slate-900/40 rounded-full"></div>}
                                                            {shift.label}
                                                        </div>
                                                    ) : <Plus size={14} className="text-slate-300 opacity-0 group-hover:opacity-100"/>}
                                                </div>
                                            );
                                        })}
                                        <div className="p-1 border-r border-slate-200 flex items-center justify-center bg-white/40">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${outletCount >= 2 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{outletCount}</span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>

        {/* Statistics Table - Constrained max height for balance */}
        <div className="shrink-0 max-h-[300px] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">
                {cinemas.map(cinema => {
                    const cStats = stats.filter(s => s.cinema === cinema.id);
                    return (
                        <div key={cinema.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                            <div className={`px-5 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10 ${cinema.id === 'BUWON' ? 'bg-indigo-50/80' : 'bg-orange-50/80'}`}>
                                <div className="flex items-center gap-2">
                                    <BarChart3 size={16} className={cinema.id === 'BUWON' ? 'text-indigo-600' : 'text-orange-600'} />
                                    <h4 className="font-bold text-sm text-slate-800">{cinema.name} 근무 통계</h4>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">이번 달 합계</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="p-3 pl-5 font-bold whitespace-nowrap">이름</th>
                                            <th className="p-3 text-center text-blue-600 font-bold whitespace-nowrap">오픈</th>
                                            <th className="p-3 text-center text-orange-600 font-bold whitespace-nowrap">미들</th>
                                            <th className="p-3 text-center text-purple-600 font-bold whitespace-nowrap">마감</th>
                                            <th className="p-3 text-center text-slate-900 font-black bg-slate-100/50 whitespace-nowrap">총 근무</th>
                                            <th className="p-3 text-center text-red-600 font-bold flex items-center justify-center gap-1 whitespace-nowrap">
                                                <Palmtree size={12}/> 주말/공휴
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {cStats.map(s => {
                                            const totalWork = s.counts.OPEN + s.counts.MIDDLE + s.counts.CLOSE;
                                            return (
                                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 pl-5 font-bold text-slate-800 flex flex-col">
                                                        <span>{s.name}</span>
                                                        <span className="text-[9px] text-slate-400 font-medium">{s.position}</span>
                                                    </td>
                                                    <td className="p-3 text-center font-medium text-slate-600 bg-blue-50/10">{s.counts.OPEN}</td>
                                                    <td className="p-3 text-center font-medium text-slate-600 bg-orange-50/10">{s.counts.MIDDLE}</td>
                                                    <td className="p-3 text-center font-medium text-slate-600 bg-purple-50/10">{s.counts.CLOSE}</td>
                                                    <td className="p-3 text-center font-black text-slate-800 bg-slate-100/50">{totalWork}</td>
                                                    <td className="p-3 text-center font-black text-red-600 bg-red-50/10">{s.counts.weekendWork}</td>
                                                </tr>
                                            );
                                        })}
                                        {cStats.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">근무 내역이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    );
};
