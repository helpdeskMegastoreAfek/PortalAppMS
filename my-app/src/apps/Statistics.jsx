// src/apps/Statistics.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, ClipboardList, Package, ListOrdered, ChevronsUpDown, ArrowUp, ArrowDown, RefreshCw, Search } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, CartesianGrid, XAxis, YAxis } from 'recharts';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const API_URL = import.meta.env.VITE_API_URL;

function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

const headCells = [
    { id: 'date', label: 'תאריך' },
    { id: 'picker', label: 'מלקט' },
    { id: 'orderNumber', label: 'מספר הזמנה' },
    { id: 'shippingBox', label: 'ארגז שילוח' },
    { id: 'skuCode', label: 'מק"ט' },
    { id: 'quantity', label: 'כמות' },
    { id: 'workstation', label: 'עמדת עבודה' }
];

// --- פונקציות סיווג ---
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

const Statistics = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [allStats, setAllStats] = useState([]);
    const [filteredStats, setFilteredStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('date');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWorkstationType, setSelectedWorkstationType] = useState('all');
    const [selectedWorkstation, setSelectedWorkstation] = useState('all');
    const [selectedPicker, setSelectedPicker] = useState('all');
    const [selectedPickingType, setSelectedPickingType] = useState('all');

    // --- Data Fetching & Handlers ---
    const fetchStats = useCallback(async () => {
        if (!API_URL) {
            setError("שגיאת הגדרה: VITE_API_URL אינו מוגדר בקובץ .env");
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/statistics/picking`);
            if (!response.ok) throw new Error(`שגיאת רשת: ${response.status}`);
            const data = await response.json();
            setAllStats(data);
            setError(null);
        } catch (err) {
            setError(err.message || "אירעה שגיאה בטעינת הנתונים.");
            setAllStats([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setError(null);
        try {
            if (!startDate || !endDate) throw new Error("אנא בחר טווח תאריכים לסנכרון.");
            
            const refreshResponse = await fetch(`${API_URL}/api/statistics/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                }),
            });
            if (!refreshResponse.ok) {
                let errorMessage = `תהליך הרענון נכשל: ${refreshResponse.status}`;
                try { const errorData = await refreshResponse.json(); errorMessage = errorData.message || JSON.stringify(errorData); }
                catch (e) { const errorText = await refreshResponse.text(); console.error("Server response:", errorText + e); errorMessage = "אירעה שגיאה חמורה בשרת."; }
                throw new Error(errorMessage);
            }
            
            await fetchStats();
            setFilteredStats([]);
            alert('הסנכרון הושלם. בצע חיפוש חדש כדי לראות את הנתונים המעודכנים.');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleSearch = () => {
        if (!startDate || !endDate) { setError("אנא בחר טווח תאריכים לחיפוש."); return; }
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const filtered = allStats.filter(stat => {
            const statDate = new Date(stat.date);
            return statDate >= start && statDate <= end;
        });
        setFilteredStats(filtered);
        setPage(0);
        setError(null);
    };
    
    const handleSortRequest = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };
    
    // --- Memoized Calculations ---
    const uniquePickers = useMemo(() => {
        if (!filteredStats.length) return [];
        const pickers = new Set(filteredStats.map(stat => stat.picker).filter(Boolean));
        return ['all', ...Array.from(pickers).sort()];
    }, [filteredStats]);
    
    const uniqueWorkstationTypes = useMemo(() => {
        if (!filteredStats.length) return [];
        const types = new Set(filteredStats.map(stat => getWorkstationType(stat.workstation)));
        return ['all', ...Array.from(types).sort()];
    }, [filteredStats]);

    const uniqueWorkstations = useMemo(() => {
        if (!filteredStats.length) return [];
        const workstations = new Set(filteredStats.map(stat => stat.workstation).filter(Boolean));
        return ['all', ...Array.from(workstations).sort()];
    }, [filteredStats]);

    const finalFilteredAndSortedRows = useMemo(() => {
        let finalStats = [...filteredStats];

        if (selectedPickingType !== 'all') {
            finalStats = finalStats.filter(stat => getPickingType(stat.location) === selectedPickingType);
        }
        if (selectedWorkstationType !== 'all') {
            finalStats = finalStats.filter(stat => getWorkstationType(stat.workstation) === selectedWorkstationType);
        }
        if (selectedWorkstation !== 'all') {
            finalStats = finalStats.filter(stat => stat.workstation === selectedWorkstation);
        }
        if (selectedPicker !== 'all') {
            finalStats = finalStats.filter(stat => stat.picker === selectedPicker);
        }
        
        const searchedStats = finalStats.filter(stat => {
            const term = searchTerm.toLowerCase();
            if (!term) return true;
            return (
                stat.picker?.toLowerCase().includes(term) || stat.orderNumber?.toLowerCase().includes(term) ||
                stat.shippingBox?.toLowerCase().includes(term) || stat.skuCode?.toLowerCase().includes(term) ||
                String(stat.quantity).includes(term) || stat.workstation?.toLowerCase().includes(term)
            );
        });
        
        return [...searchedStats].sort((a, b) => {
            if (a[orderBy] < b[orderBy]) return order === 'asc' ? -1 : 1;
            if (a[orderBy] > b[orderBy]) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredStats, searchTerm, order, orderBy, selectedWorkstationType, selectedPicker, selectedPickingType, selectedWorkstation]);

    const paginatedRows = useMemo(() => {
        return finalFilteredAndSortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [finalFilteredAndSortedRows, page, rowsPerPage]);

    const kpiData = useMemo(() => {
        if (!finalFilteredAndSortedRows.length) {
            return { totalQuantity: 0, uniqueOrders: 0, uniquePickers: 0, orderLines: 0, avgItemsPerOrder: 0, avgLinesPerOrder: 0 };
        }
        const uniqueOrders = new Set(finalFilteredAndSortedRows.map(s => s.orderNumber)).size;
        const totalQuantity = finalFilteredAndSortedRows.reduce((sum, item) => sum + item.quantity, 0);
        return {
            totalQuantity,
            uniqueOrders,
            uniquePickers: new Set(finalFilteredAndSortedRows.map(s => s.picker).filter(Boolean)).size,
            orderLines: finalFilteredAndSortedRows.length,
            avgItemsPerOrder: uniqueOrders > 0 ? (totalQuantity / uniqueOrders).toFixed(2) : 0,
            avgLinesPerOrder: uniqueOrders > 0 ? (finalFilteredAndSortedRows.length / uniqueOrders).toFixed(2) : 0,
        };
    }, [finalFilteredAndSortedRows]);

    const chartData = useMemo(() => {
        const pickerPerformance = finalFilteredAndSortedRows.reduce((acc, curr) => {
            if (curr.picker) {
                if (!acc[curr.picker]) acc[curr.picker] = { name: curr.picker, 'כמות מלוקטת': 0 };
                acc[curr.picker]['כמות מלוקטת'] += curr.quantity;
            }
            return acc;
        }, {});
        return Object.values(pickerPerformance).sort((a, b) => b['כמות מלוקטת'] - a['כמות מלוקטת']);
    }, [finalFilteredAndSortedRows]);

    const workstationDistribution = useMemo(() => {
        if (!finalFilteredAndSortedRows.length) return [];
        const distribution = finalFilteredAndSortedRows.reduce((acc, stat) => {
            const type = getWorkstationType(stat.workstation);
            if (!acc[type]) acc[type] = { name: type, value: 0 };
            acc[type].value += stat.quantity;
            return acc;
        }, {});
        return Object.values(distribution).filter(item => item.value > 0);
    }, [finalFilteredAndSortedRows]);

    useEffect(() => {
        if (page * rowsPerPage >= finalFilteredAndSortedRows.length) setPage(0);
    }, [finalFilteredAndSortedRows, page, rowsPerPage]);

    const formatDateForInput = (date) => new Date(date).toISOString().split('T')[0];

    return (
        <>
        <Sidebar user={user} />
        <Header user={user} />
        <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <h1 className="text-3xl font-bold text-slate-800">סטטיסטיקת ליקוט הזמנות</h1>
                    <div className="flex items-center gap-4 flex-wrap justify-center p-2 bg-white rounded-lg shadow-sm border">
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            <input type="date" value={formatDateForInput(startDate)} onChange={(e) => setStartDate(new Date(e.target.value))} className="border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                            <span className="text-slate-500">-</span>
                            <input type="date" value={formatDateForInput(endDate)} onChange={(e) => setEndDate(new Date(e.target.value))} className="border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                            <button onClick={handleSearch} className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                                <Search size={16} />
                                חיפוש תאריכים
                            </button>
                            <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-slate-400 transition-colors">
                                {isRefreshing ? <Spinner /> : <RefreshCw size={16} />}
                                {isRefreshing ? 'מסנכרן...' : 'רענן מ-SQL'}
                            </button>
                        </div>
                    </div>
                </header>

                {error && <Alert type="error">{error}</Alert>}
                
                {loading ? (
                    <div className="flex justify-center items-center h-64"><Spinner large /></div>
                ) : !allStats.length && !error ? (
                    <Alert type="info">לא נטענו נתונים מהשרת. לחץ על "רענן מ-SQL" כדי לבצע סנכרון ראשוני.</Alert>
                ) : !filteredStats.length ? (
                    <Alert type="info">בחר טווח תאריכים ולחץ על "חיפוש תאריכים" כדי להציג נתונים.</Alert>
                ) : (
                    <main className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-white rounded-lg shadow-sm border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" placeholder="חיפוש חופשי..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <select value={selectedPickingType} onChange={(e) => setSelectedPickingType(e.target.value)} className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-500">
                                    <option value="all">כל סוגי הליקוט</option>
                                    {/* <option value="ליקוט ידני (M2G)">ליקוט ידני (M2G)</option>
                                    <option value="ליקוט רגיל">ליקוט רגיל</option> */}
                                </select>
                            </div>
                            <div>
                                <select value={selectedWorkstationType} onChange={(e) => setSelectedWorkstationType(e.target.value)} className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-500">
                                    <option value="all">כל סוגי העמדות</option>
                                    {uniqueWorkstationTypes.filter(t => t !== 'all').map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                             <div>
                                <select value={selectedWorkstation} onChange={(e) => setSelectedWorkstation(e.target.value)} className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-500">
                                    <option value="all">כל עמדות העבודה</option>
                                    {uniqueWorkstations.filter(ws => ws !== 'all').map(ws => <option key={ws} value={ws}>{ws}</option>)}
                                </select>
                            </div>
                            <div>
                                <select value={selectedPicker} onChange={(e) => setSelectedPicker(e.target.value)} className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-500">
                                    <option value="all">כל המלקטים</option>
                                    {uniquePickers.filter(p => p !== 'all').map(picker => <option key={picker} value={picker}>{picker}</option>)}
                                </select>
                            </div>
                        </div>

                        {finalFilteredAndSortedRows.length === 0 && (
                            <Alert type="info">לא נמצאו תוצאות שתואמות את הסינון הנוכחי.</Alert>
                        )}

                        {finalFilteredAndSortedRows.length > 0 && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <KpiCard title="סה״כ פריטים" value={kpiData.totalQuantity} subValue={`${kpiData.avgItemsPerOrder} בממוצע להזמנה`} icon={<Package className="text-indigo-500" />} />
                                    <KpiCard title="שורות הזמנה" value={kpiData.orderLines} subValue={`${kpiData.avgLinesPerOrder} בממוצע להזמנה`} icon={<ListOrdered className="text-indigo-500" />} />
                                    <KpiCard title="סך ההזמנות" value={kpiData.uniqueOrders} icon={<ClipboardList className="text-indigo-500" />} />
                                    <KpiCard title="מלקטים פעילים" value={kpiData.uniquePickers} icon={<Users className="text-indigo-500" />} />
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                    <div className="lg:col-span-3 bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
                                        <h2 className="text-xl font-semibold text-slate-700 mb-4">ביצועי מלקטים</h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value) => new Intl.NumberFormat('he-IL').format(value)} /><Legend />
                                                <Bar dataKey="כמות מלוקטת" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
                                        <h2 className="text-xl font-semibold text-slate-700 mb-4">חלוקה לפי סוג עמדה</h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie data={workstationDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {workstationDistribution.map((entry) => (<Cell key={`cell-${entry.name}`} fill={WORKSTATION_COLORS[entry.name]} />))}
                                                </Pie>
                                                <Tooltip formatter={(value) => new Intl.NumberFormat('en').format(value)} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-slate-600">
                                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                                <tr>
                                                    {headCells.map(cell => (
                                                        <th key={cell.id} scope="col" className="px-6 py-3">
                                                            <div onClick={() => handleSortRequest(cell.id)} className="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-600">
                                                                {cell.label}
                                                                {orderBy === cell.id ? (order === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />) : <ChevronsUpDown size={14} className="opacity-30" />}
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedRows.map(row => (
                                                    <tr key={row._id || `${row.orderNumber}-${row.skuCode}`} className="bg-white border-b hover:bg-slate-50">
                                                        <td className="px-6 py-4">{new Date(row.date).toLocaleDateString('he-IL')}</td>
                                                        <td className="px-6 py-4">{row.picker}</td>
                                                        <td className="px-6 py-4 font-mono text-slate-800">{row.orderNumber}</td>
                                                        <td className="px-6 py-4 font-mono">{row.shippingBox}</td>
                                                        <td className="px-6 py-4 font-mono">{row.skuCode}</td>
                                                        <td className="px-6 py-4 text-right font-medium text-slate-800">{row.quantity}</td>
                                                        <td className="px-6 py-4">{row.workstation}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                   <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-white border-t">
                                       <span className="text-sm text-slate-500 mb-2 sm:mb-0">מציג {paginatedRows.length} מתוך {finalFilteredAndSortedRows.length} רשומות</span>
                                       <div className="flex items-center gap-2">
                                           <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border rounded disabled:opacity-50 transition-colors hover:bg-slate-100">הקודם</button>
                                           <span className="text-sm font-medium">עמוד {page + 1} / {Math.ceil(finalFilteredAndSortedRows.length / rowsPerPage) || 1}</span>
                                           <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(finalFilteredAndSortedRows.length / rowsPerPage) - 1} className="px-3 py-1 border rounded disabled:opacity-50 transition-colors hover:bg-slate-100">הבא</button>
                                       </div>
                                   </div>
                                </div>
                            </>
                        )}
                    </main>
                )}
            </div>
        </div>
        </>
    );
};

// --- קומפוננטות עזר ---
const KpiCard = ({ title, value, subValue, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex justify-between items-start">
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{new Intl.NumberFormat('he-IL').format(value)}</p>
            {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
        <div className="bg-indigo-100 p-3 rounded-full">{icon}</div>
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

export default Statistics;