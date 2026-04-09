'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, ChevronLeft, ChevronRight, MoreVertical, ArrowUp, Send } from 'lucide-react';
import { getStaffData, saveStaffData } from '@/app/actions';
import { StaffDBSchema, Staff, AttendanceStatus } from '@/lib/staffDB';

function getLocalYMD(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function AttendancePage() {
    const [db, setDb] = useState<StaffDBSchema | null>(null);
    const [currentDate, setCurrentDate] = useState(getLocalYMD(new Date()));
    
    const [showSettings, setShowSettings] = useState(false);
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [activeStaffDetail, setActiveStaffDetail] = useState<string | null>(null);
    
    // For dropdown on staff row
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getStaffData();
        setDb(data);
    };

    const saveData = async (newData: StaffDBSchema) => {
        setDb({ ...newData });
        await saveStaffData(newData);
    };

    if (!db) return <div className="p-8 animate-pulse text-slate-400">Loading Staff Systems...</div>;

    // Computed Stats for the active date
    const todaysLogs = db.attendance[currentDate] || {};
    let present = 0, absent = 0, halfDay = 0, paidLeave =0, weeklyOff = 0;
    
    db.staff.forEach(s => {
        const status = todaysLogs[s.id]?.status;
        if(status === 'P') present++;
        else if(status === 'A') absent++;
        else if(status === 'HD') halfDay++;
        else if(status === 'PL') paidLeave++;
        else if(status === 'WO') weeklyOff++;
    });

    const markStatus = (staffId: string, status: AttendanceStatus) => {
        const updated = { ...db };
        if (!updated.attendance[currentDate]) {
            updated.attendance[currentDate] = {};
        }
        if (!updated.attendance[currentDate][staffId]) {
            updated.attendance[currentDate][staffId] = { status: null, overtime: 0 };
        }
        updated.attendance[currentDate][staffId].status = status;
        saveData(updated);
        setOpenDropdown(null);
    };

    const shiftDate = (days: number) => {
        // Parse the literal YYYY-MM-DD safely
        const parts = currentDate.split('-');
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        d.setDate(d.getDate() + days);
        setCurrentDate(getLocalYMD(d));
    };

    const getBalanceText = (staff: Staff) => {
        // Balances: sum of advances
        const totalAdvs = staff.advances.reduce((acc, curr) => acc + curr.amount, 0);
        if (totalAdvs > 0) return <span className="text-red-600 font-bold flex items-center gap-1"><ArrowUp className="w-3 h-3"/> ₹ {totalAdvs.toLocaleString('en-IN')}</span>;
        return <span className="text-slate-400">-</span>;
    };

    // Global Pendings
    const totalPending = db.staff.reduce((acc, s) => {
        return acc + s.advances.reduce((a, b) => a + b.amount, 0);
    }, 0);

    return (
        <div className="h-full overflow-y-auto bg-slate-50 relative pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-slate-800">Staff Attendance & Payroll</h1>
                <div className="flex gap-3">
                    <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 transition">
                        Attendance Settings <Settings className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => setShowAddStaff(true)} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold transition shadow-sm">
                        <Plus className="w-4 h-4" /> Add Staff
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6 space-y-6">
                
                {/* Date Navigator */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-xl font-bold text-slate-800">
                        {currentDate.split('-').reverse().join('-')}  {/* Display as DD-MM-YYYY natively to avoid JS Date parsing confusion */}
                    </div>
                    <div className="flex bg-white rounded border border-slate-200 shadow-sm overflow-hidden text-sm">
                        <button onClick={() => shiftDate(-1)} className="px-3 py-1.5 hover:bg-slate-50 border-r border-slate-200 text-slate-500 font-bold"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={() => setCurrentDate(getLocalYMD(new Date()))} className="px-4 py-1.5 hover:bg-slate-50 text-slate-700 font-bold whitespace-nowrap">
                            Today
                        </button>
                        <button onClick={() => shiftDate(1)} className="px-3 py-1.5 hover:bg-slate-50 border-l border-slate-200 text-slate-500 font-bold"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Main Table View */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-sm">
                    {/* Summary Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 py-4 border-b border-slate-200 bg-white">
                        <div>
                            <div className="text-slate-500 text-xs mb-1">Present (P)</div>
                            <div className="font-bold text-slate-800 text-lg">{present}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">Absent (A)</div>
                            <div className="font-bold text-slate-800 text-lg">{absent}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">Half day (HD)</div>
                            <div className="font-bold text-slate-800 text-lg">{halfDay}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">Paid leave (PL)</div>
                            <div className="font-bold text-slate-800 text-lg">{paidLeave}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">Weekly off (WO)</div>
                            <div className="font-bold text-slate-800 text-lg">{weeklyOff}</div>
                        </div>
                    </div>

                    {/* Table Headers */}
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] bg-slate-50 px-6 py-3 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider"
>
                        <div>Staff Name</div>
                        <div>Mobile Number</div>
                        <div>Last Month Due</div>
                        <div>Balance</div>
                        <div>Mark Attendance</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-slate-100 min-h-[200px]">
                        {db.staff.length === 0 && (
                            <div className="p-8 text-center text-slate-400">No staff members added yet. Click "+ Add Staff" to begin.</div>
                        )}
                        {db.staff.map(staff => {
                            const currentStatus = todaysLogs[staff.id]?.status;
                            return (
                                <div key={staff.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] px-6 py-4 items-center">
                                    <div className="font-bold text-slate-700 cursor-pointer hover:text-indigo-600" onClick={() => setActiveStaffDetail(staff.id)}>{staff.name}</div>
                                    <div className="text-slate-600 text-xs font-mono">{staff.mobile}</div>
                                    <div className="text-slate-400">-</div>
                                    <div>{getBalanceText(staff)}</div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-2 items-center relative">
                                        <button 
                                            onClick={() => markStatus(staff.id, 'P')}
                                            className={`px-3 py-1 border rounded text-xs font-bold transition-colors ${currentStatus === 'P' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                            P
                                        </button>
                                        <button 
                                            onClick={() => markStatus(staff.id, 'A')}
                                            className={`px-3 py-1 border rounded text-xs font-bold transition-colors ${currentStatus === 'A' ? 'bg-red-50 text-red-600 border-red-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                            A
                                        </button>
                                        
                                        <button onClick={() => setOpenDropdown(staff.id)} className="p-1 border border-slate-200 rounded text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {openDropdown === staff.id && (
                                            <>
                                                <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                                                <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 overflow-hidden font-medium text-slate-600 text-xs">
                                                    <button className="w-full text-left px-4 py-2 hover:bg-slate-50" onClick={() => markStatus(staff.id, 'HD')}>Half day</button>
                                                    <button className="w-full text-left px-4 py-2 hover:bg-slate-50" onClick={() => markStatus(staff.id, 'PL')}>Paid leave</button>
                                                    <button className="w-full text-left px-4 py-2 hover:bg-slate-50" onClick={() => markStatus(staff.id, 'WO')}>Week off</button>
                                                    <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-indigo-600" onClick={() => {
                                                        // Trigger payroll or advance? For now just close.
                                                        setOpenDropdown(null);
                                                    }}>Add overtime</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Row */}
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] px-6 py-4 bg-slate-50 border-t border-slate-200 font-bold text-slate-700">
                        <div className="col-span-2">Pending amount</div>
                        <div>₹0</div>
                        <div className="text-red-600 flex items-center gap-1"><ArrowUp className="w-3 h-3"/> ₹ {totalPending.toLocaleString('en-IN')}</div>
                        <div></div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showSettings && <AttendanceSettingsModal 
                settings={db.settings} 
                onClose={() => setShowSettings(false)} 
                onSave={(newSettings: StaffDBSchema['settings']) => { 
                    saveData({ ...db, settings: newSettings }); 
                    setShowSettings(false); 
                }} 
            />}

            {showAddStaff && <AddStaffModal 
                onClose={() => setShowAddStaff(false)}
                onSave={(staff: Staff) => {
                    saveData({ ...db, staff: [...db.staff, staff] });
                    setShowAddStaff(false);
                }}
            />}

            {activeStaffDetail && <StaffDetailsOverlay 
                staffId={activeStaffDetail}
                db={db}
                onClose={() => setActiveStaffDetail(null)}
                saveData={saveData}
            />}
        </div>
    )
}

// ────────────────────── STAFF DETAILS OVERLAY ──────────────────────
function StaffDetailsOverlay({ staffId, db, onClose, saveData }: {staffId: string, db: StaffDBSchema, onClose: () => void, saveData: (d: StaffDBSchema) => void}) {
    const [activeTab, setActiveTab] = useState<'Attendance' | 'Payroll' | 'Transactions' | 'Details'>('Attendance');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const staffInit = db.staff.find(s => s.id === staffId)!;
    const [editForm, setEditForm] = useState({ name: staffInit.name, mobile: staffInit.mobile, monthlySalary: String(staffInit.monthlySalary) });
    const [newAdvance, setNewAdvance] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });

    const staff = db.staff.find(s => s.id === staffId);
    if (!staff) return null;

    // Shift month
    const shiftMonth = (dir: number) => {
        const parts = selectedMonth.split('-');
        let m = parseInt(parts[1]) + dir;
        let y = parseInt(parts[0]);
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }
        setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
    };

    // Calculate balances
    const getBalance = (s: Staff) => s.advances.reduce((acc, curr) => acc + curr.amount, 0);

    // Actual calendar days of the month (28/29/30/31 depending on month)
    const daysInMonth = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate();
    const strict30Days = Array.from({ length: daysInMonth }, (_, i) => {
        return `${selectedMonth}-${String(i + 1).padStart(2, '0')}`;
    }).reverse(); // Show most recent days first (matches screenshot)

    // Mark specific day
    const markDayStatus = (date: string, status: AttendanceStatus) => {
        const updated = { ...db };
        if (!updated.attendance[date]) updated.attendance[date] = {};
        if (!updated.attendance[date][staffId]) updated.attendance[date][staffId] = { status: null, overtime: 0 };
        updated.attendance[date][staffId].status = status;
        saveData(updated);
    };

    // Stats for the month
    let P = 0, A = 0, HD = 0, PL = 0, WO = 0;
    strict30Days.forEach(date => {
        const status = db.attendance[date]?.[staffId]?.status;
        if (status === 'P') P++;
        else if (status === 'A') A++;
        else if (status === 'HD') HD++;
        else if (status === 'PL') PL++;
        else if (status === 'WO') WO++;
    });

    return (
        <div className="fixed inset-0 bg-slate-100 z-[200] flex flex-col overflow-hidden">
            <div className="flex h-full">
                {/* Left Sidebar */}
                <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
                    <div className="p-4 flex items-center justify-between border-b border-slate-200">
                        <h2 className="font-bold text-slate-800 text-lg">Staff</h2>
                        <button onClick={() => {}} className="px-3 py-1 border border-indigo-200 text-indigo-600 rounded text-xs font-bold bg-indigo-50 hover:bg-indigo-100">+ Add Staff</button>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                        {db.staff.map(s => {
                            const bal = getBalance(s);
                            const isActive = s.id === staffId;
                            return (
                                <div key={s.id} onClick={() => { /* maybe allow switching here but not required if they hit back */ }} className={`p-4 cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                                    <div className="font-medium text-slate-800 text-sm mb-1 uppercase tracking-wide">{s.name}</div>
                                    <div className="flex items-center gap-1 font-bold text-red-600 text-xs tracking-tight">
                                        <ArrowUp className="w-3 h-3" /> ₹{bal.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side Work Area */}
                <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                    {/* Header */}
                    <div className="bg-white px-8 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><ChevronLeft className="w-5 h-5"/></button>
                            <h2 className="text-xl font-medium tracking-wide text-slate-800 uppercase">{staff.name}</h2>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-semibold text-sm hover:bg-slate-50 flex items-center gap-2 shadow-sm">
                                Download Salary Slip <Send className="w-4 h-4 rotate-90"/>
                            </button>
                            <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-sm shadow-sm flex items-center gap-2">
                                Make Payment <ChevronRight className="w-4 h-4 ml-2"/>
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-white px-8 flex gap-8 border-b border-slate-200 shrink-0">
                        {['Attendance', 'Payroll', 'Transactions', 'Details'].map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab as any)}
                                className={`py-3 px-1 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content Area */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {activeTab === 'Attendance' && (
                            <div className="max-w-4xl space-y-6">
                                {/* Month Navigator */}
                                <div className="flex items-center justify-between text-slate-700">
                                    <div className="font-bold text-lg">
                                        {new Date(selectedMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                    </div>
                                    <div className="flex bg-white rounded border border-slate-200 shadow-sm overflow-hidden text-sm">
                                        <button onClick={() => shiftMonth(-1)} className="px-3 py-1 hover:bg-slate-50 border-r border-slate-200 text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
                                        <div className="px-4 py-1.5 font-bold whitespace-nowrap bg-white text-slate-600">
                                            {new Date(selectedMonth + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                        </div>
                                        <button onClick={() => shiftMonth(1)} className="px-3 py-1 hover:bg-slate-50 border-l border-slate-200 text-slate-500"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                {/* Table Structure */}
                                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                                    {/* Stats Strip */}
                                    <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-slate-200">
                                        <div><div className="text-slate-500 text-xs mb-1">Present (P)</div><div className="font-bold text-slate-800 text-base">{P}</div></div>
                                        <div><div className="text-slate-500 text-xs mb-1">Absent (A)</div><div className="font-bold text-slate-800 text-base">{A}</div></div>
                                        <div><div className="text-slate-500 text-xs mb-1">Half day (HD)</div><div className="font-bold text-slate-800 text-base">{HD}</div></div>
                                        <div><div className="text-slate-500 text-xs mb-1">Paid Leave (PL)</div><div className="font-bold text-slate-800 text-base">{PL}</div></div>
                                        <div><div className="text-slate-500 text-xs mb-1">Weekly off (WO)</div><div className="font-bold text-slate-800 text-base">{WO}</div></div>
                                    </div>

                                    {/* Table Headers */}
                                    <div className="grid grid-cols-2 px-6 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                                        <div>Date</div>
                                        <div>Attendance</div>
                                    </div>

                                    {/* Rows Generation */}
                                    <div className="divide-y divide-slate-100">
                                        {strict30Days.map(date => {
                                            const status = db.attendance[date]?.[staffId]?.status;
                                            const parts = date.split('-');
                                            const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                            const formattedDateString = `${dObj.toLocaleDateString('en-GB', {weekday:'short'})}, ${parts[2]} ${dObj.toLocaleDateString('en-GB', {month:'short', year:'numeric'})}`;

                                            return (
                                                <div key={date} className="grid grid-cols-2 px-6 py-3 items-center hover:bg-slate-50">
                                                    <div className="text-sm font-medium text-slate-700">{formattedDateString}</div>
                                                    <div className="flex gap-2 items-center">
                                                        <button 
                                                            onClick={() => markDayStatus(date, 'P')}
                                                            className={`px-3 py-1 border rounded text-xs font-bold transition-colors ${status === 'P' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                                            P
                                                        </button>
                                                        <button 
                                                            onClick={() => markDayStatus(date, 'A')}
                                                            className={`px-3 py-1 border rounded text-xs font-bold transition-colors ${status === 'A' ? 'bg-red-50 text-red-600 border-red-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                                            A
                                                        </button>
                                                        <div className="group relative">
                                                            <button className="p-1 border border-slate-200 rounded text-slate-400 hover:bg-slate-50 hover:text-slate-600 cursor-pointer">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                            <div className="hidden group-hover:block absolute left-full ml-1 top-0 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 overflow-hidden font-medium text-slate-600 text-xs">
                                                                <button className="w-full text-left px-4 py-2 hover:bg-slate-50" onClick={() => markDayStatus(date, 'HD')}>Half day</button>
                                                                <button className="w-full text-left px-4 py-2 hover:bg-slate-50" onClick={() => markDayStatus(date, 'PL')}>Paid leave</button>
                                                                <button className="w-full text-left px-4 py-2 hover:bg-slate-50" onClick={() => markDayStatus(date, 'WO')}>Week off</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Payroll' && (() => {
                            // PAYROLL LOGIC:
                            // Salary base = always 30 days
                            // Working days = 30 - absent days (A count)
                            // If 31-day month with 1 absence → 30 - 1 = 29 working days
                            // HD counts as 0.5 absent (deducts 0.5 day)
                            const absentDeductions = A + (HD * 0.5);
                            const workingDays = Math.max(0, 30 - absentDeductions);
                            const perDay = (staff.monthlySalary || 0) / 30;
                            const grossPay = workingDays * perDay;
                            const advanceBalance = getBalance(staff);
                            const finalPay = Math.max(0, grossPay - advanceBalance);

                            return (
                            <div className="max-w-4xl p-8 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl text-center shadow-sm">
                                        <div className="text-xs font-bold text-emerald-600 mb-2">Present (P)</div>
                                        <div className="text-3xl font-black text-emerald-700">{P}</div>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 p-5 rounded-xl text-center shadow-sm">
                                        <div className="text-xs font-bold text-red-600 mb-2">Absent (A)</div>
                                        <div className="text-3xl font-black text-red-700">{A}</div>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-xl text-center shadow-sm">
                                        <div className="text-xs font-bold text-amber-600 mb-2">Half Day (HD)</div>
                                        <div className="text-3xl font-black text-amber-700">{HD}</div>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl text-center shadow-sm flex flex-col justify-center">
                                        <div className="text-xs font-bold text-blue-600 mb-1">{workingDays} Working Days</div>
                                        <div className="text-2xl font-black text-blue-800">₹{grossPay.toLocaleString('en-IN', {maximumFractionDigits:0})} Earned</div>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-200 p-5 rounded-xl text-center shadow-sm flex flex-col justify-center">
                                        <div className="text-xs font-bold text-orange-600 mb-1">Advance Balance</div>
                                        <div className="text-2xl font-black text-orange-800">- ₹{advanceBalance.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                                    </div>
                                    <div className="bg-green-600 border border-green-700 p-5 rounded-xl text-center shadow-sm flex flex-col justify-center text-white">
                                        <div className="text-xs font-bold text-green-100 mb-1">Final Net Payable</div>
                                        <div className="text-3xl font-black text-white">₹{finalPay.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-xl p-8 bg-slate-50 space-y-4 text-base font-medium text-slate-700 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-4 mb-4">Salary Calculation</h3>
                                    
                                    <div className="flex justify-between items-center bg-white p-4 rounded border border-slate-100 text-sm">
                                        <span className="text-slate-500">Base Salary (fixed 30-day cycle)</span>
                                        <span className="font-bold">₹{(staff.monthlySalary || 0).toLocaleString('en-IN')} / 30 days = ₹{perDay.toFixed(2)}/day</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-4 rounded border border-slate-100 text-sm">
                                        <span>Absent deductions: {A} days{HD > 0 ? ` + ${HD} HD (×0.5)` : ''} = <strong>{absentDeductions}</strong> days off</span>
                                        <span className="font-bold text-red-500">30 − {absentDeductions} = {workingDays} working days</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-4 rounded border border-slate-100">
                                        <span>Gross Pay ({workingDays} days × ₹{perDay.toFixed(2)}):</span>
                                        <span className="font-bold">₹{grossPay.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-4 rounded border border-slate-100 text-red-500">
                                        <span>Less: Advance Deductions</span>
                                        <span className="font-bold">− ₹{advanceBalance.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-6 mt-4 border-t-2 border-slate-200 flex justify-between items-center font-black text-2xl text-slate-900">
                                        <span>Final Net Payable:</span>
                                        <span className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                                            ₹{finalPay.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mt-8 flex justify-end gap-4">
                                    <button onClick={() => {
                                        const msg = `Hello ${staff.name},\nYour payroll for ${selectedMonth}:\n- Absent Days: ${A}${HD > 0 ? `, Half Days: ${HD}` : ''}\n- Working Days: ${workingDays}/30\n- Gross Pay: ₹${grossPay.toFixed(2)}\n- Advance Deductions: ₹${advanceBalance.toFixed(2)}\n- Final Net Payable: ₹${finalPay.toFixed(2)}\n\nThank you,\nPower Lines Electrical Works`;
                                        window.open(`https://wa.me/91${staff.mobile}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }} className="px-6 py-3 bg-green-500 text-white rounded font-bold hover:bg-green-600 flex items-center gap-2 shadow-sm">
                                        <Send className="w-5 h-5" /> Send WhatsApp
                                    </button>
                                </div>
                            </div>
                            );
                        })()}

                        {activeTab === 'Transactions' && (
                            <div className="max-w-4xl space-y-6">
                                {/* Add New Advance */}
                                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                                    <h3 className="font-bold text-slate-800 mb-4 text-base">Record New Advance</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹)</label>
                                            <input type="number" value={newAdvance.amount} onChange={e => setNewAdvance({...newAdvance, amount: e.target.value})} className="border border-slate-200 rounded px-3 py-2 w-full text-sm outline-none focus:border-indigo-500" style={{color:'black'}} placeholder="e.g. 2000" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                                            <input type="date" value={newAdvance.date} onChange={e => setNewAdvance({...newAdvance, date: e.target.value})} className="border border-slate-200 rounded px-3 py-2 w-full text-sm outline-none focus:border-indigo-500" style={{color:'black'}} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                                            <input type="text" value={newAdvance.description} onChange={e => setNewAdvance({...newAdvance, description: e.target.value})} className="border border-slate-200 rounded px-3 py-2 w-full text-sm outline-none focus:border-indigo-500" style={{color:'black'}} placeholder="e.g. Festival advance" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button onClick={() => {
                                            if (!newAdvance.amount || parseFloat(newAdvance.amount) <= 0) return alert('Enter a valid amount');
                                            const updated = { ...db };
                                            const idx = updated.staff.findIndex(s => s.id === staffId);
                                            updated.staff[idx].advances.push({
                                                id: crypto.randomUUID(),
                                                date: newAdvance.date,
                                                amount: parseFloat(newAdvance.amount),
                                                description: newAdvance.description || 'Advance'
                                            });
                                            saveData(updated);
                                            setNewAdvance({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
                                        }} className="px-5 py-2 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700">
                                            + Add Advance
                                        </button>
                                    </div>
                                </div>

                                {/* Advance History */}
                                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800">Advance History</h3>
                                        <span className="text-red-600 font-bold text-sm">Total: ₹{getBalance(staff).toLocaleString('en-IN')}</span>
                                    </div>
                                    {staff.advances.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">No advances recorded yet.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {[...staff.advances].reverse().map(adv => (
                                                <div key={adv.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                                                    <div>
                                                        <div className="font-semibold text-slate-700 text-sm">{adv.description}</div>
                                                        <div className="text-xs text-slate-400">{adv.date}</div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-bold text-red-600">₹{adv.amount.toLocaleString('en-IN')}</span>
                                                        <button onClick={() => {
                                                            if (!confirm('Remove this advance entry?')) return;
                                                            const updated = { ...db };
                                                            const idx = updated.staff.findIndex(s => s.id === staffId);
                                                            updated.staff[idx].advances = updated.staff[idx].advances.filter(a => a.id !== adv.id);
                                                            saveData(updated);
                                                        }} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">Remove</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Details' && (
                            <div className="max-w-2xl">
                                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 space-y-6">
                                    <h3 className="font-bold text-slate-800 text-lg border-b border-slate-200 pb-4">Edit Employee Details</h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                                            <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-3 w-full text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" style={{color:'black'}} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile Number</label>
                                            <input type="text" value={editForm.mobile} onChange={e => setEditForm({...editForm, mobile: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-3 w-full text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" style={{color:'black'}} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Monthly Base Salary (₹)</label>
                                            <input type="number" value={editForm.monthlySalary} onChange={e => setEditForm({...editForm, monthlySalary: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-3 w-full text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" style={{color:'black'}} />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                        <button onClick={() => {
                                            if (!confirm(`Delete ${staff.name}? This will remove all their attendance records.`)) return;
                                            const updated = { ...db };
                                            updated.staff = updated.staff.filter(s => s.id !== staffId);
                                            saveData(updated);
                                            onClose();
                                        }} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-50">
                                            Delete Employee
                                        </button>

                                        <button onClick={() => {
                                            if (!editForm.name || !editForm.mobile) return alert('Name and Mobile are required');
                                            const updated = { ...db };
                                            const idx = updated.staff.findIndex(s => s.id === staffId);
                                            updated.staff[idx] = {
                                                ...updated.staff[idx],
                                                name: editForm.name,
                                                mobile: editForm.mobile,
                                                monthlySalary: parseFloat(editForm.monthlySalary) || 0
                                            };
                                            saveData(updated);
                                            alert('Employee details saved!');
                                        }} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700">
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ────────────────────── SETTINGS MODAL ──────────────────────
function AttendanceSettingsModal({ settings, onClose, onSave }: any) {
    const [local, setLocal] = useState({ ...settings });
    
    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Attendance Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
                </div>
                
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">Enable Daily Attendance Reminder</label>
                        <input type="checkbox" checked={local.enableReminder} onChange={(e) => setLocal({...local, enableReminder: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                    </div>
                    {local.enableReminder && (
                        <div>
                            <label className="block text-xs text-indigo-600 font-medium mb-1">Reminder time</label>
                            <input type="time" value={local.reminderTime} onChange={(e) => setLocal({...local, reminderTime: e.target.value})} className="border border-slate-200 rounded px-3 py-2 w-full text-sm" />
                        </div>
                    )}

                    <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">Mark Present By Default</label>
                        <input type="checkbox" checked={local.markPresentDefault} onChange={(e) => setLocal({...local, markPresentDefault: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <label className="block text-sm font-medium text-slate-700 mb-4">Set Up Working Hours In A Shift</label>
                        <div className="flex items-center gap-2">
                            <input type="number" value={local.workingHours?.hrs || 8} onChange={(e) => setLocal({...local, workingHours: {...local.workingHours, hrs: parseInt(e.target.value)}})} className="border border-slate-200 rounded px-3 py-2 w-20 text-sm text-center" min="0" max="24" /> Hrs : 
                            <input type="number" value={local.workingHours?.mins || 0} onChange={(e) => setLocal({...local, workingHours: {...local.workingHours, mins: parseInt(e.target.value)}})} className="border border-slate-200 rounded px-3 py-2 w-20 text-sm text-center" min="0" max="59" /> Min
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <label className="block text-sm font-medium text-slate-700 mb-3">Set Up Weekly Off <span className="text-slate-400 font-normal ml-1">ⓘ</span></label>
                        <div className="flex gap-2">
                            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => {
                                const active = local.weeklyOffs?.includes(day);
                                return (
                                    <button key={day} onClick={() => {
                                        if (active) setLocal({...local, weeklyOffs: local.weeklyOffs.filter((d:string) => d !== day)});
                                        else setLocal({...local, weeklyOffs: [...(local.weeklyOffs||[]), day]});
                                    }} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded font-semibold text-sm hover:bg-slate-50">Cancel</button>
                    <button onClick={() => onSave(local)} className="px-6 py-2 bg-indigo-600 text-white rounded font-semibold text-sm hover:bg-indigo-700">Save</button>
                </div>
            </div>
        </div>
    );
}

// ────────────────────── ADD STAFF MODAL ──────────────────────
function AddStaffModal({ onClose, onSave }: any) {
    const [staff, setStaff] = useState({ name: '', mobile: '', salary: '', advance: '' });

    const handleSave = () => {
        if (!staff.name || !staff.mobile) return alert("Name and Mobile are required");
        const newStaff: Staff = {
            id: crypto.randomUUID(),
            name: staff.name,
            mobile: staff.mobile,
            monthlySalary: parseFloat(staff.salary) || 0,
            advances: parseFloat(staff.advance) ? [{
                id: crypto.randomUUID(),
                date: new Date().toISOString().split('T')[0],
                amount: parseFloat(staff.advance),
                description: 'Opening Advance Balance'
            }] : []
        };
        onSave(newStaff);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Add Staff</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
                </div>
                
                <div className="p-6 space-y-4 flex-1">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Staff Name *</label>
                        <input type="text" value={staff.name} onChange={e => setStaff({...staff, name: e.target.value})} className="border border-slate-200 rounded px-3 py-2 w-full text-sm outline-none focus:border-indigo-500" placeholder="e.g. John Doe"  style={{color:"black"}} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
                        <input type="text" value={staff.mobile} onChange={e => setStaff({...staff, mobile: e.target.value})} className="border border-slate-200 rounded px-3 py-2 w-full text-sm outline-none focus:border-indigo-500" style={{color:"black"}} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Base Salary (₹)</label>
                        <input type="number" value={staff.salary} onChange={e => setStaff({...staff, salary: e.target.value})} className="border border-slate-200 rounded px-3 py-2 w-full text-sm outline-none focus:border-indigo-500" style={{color:"black"}} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Prior Advance Taken (₹)</label>
                        <input type="number" value={staff.advance} onChange={e => setStaff({...staff, advance: e.target.value})} className="border border-slate-200 rounded px-3 py-2 w-full text-sm outline-none focus:border-indigo-500 text-red-600" style={{color:"black"}} />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-semibold text-sm hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded font-semibold text-sm hover:bg-indigo-700">Save Staff</button>
                </div>
            </div>
        </div>
    );
}


