// src/apps/Statistics.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, ClipboardList, Package, ListOrdered, ChevronsUpDown, ArrowUp, ArrowDown, RefreshCw, Search, X, CheckCircle, AlertTriangle,Scale, Box,FileSpreadsheet, Zap, Loader2  } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, CartesianGrid, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const API_URL = import.meta.env.VITE_API_URL;

// --- פונקציות עזר ---
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

const getWorkstationType = (workstation) => {
    if (!workstation) return 'לא משויך';
    const stationNumStr = workstation.replace(/[^0-9]/g, '');
    if (!stationNumStr) return 'אחר';
    const stationNum = parseInt(stationNumStr, 10);
    
    if ((stationNum >= 2101 && stationNum <= 2104) || (stationNum >= 2201 && stationNum <= 2205)) return 'קירור';
    if ((stationNum >= 2105 && stationNum <= 2110) || (stationNum >= 2206 && stationNum <= 2211)) return 'יבש';
    if (stationNum >= 2111 && stationNum <= 2112) return 'AGV';
    return 'אחר';
};

const getPickingType = (location) => {
    return location === 'MOVETO' ? 'ליקוט ידני (M2G)' : 'ליקוט רגיל';
};

const WORKSTATION_COLORS = {
    'קירור': '#3b82f6', 'יבש': '#f97316', 'AGV': '#16a34a',
    'אחר': '#64748b', 'לא משויך': '#d1d5db'
};

const pickingHeadCells = [
    { id: 'date', label: 'תאריך' },
    { id: 'picker', label: 'מלקט' },
    { id: 'orderNumber', label: 'מספר הזמנה' },
    { id: 'shippingBox', label: 'ארגז שילוח' },
    { id: 'skuCode', label: 'מק"ט' },
    { id: 'quantity', label: 'כמות' },
    { id: 'workstation', label: 'עמדת עבודה' }
];

// src/apps/Statistics.jsx -> PickingStats Component

const PickingStats = () => {
    // --- State לנתונים ---
    const [allStats, setAllStats] = useState([]); // כל הנתונים הגולמיים מהשרת
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- State לפילטרים (תאריכים - קובע מה נטען/מוצג ברמה הגלובלית) ---
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    // --- State לפילטרים (מקומיים - משפיע על הטבלה וה-KPI) ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPickingType, setSelectedPickingType] = useState('all');
    const [selectedWorkstationType, setSelectedWorkstationType] = useState('all');
    const [selectedWorkstation, setSelectedWorkstation] = useState('all');
    const [selectedPicker, setSelectedPicker] = useState('all');

    // --- State לטבלה ---
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('date');

    // --- State למודל ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ type: '', message: '' });

    // צבעים לתרשים עוגה (קבועים מראש לפי סוג עמדה)
    const WORKSTATION_COLORS = {
        'קירור': '#3b82f6', // blue-500
        'יבש': '#f97316',   // orange-500
        'AGV': '#16a34a',   // green-600
        'אחר': '#64748b',   // slate-500
        'לא משויך': '#d1d5db' // gray-300
    };

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/statistics/picking`);
            if (!response.ok) throw new Error(`שגיאת רשת: ${response.status}`);
            const data = await response.json();
            setAllStats(data);
        } catch (err) {
            setError(err.message || "אירעה שגיאה בטעינת הנתונים.");
            setAllStats([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // טעינה ראשונית
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);


    // --- 2. סינון לפי תאריכים (Global Filter) ---
    // זה יוצר את "מאגר הנתונים הפעיל" לטווח התאריכים שנבחר
    const dateFilteredStats = useMemo(() => {
        if (!allStats.length) return [];
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);

        return allStats.filter(stat => {
            const statDate = new Date(stat.date);
            return statDate >= start && statDate <= end;
        });
    }, [allStats, startDate, endDate]);


    // --- 3. סינון מקומי לטבלה (Table Filter) ---
    const finalFilteredRows = useMemo(() => {
        return dateFilteredStats.filter(stat => {
            // סינון סוג ליקוט
            if (selectedPickingType !== 'all' && getPickingType(stat.location) !== selectedPickingType) return false;
            // סינון סוג עמדה
            if (selectedWorkstationType !== 'all' && getWorkstationType(stat.workstation) !== selectedWorkstationType) return false;
            // סינון עמדה ספציפית
            if (selectedWorkstation !== 'all' && stat.workstation !== selectedWorkstation) return false;
            // סינון מלקט
            if (selectedPicker !== 'all' && stat.picker !== selectedPicker) return false;

            // חיפוש חופשי
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const combined = `${stat.picker} ${stat.orderNumber} ${stat.shippingBox} ${stat.skuCode} ${stat.quantity} ${stat.workstation}`.toLowerCase();
                if (!combined.includes(term)) return false;
            }
            return true;
        });
    }, [dateFilteredStats, selectedPickingType, selectedWorkstationType, selectedWorkstation, selectedPicker, searchTerm]);


    // --- 4. חישוב נתונים לגרפים (מבוסס על תאריכים בלבד - מציג הכל) ---
    
    // גרף עמודות - ביצועי מלקטים
    const chartData = useMemo(() => {
        const pickerPerformance = dateFilteredStats.reduce((acc, curr) => {
            if (curr.picker) {
                if (!acc[curr.picker]) acc[curr.picker] = { name: curr.picker, 'כמות מלוקטת': 0 };
                acc[curr.picker]['כמות מלוקטת'] += curr.quantity;
            }
            return acc;
        }, {});
        return Object.values(pickerPerformance).sort((a, b) => b['כמות מלוקטת'] - a['כמות מלוקטת']);
    }, [dateFilteredStats]);

    // גרף עוגה - סוגי עמדות
    const workstationDistribution = useMemo(() => {
        if (!dateFilteredStats.length) return [];
        const distribution = dateFilteredStats.reduce((acc, stat) => {
            const type = getWorkstationType(stat.workstation);
            if (!acc[type]) acc[type] = { name: type, value: 0 };
            acc[type].value += stat.quantity;
            return acc;
        }, {});
        return Object.values(distribution).filter(item => item.value > 0);
    }, [dateFilteredStats]);


    // --- 5. חישוב KPI (מבוסס על הסינון המקומי - מציג מה שנבחר) ---
    const kpiData = useMemo(() => {
        const source = finalFilteredRows;
        if (!source.length) return { totalQuantity: 0, uniqueOrders: 0, uniquePickers: 0, orderLines: 0 };
        
        const uniqueOrders = new Set(source.map(s => s.orderNumber)).size;
        return {
            totalQuantity: source.reduce((sum, item) => sum + item.quantity, 0),
            uniqueOrders,
            uniquePickers: new Set(source.map(s => s.picker).filter(Boolean)).size,
            orderLines: source.length,
        };
    }, [finalFilteredRows]);


    // --- 6. אפשרויות לפילטרים (Select Options) ---
    // מחשב דינמית את האפשרויות על בסיס הנתונים הקיימים בטווח התאריכים
    const uniqueOptions = useMemo(() => {
        const pickers = new Set();
        const wsTypes = new Set();
        const workstations = new Set();
        
        dateFilteredStats.forEach(stat => {
            if(stat.picker) pickers.add(stat.picker);
            if(stat.workstation) {
                workstations.add(stat.workstation);
                wsTypes.add(getWorkstationType(stat.workstation));
            }
        });

        return {
            pickers: ['all', ...Array.from(pickers).sort()],
            wsTypes: ['all', ...Array.from(wsTypes).sort()],
            workstations: ['all', ...Array.from(workstations).sort()]
        };
    }, [dateFilteredStats]);


    // --- 7. מיון ודפדוף ---
    const handleSortRequest = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const paginatedRows = useMemo(() => {
        const sorted = [...finalFilteredRows].sort((a, b) => {
            if (a[orderBy] < b[orderBy]) return order === 'asc' ? -1 : 1;
            if (a[orderBy] > b[orderBy]) return order === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [finalFilteredRows, page, rowsPerPage, order, orderBy]);


    // --- 8. סנכרון SQL ---
    const handleRefreshSQL = async () => {
        setModalContent({ type: 'loading', message: 'מסנכרן נתונים מ-SQL, נא להמתין...' });
        try {
            const refreshResponse = await fetch(`${API_URL}/api/statistics/refresh`, { // שים לב לנתיב
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                }),
            });

            if (!refreshResponse.ok) {
                const errorData = await refreshResponse.json().catch(() => ({ message: 'שגיאה לא ידועה' }));
                throw new Error(errorData.message);
            }
            
            await fetchStats(); // טעינה מחדש
            setModalContent({ type: 'success', message: 'הסנכרון הושלם בהצלחה.' });
            setTimeout(() => setIsModalOpen(false), 2000);

        } catch (err) {
            setModalContent({ type: 'error', message: err.message });
        }
    };

    const formatDateForInput = (d) => d.toISOString().split('T')[0];


    // ----------------- RENDER -----------------
    return (
        <div className="space-y-6 animate-fade-in">
            
            {/* --- כותרת וחיפוש תאריכים --- */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row items-end gap-6 justify-center">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-600">מתאריך</label>
                        <input 
                            type="date" 
                            value={formatDateForInput(startDate)} 
                            onChange={(e) => setStartDate(new Date(e.target.value))} 
                            className="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-600">עד תאריך</label>
                        <input 
                            type="date" 
                            value={formatDateForInput(endDate)} 
                            onChange={(e) => setEndDate(new Date(e.target.value))} 
                            className="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                        />
                    </div>
                    
                    <div className="flex gap-3">
                         {/* כאן אין כפתור "חיפוש" כי הסינון מתבצע אוטומטית כשהתאריך משתנה במשתנה dateFilteredStats.
                             אבל כדי לשמור על אחידות עיצובית, אפשר להשאיר כפתור שרק מרענן את הנתונים מהשרת. */}
                        <button 
                            onClick={fetchStats} 
                            disabled={loading} 
                            className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 shadow-md transition-all active:scale-95"
                        >
                            {loading ? <Spinner /> : <Search size={18} />}
                            {loading ? 'טוען...' : 'טען נתונים'}
                        </button>
                        
                        <button 
                            onClick={() => {setModalContent({type:'confirm', message:'האם אתה בטוח שברצונך לסנכרן נתונים מ-SQL?'}); setIsModalOpen(true);}} 
                            disabled={loading} 
                            className="flex items-center gap-2 bg-white text-indigo-700 border border-indigo-200 font-semibold py-2.5 px-6 rounded-lg hover:bg-indigo-50 disabled:bg-slate-50 transition-all active:scale-95"
                        >
                            <RefreshCw size={18} /> סנכרון SQL
                        </button>
                    </div>
                </div>
            </div>

            {/* --- שורת פילטרים (Selects) --- */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="text-sm font-semibold text-slate-500 mb-3">סינון תוצאות (מקומי)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                     <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="חיפוש חופשי..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                        />
                    </div>
                    <select value={selectedPickingType} onChange={(e) => { setSelectedPickingType(e.target.value); setPage(0); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:border-indigo-300 transition-all">
                        <option value="all">כל סוגי ליקוט</option>
                        <option value="ליקוט ידני (M2G)">ליקוט ידני (M2G)</option>
                        <option value="ליקוט רגיל">ליקוט רגיל</option>
                    </select>
                    <select value={selectedWorkstationType} onChange={(e) => { setSelectedWorkstationType(e.target.value); setPage(0); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:border-indigo-300 transition-all">
                        <option value="all">כל סוגי עמדות</option>
                        {uniqueOptions.wsTypes.filter(t=>t!=='all').map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <select value={selectedWorkstation} onChange={(e) => { setSelectedWorkstation(e.target.value); setPage(0); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:border-indigo-300 transition-all">
                        <option value="all">כל עמדות עבודה</option>
                        {uniqueOptions.workstations.filter(ws=>ws!=='all').map(ws => <option key={ws} value={ws}>{ws}</option>)}
                    </select>
                    <select value={selectedPicker} onChange={(e) => { setSelectedPicker(e.target.value); setPage(0); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:border-indigo-300 transition-all">
                        <option value="all">כל המלקטים</option>
                        {uniqueOptions.pickers.filter(p=>p!=='all').map(picker => <option key={picker} value={picker}>{picker}</option>)}
                    </select>
                </div>
            </div>

            {/* --- שגיאות / טעינה --- */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-center gap-3">
                    <AlertTriangle className="text-red-500" />
                    <span className="text-red-700 font-medium">{error}</span>
                </div>
            )}

            {/* --- תוכן ראשי --- */}
            {dateFilteredStats.length > 0 ? (
                <div className="space-y-8">
                    
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard title="סה״כ פריטים (מסונן)" value={kpiData.totalQuantity} icon={<Package className="text-white" />} color="bg-gradient-to-br from-indigo-500 to-indigo-600" />
                        <KpiCard title="שורות הזמנה" value={kpiData.orderLines} icon={<ListOrdered className="text-white" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                        <KpiCard title="סך ההזמנות" value={kpiData.uniqueOrders} icon={<ClipboardList className="text-white" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
                        <KpiCard title="מלקטים פעילים" value={kpiData.uniquePickers} icon={<Users className="text-white" />} color="bg-gradient-to-br from-orange-500 to-orange-600" />
                    </div>

                    {/* Charts Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* גרף עמודות */}
                        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                             <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                                <Users size={20} className="text-indigo-500"/> ביצועי מלקטים (כלל הטווח)
                            </h2>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value) => new Intl.NumberFormat('he-IL').format(value)} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}}/>
                                    <Bar dataKey="כמות מלוקטת" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* גרף עוגה */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                             <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                                <Package size={20} className="text-indigo-500"/> חלוקה לפי סוג עמדה
                            </h2>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie data={workstationDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {workstationDistribution.map((entry) => (<Cell key={`cell-${entry.name}`} fill={WORKSTATION_COLORS[entry.name] || '#8884d8'} strokeWidth={0} />))}
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value) => new Intl.NumberFormat('en').format(value)} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ListOrdered className="text-slate-400" size={20}/>
                                <h3 className="font-bold text-slate-700">פירוט ליקוטים</h3>
                                <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                    {finalFilteredRows.length} שורות
                                </span>
                            </div>
                            {selectedPicker !== 'all' && <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">מסנן מלקט: {selectedPicker}</span>}
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs uppercase bg-slate-50 text-slate-600 font-semibold tracking-wide">
                                    <tr>
                                        {pickingHeadCells.map(cell => (
                                            <th key={cell.id} scope="col" className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortRequest(cell.id)}>
                                                <div className="flex items-center gap-1">
                                                    {cell.label}
                                                    {orderBy === cell.id ? (order === 'desc' ? <ArrowDown size={14} className="text-indigo-600"/> : <ArrowUp size={14} className="text-indigo-600"/>) : <ChevronsUpDown size={14} className="opacity-30" />}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedRows.map((row) => (
                                        <tr key={row._id || Math.random()} className="bg-white hover:bg-indigo-50/30 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">{new Date(row.date).toLocaleDateString('he-IL')}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-700">{row.picker || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{row.orderNumber}</td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{row.shippingBox}</td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{row.skuCode}</td>
                                            <td className="px-6 py-4 font-bold text-indigo-600 text-right">{row.quantity}</td>
                                            <td className="px-6 py-4 text-slate-600">{row.workstation}</td>
                                        </tr>
                                    ))}
                                    {paginatedRows.length === 0 && (
                                         <tr><td colSpan={7} className="text-center py-10 text-slate-400">לא נמצאו רשומות</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination */}
                        <div className="flex justify-between items-center p-4 bg-white border-t border-slate-100">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all">הקודם</button>
                            <span className="text-sm font-medium text-slate-600">עמוד {page + 1} מתוך {Math.ceil(finalFilteredRows.length / rowsPerPage) || 1}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(finalFilteredRows.length / rowsPerPage) - 1} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all">הבא</button>
                        </div>
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <div className="text-slate-400 mb-2"><Search size={48} className="mx-auto opacity-50"/></div>
                        <h3 className="text-lg font-medium text-slate-600">אין נתונים להצגה בטווח התאריכים הזה</h3>
                        <p className="text-slate-500">נסה לשנות תאריכים או לחץ על סנכרון SQL</p>
                    </div>
                )
            )}

            {/* --- Modal --- */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {modalContent.type === 'confirm' && (
                    <div className="text-center p-2">
                         <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <RefreshCw className="text-indigo-600" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">אישור סנכרון</h3>
                        <p className="text-slate-600 mb-6">{modalContent.message}</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">ביטול</button>
                            <button onClick={handleRefreshSQL} className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">אשר</button>
                        </div>
                    </div>
                )}
                {modalContent.type === 'loading' && (
                    <div className="text-center py-4">
                        <Spinner large />
                        <p className="mt-4 font-medium text-slate-700 animate-pulse">{modalContent.message}</p>
                    </div>
                )}
                {modalContent.type === 'success' && (
                     <div className="text-center py-2">
                        <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                        <h3 className="text-lg font-bold text-slate-800">הצלחה!</h3>
                        <p className="text-slate-600">{modalContent.message}</p>
                    </div>
                )}
                {modalContent.type === 'error' && (
                     <div className="text-center py-2">
                        <AlertTriangle className="mx-auto text-red-500 mb-3" size={48} />
                        <h3 className="text-lg font-bold text-slate-800">שגיאה</h3>
                        <p className="text-slate-600 bg-red-50 p-3 rounded-lg mt-2 text-sm">{modalContent.message}</p>
                         <button onClick={() => setIsModalOpen(false)} className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">סגור</button>
                    </div>
                )}
            </Modal>
        </div>
    );
};


// src/apps/Statistics.jsx -> InboundStats Component
const WEIGHT_SKUS = new Set([
    '100', '1001929', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', 
    '1108', '111', '113', '1132852', '1132869', '1132883', '115', '116', '117', '118', '1182', 
    '1183', '120', '1206843', '1206942', '121', '122', '132', '134', '135', '137', '138', '139', 
    '140', '141', '142', '143', '144', '146', '1464052', '1464106', '1464953', '147', '148', '149', 
    '151', '155', '156', '157', '161', '162', '164', '167', '168', '169', '1750063', '1750100', 
    '1750131', '1750247', '1811399', '182', '183', '185', '187', '191', '194', '195', '199', '201', 
    '2105572', '219', '224', '225', '2281429', '2281856', '230', '2345435', '2410874', '2478157', 
    '2587637', '2610175', '2610182', '2610199', '265', '2680314', '2680321', '2680338', '2680345', 
    '2680352', '2680369', '2680376', '2680383', '2680390', '2680406', '2680413', '2680604', '2681137', 
    '2706731', '2830184', '2830245', '289', '2927105', '2927464', '2927471', '2927518', '2927655', 
    '300', '307', '313', '321', '328', '3353767', '3353774', '3353798', '3353835', '3353842', 
    '3361328', '401', '4194185', '4194208', '4194239', '4194253', '4194260', '4194277', '4194307', 
    '420', '4846237', '4969509', '502', '541', '551098', '551197', '612', '652894', '653273', 
    '653280', '664255', '664293', '6699', '7290000001074', '7290000961804', '7290005678332', 
    '7290005678387', '7290005678417', '7290005678806', '7290005678844', '7290009004700', 
    '7290011148485', '7290019170990', '7290113471627', '7290122180909', '7290122180916', '797', 
    '8202213', '8218610', '8218788', '8218832', '8218849', '8219679', '8219761', '8219792', 
    '8219860', '8350006', '8351041', '8504898', '8504959', '8504966', '881', '9442035', '9442042'
]);

// --- פונקציית עזר מעודכנת למיפוי אזורים (כולל המיקומים החדשים) ---
const getMappedWorkArea = (row) => {
    const rawArea = row.workArea;
    const location = row.location || '';
    
    // 1. בדיקת M2G לפי אזור עבודה
    if (rawArea === 'PA M-2-G') return 'M2G הכנסת סחורה';

    // 2. בדיקת מיקומים ספציפיים לרשימה ששלחת (ROTO, MF, ומדפים) - מוגדרים כ-M2G
    if (location === 'ROTO') return 'M2G הכנסת סחורה';
    if (location.startsWith('MF-')) return 'M2G הכנסת סחורה'; // תופס MF-1 עד MF-10
    // בדיקה באמצעות Regex לתבנית של מדפים: מספר-מספר-מספר (למשל 10-05-05 או 1-01-01)
    if (/^\d{1,2}-\d{2}-\d{2}$/.test(location)) return 'M2G הכנסת סחורה';

    // 3. בדיקת BULK (MJ)
    if (location.startsWith('MJ')) return 'איזור BULK'; 
    
    // 4. בדיקת AGV
    if (rawArea === 'AGVSTAGE' || location.startsWith('AGV')) return 'איזור AGV';
    
    return rawArea || 'Inbound';
};

// --- כותרות הטבלה ---
const inboundHeadCells = [
    { id: 'date', label: 'תאריך' },
    { id: 'receiver', label: 'קולט' },
    { id: 'orderNumber', label: 'PO' },
    { id: 'skuCode', label: 'מק"ט' },
    { id: 'quantity', label: 'כמות' },
    { id: 'location', label: 'מיקום' },
    { id: 'container', label: 'קופסה' },
    { id: 'batch', label: 'חלקה' },
    { id: 'owner', label: '' },
];

const InboundStats = () => {
    // --- State ---
    const [allRows, setAllRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    // --- LIVE MODE STATE ---
    const [isLive, setIsLive] = useState(false); 
    const [isUpdating, setIsUpdating] = useState(false);

    // פילטרים
    const [selectedReceiver, setSelectedReceiver] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState('all');
    const [selectedSku, setSelectedSku] = useState('all');
    const [selectedWorkArea, setSelectedWorkArea] = useState('all');
    const [selectedPricingType, setSelectedPricingType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // טבלה
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('lastActivityTime');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ type: '', message: '' });

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    // --- 1. שליפת נתונים ---
    const fetchInboundStats = useCallback(async () => {
        if (!startDate || !endDate) return;
        
        if (!isUpdating) setLoading(true);
        setError(null);

        const params = new URLSearchParams({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            limit: 50000,
            orderBy: 'create_at',
            order: 'desc'
        });

        try {
            const response = await fetch(`${API_URL}/api/statistics/inbound?${params.toString()}`);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const { data } = await response.json();
            
            if (Array.isArray(data)) setAllRows(data);
        } catch (err) {
            console.error("Fetch error:", err);
            if (!isLive) setError("שגיאה בטעינת נתונים");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, isUpdating, isLive]);

    // --- רענון שקט ---
    const handleSilentRefresh = useCallback(async () => {
        if (isUpdating) return; 
        setIsUpdating(true);

        try {
            await fetch(`${API_URL}/api/statistics/inbound/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate }),
            });
            await fetchInboundStats();
        } catch (err) {
            console.error("Live update failed:", err);
        } finally {
            setIsUpdating(false);
        }
    }, [startDate, endDate, fetchInboundStats, isUpdating]);

    // --- טיימר LIVE ---
    useEffect(() => {
        let interval;
        if (isLive) {
            handleSilentRefresh();
            interval = setInterval(() => {
                handleSilentRefresh();
            }, 300000); // 5 דקות
        }
        return () => clearInterval(interval);
    }, [isLive, handleSilentRefresh]);

    // --- חישוב אפשרויות סינון ---
    const uniqueOptions = useMemo(() => {
        const receivers = new Set();
        const orders = new Set();
        const skus = new Set();
        const workAreas = new Set();

        allRows.forEach(row => {
            if (row.receiver) receivers.add(row.receiver);
            if (row.orderNumber) orders.add(row.orderNumber);
            if (row.skuCode) skus.add(row.skuCode);
            workAreas.add(getMappedWorkArea(row)); // משתמש בלוגיקה החדשה
        });

        return {
            receivers: Array.from(receivers).sort(),
            orders: Array.from(orders).sort(),
            skus: Array.from(skus).sort(),
            workAreas: Array.from(workAreas).sort(),
        };
    }, [allRows]);

    // --- סינון נתונים ---
    const filteredRows = useMemo(() => {
        return allRows.filter(row => {
            if (selectedReceiver !== 'all' && row.receiver !== selectedReceiver) return false;
            if (selectedOrder !== 'all' && row.orderNumber !== selectedOrder) return false;
            if (selectedSku !== 'all' && row.skuCode !== selectedSku) return false;
            if (selectedWorkArea !== 'all' && getMappedWorkArea(row) !== selectedWorkArea) return false; // משתמש בלוגיקה החדשה
            
            if (selectedPricingType !== 'all') {
                const isWeight = WEIGHT_SKUS.has(String(row.skuCode));
                const type = isWeight ? 'weight' : 'unit';
                if (type !== selectedPricingType) return false;
            }

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const combined = `${row.orderNumber} ${row.skuCode} ${row.receiver || ''}`.toLowerCase();
                if (!combined.includes(term)) return false;
            }
            return true;
        });
    }, [allRows, selectedReceiver, selectedOrder, selectedSku, selectedWorkArea, selectedPricingType, searchTerm]);

    // --- KPI ---
    const kpiData = useMemo(() => {
        const source = filteredRows;
        let totalQty = 0;
        let weightScans = 0;
        let unitScans = 0;
        source.forEach(row => {
            totalQty += row.quantity;
            if (WEIGHT_SKUS.has(String(row.skuCode))) weightScans += 1;
            else unitScans += 1;
        });
        return {
            totalQuantity: totalQty,
            uniqueOrders: new Set(source.map(s => s.orderNumber)).size,
            weightScans, unitScans,
            uniqueReceivers: new Set(source.map(s => s.receiver).filter(Boolean)).size
        };
    }, [filteredRows]);

    // --- גרפים ---
    const workAreaDistribution = useMemo(() => {
        if (!allRows.length) return [];
        const distribution = allRows.reduce((acc, curr) => {
            const categoryName = getMappedWorkArea(curr); // משתמש בלוגיקה החדשה
            if (!acc[categoryName]) acc[categoryName] = { name: categoryName, value: 0 };
            acc[categoryName].value += curr.quantity;
            return acc;
        }, {});
        return Object.values(distribution).filter(item => item.value > 0);
    }, [allRows]);

    const chartData = useMemo(() => {
        if (!allRows.length) return [];
        const receiverPerformance = allRows.reduce((acc, curr) => {
            const name = curr.receiver || 'לא ידוע';
            if (!acc[name]) acc[name] = { name: name, 'כמות שנקלטה': 0 };
            acc[name]['כמות שנקלטה'] += curr.quantity;
            return acc;
        }, {});
        return Object.values(receiverPerformance).sort((a, b) => b['כמות שנקלטה'] - a['כמות שנקלטה']);
    }, [allRows]);

    // --- Export Excel ---
    const handleExportExcel = () => {
        if (!filteredRows.length) return;
        const summary = filteredRows.reduce((acc, row) => {
            const name = row.receiver || 'לא ידוע';
            if (!acc[name]) {
                acc[name] = { 'שם עובד': name, 'סה"כ כמות פריטים': 0, 'כמות שורות שקיל': 0, 'כמות שורות יחידות': 0, 'סה"כ שורות': 0, 'מספר הזמנות ייחודיות': new Set() };
            }
            acc[name]['סה"כ כמות פריטים'] += row.quantity;
            acc[name]['סה"כ שורות'] += 1;
            acc[name]['מספר הזמנות ייחודיות'].add(row.orderNumber);
            if (WEIGHT_SKUS.has(String(row.skuCode))) acc[name]['כמות שורות שקיל'] += 1;
            else acc[name]['כמות שורות יחידות'] += 1;
            return acc;
        }, {});
        const exportData = Object.values(summary).map(item => ({ ...item, 'מספר הזמנות ייחודיות': item['מספר הזמנות ייחודיות'].size }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "סיכום קליטה");
        XLSX.writeFile(wb, `Inbound_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleSortRequest = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const paginatedRows = useMemo(() => {
        const sorted = [...filteredRows].sort((a, b) => {
            if (a[orderBy] < b[orderBy]) return order === 'asc' ? -1 : 1;
            if (a[orderBy] > b[orderBy]) return order === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [filteredRows, page, rowsPerPage, order, orderBy]);

    const handleRefreshSQL = async () => {
        setModalContent({ type: 'loading', message: 'מבצע סנכרון נתונים מול שרת SQL...' });
        try {
            const res = await fetch(`${API_URL}/api/statistics/inbound/refresh`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate }),
            });
            if (!res.ok) throw new Error('שגיאה בסנכרון');
            setModalContent({ type: 'success', message: 'הסנכרון הושלם בהצלחה!' });
            setTimeout(() => { setIsModalOpen(false); fetchInboundStats(); }, 1500);
        } catch (e) { setModalContent({ type: 'error', message: e.message }); }
    };

    const formatDateForInput = (d) => d.toISOString().split('T')[0];
    const KpiCard = ({ title, value, icon, color }) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
            <div><p className="text-sm font-medium text-slate-500 mb-1">{title}</p><p className="text-3xl font-bold text-slate-800 tracking-tight">{new Intl.NumberFormat('he-IL').format(value)}</p></div>
            <div className={`p-4 rounded-xl shadow-sm ${color || 'bg-indigo-50'}`}>{icon}</div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row items-end gap-6 justify-center">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-600">מתאריך</label>
                        <input type="date" value={formatDateForInput(startDate)} onChange={(e) => setStartDate(new Date(e.target.value))} className="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-600">עד תאריך</label>
                        <input type="date" value={formatDateForInput(endDate)} onChange={(e) => setEndDate(new Date(e.target.value))} className="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchInboundStats} disabled={loading || isLive} className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 shadow-md">
                            {loading ? <Spinner /> : <Search size={18} />} {loading ? 'טוען...' : 'חיפוש תאריכים'}
                        </button>
                        {/* <button onClick={() => setIsLive(!isLive)} className={`flex items-center gap-2 font-semibold py-2.5 px-6 rounded-lg shadow-md transition-all ${isLive ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {isLive ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} {isLive ? 'עצור LIVE' : 'הפעל LIVE'}
                        </button> */}
                        <button onClick={() => {setModalContent({type:'confirm', message:'האם אתה בטוח שברצונך לסנכרן נתונים מ-SQL?'}); setIsModalOpen(true);}} disabled={loading || isLive} className="flex items-center gap-2 bg-white text-indigo-700 border border-indigo-200 font-semibold py-2.5 px-6 rounded-lg hover:bg-indigo-50 disabled:bg-slate-50">
                            <RefreshCw size={18} /> סנכרון SQL
                        </button>
                        <button onClick={handleExportExcel} disabled={loading || filteredRows.length === 0} className="flex items-center gap-2 bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 shadow-md">
                            <FileSpreadsheet size={18} /> ייצוא לאקסל
                        </button>
                    </div>
                </div>
                {isUpdating && <div className="text-center mt-2 text-xs text-green-600 flex justify-center items-center gap-1"><RefreshCw size={12} className="animate-spin"/> מתעדכן אוטומטית...</div>}
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="text-sm font-semibold text-slate-500 mb-3">סינון תוצאות</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    <select value={selectedPricingType} onChange={(e) => { setSelectedPricingType(e.target.value); setPage(0); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                        <option value="all">כל סוגי התמחור</option>
                        <option value="weight">שקיל (Weight)</option>
                        <option value="unit">יחידות (Unit)</option>
                    </select>
                    <select value={selectedWorkArea} onChange={(e) => { setSelectedWorkArea(e.target.value); setPage(0); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                        <option value="all">כל אזורי העבודה</option>
                        {uniqueOptions.workAreas.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={selectedReceiver} onChange={(e) => { setSelectedReceiver(e.target.value); setPage(0); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                        <option value="all">כל הקולטים</option>
                        {uniqueOptions.receivers.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={selectedOrder} onChange={(e) => { setSelectedOrder(e.target.value); setPage(0); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                        <option value="all">כל ההזמנות</option>
                        {uniqueOptions.orders.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={selectedSku} onChange={(e) => { setSelectedSku(e.target.value); setPage(0); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                        <option value="all">כל המק״טים</option>
                        {uniqueOptions.skus.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input type="text" placeholder="חיפוש חופשי..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>
            </div>

            {error && !isLive && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 font-medium">{error}</div>}
            
            {allRows.length > 0 && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard title="סה״כ פריטים שנקלטו" value={kpiData.totalQuantity} icon={<Package className="text-white" />} color="bg-gradient-to-br from-indigo-500 to-indigo-600" />
                        <KpiCard title="שורות משקל (שקיל)" value={kpiData.weightScans} icon={<Scale className="text-white" />} color="bg-gradient-to-br from-purple-500 to-purple-600" />
                        <KpiCard title="שורות יחידות (בודדים)" value={kpiData.unitScans} icon={<Box className="text-white" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                        <KpiCard title="קולטים פעילים" value={kpiData.uniqueReceivers} icon={<Users className="text-white" />} color="bg-gradient-to-br from-orange-500 to-orange-600" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2"><Users size={20} className="text-indigo-500"/> ביצועי קולטים (כמות)</h2>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(val) => new Intl.NumberFormat('he-IL').format(val)} />
                                    <Bar dataKey="כמות שנקלטה" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2"><Package size={20} className="text-indigo-500"/> חלוקה לאזורים</h2>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie data={workAreaDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={2}>
                                        {workAreaDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />))}
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ListOrdered className="text-slate-400" size={20}/>
                                <h3 className="font-bold text-slate-700">פירוט רשומות</h3>
                                <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{filteredRows.length} שורות</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs uppercase bg-slate-50 text-slate-600 font-semibold tracking-wide">
                                    <tr>
                                        {inboundHeadCells.map(cell => (
                                            <th key={cell.id} className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSortRequest(cell.id)}>
                                                <div className="flex items-center gap-1">
                                                    {cell.label}
                                                    {orderBy === cell.id ? (order === 'desc' ? <ArrowDown size={14}/> : <ArrowUp size={14}/>) : <ChevronsUpDown size={14} className="opacity-30"/>}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedRows.map((row, idx) => (
                                        <tr key={idx} className="bg-white hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(row.date).toLocaleDateString('he-IL')}</td>
                                            <td className="px-6 py-4 font-semibold">{row.receiver || '-'}</td>
                                            <td className="px-6 py-4 font-mono">{row.orderNumber}</td>
                                            <td className="px-6 py-4 font-mono">{row.skuCode}</td>
                                            <td className="px-6 py-4 font-bold text-indigo-600">{row.quantity}</td>
                                            <td className="px-6 py-4">{row.location || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{row.container}</td>
                                            <td className="px-6 py-4">{row.batch || '-'}</td>
                                            <td className="px-6 py-4 truncate max-w-[150px]">{row.owner}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                         <div className="flex justify-between items-center p-4 bg-white border-t border-slate-100">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page===0} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">הקודם</button>
                            <span className="text-sm font-medium text-slate-600">עמוד {page + 1} מתוך {Math.ceil(filteredRows.length / rowsPerPage) || 1}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(filteredRows.length / rowsPerPage) - 1} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">הבא</button>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {modalContent.type === 'confirm' && <div className="text-center p-2"><RefreshCw className="mx-auto text-indigo-600 mb-2" size={32}/><p>{modalContent.message}</p><div className="flex justify-center gap-2 mt-4"><button onClick={()=>setIsModalOpen(false)} className="border px-4 py-2 rounded">ביטול</button><button onClick={handleRefreshSQL} className="bg-indigo-600 text-white px-4 py-2 rounded">אשר</button></div></div>}
                {modalContent.type === 'loading' && <div className="text-center"><Spinner large /><p>{modalContent.message}</p></div>}
                {modalContent.type === 'success' && <div className="text-center"><CheckCircle className="mx-auto text-green-500" size={32}/><p>{modalContent.message}</p></div>}
                {modalContent.type === 'error' && <div className="text-center"><AlertTriangle className="mx-auto text-red-500" size={32}/><p>{modalContent.message}</p><button onClick={()=>setIsModalOpen(false)} className="mt-2 bg-slate-100 px-3 py-1 rounded">סגור</button></div>}
            </Modal>
        </div>
    );
};
// --- קומפוננטה ראשית ---
const Statistics = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [activeTab, setActiveTab] = useState('picking');

    const tabTitles = {
        picking: 'סטטיסטיקת ליקוט הזמנות',
        inbound: 'סטטיסטיקת הכנסת סחורה'
    };
    
    return (
        <>
        <Sidebar user={user} />
        <Header user={user} />
        <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800">{tabTitles[activeTab]}</h1>
                </header>
                
                <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex space-x-6" style={{ direction: 'rtl' }}>
                        <button
                            onClick={() => setActiveTab('picking')}
                            className={cn(
                                "py-3 px-4 font-semibold text-sm whitespace-nowrap",
                                activeTab === 'picking' 
                                    ? "text-indigo-600 border-b-2 border-indigo-600" 
                                    : "text-slate-500 hover:text-slate-700 hover:border-slate-300 border-b-2 border-transparent"
                            )}
                        >
                            סטטיסטיקת ליקוט
                        </button>
                        <button
                             onClick={() => setActiveTab('inbound')}
                             className={cn(
                                 "py-3 px-4 font-semibold text-sm whitespace-nowrap",
                                 activeTab === 'inbound' 
                                     ? "text-indigo-600 border-b-2 border-indigo-600" 
                                     : "text-slate-500 hover:text-slate-700 hover:border-slate-300 border-b-2 border-transparent"
                             )}
                        >
                            סטטיסטיקת הכנסת סחורה
                        </button>
                    </nav>
                </div>

                <main>
                    {activeTab === 'picking' && <PickingStats />}
                    {activeTab === 'inbound' && <InboundStats />}
                </main>
            </div>
        </div>
        </>
    );
};

// --- קומפוננטות עזר (משותפות) ---
const KpiCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">{new Intl.NumberFormat('he-IL').format(value)}</p>
        </div>
        <div className={`p-4 rounded-xl shadow-sm ${color || 'bg-indigo-50'}`}>
            {/* אם מעבירים צבע מותאם אישית (gradient), האייקון יהיה לבן. אחרת ברירת מחדל */}
            {color ? icon : React.cloneElement(icon, { className: "text-indigo-500" })}
        </div>
    </div>
);

const Alert = ({ type, children }) => {
    const typeClasses = {
        info: "bg-blue-50 text-blue-700",
        error: "bg-red-50 text-red-700",
    };
    return <div className={cn("p-4 mb-4 rounded-md text-sm", typeClasses[type])}>{children}</div>;
};

const Spinner = ({ large = false }) => (
    <div className={cn("animate-spin rounded-full border-t-2 border-r-2 border-transparent", large ? "w-8 h-8 border-4" : "w-4 h-4 border-2")} style={{ borderTopColor: 'currentColor', borderRightColor: 'currentColor' }}></div>
);

const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-end">
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="mt-2">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Statistics;