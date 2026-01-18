// src/apps/Statistics.jsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Users, ClipboardList, Package, ListOrdered, ChevronsUpDown, ArrowUp, ArrowDown, RefreshCw, Search, X, CheckCircle, AlertTriangle,Scale, Box,FileSpreadsheet, Zap, Loader2, TrendingUp, TrendingDown, BarChart3  } from 'lucide-react';
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
    const [allStats, setAllStats] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const hasLoadedRef = useRef(false); // שמירה אם הנתונים כבר נטענו

    // --- State לפילטרים (תאריכים) ---
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    
    // --- State להשוואת תקופות ---
    const [compareMode, setCompareMode] = useState(false);
    const [compareStartDate, setCompareStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date;
    });
    const [compareEndDate, setCompareEndDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date;
    });

    // --- State לפילטרים (מקומיים) ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPickingType, setSelectedPickingType] = useState('all');
    const [selectedWorkstationType, setSelectedWorkstationType] = useState('all');
    const [selectedWorkstation, setSelectedWorkstation] = useState('all');
    const [selectedPicker, setSelectedPicker] = useState('all');

    // --- State לטבלה ---
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('date');

    // --- State למודל ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ type: '', message: '' });

    const WORKSTATION_COLORS = {
        'קירור': '#3b82f6', 
        'יבש': '#f97316',   
        'AGV': '#16a34a',   
        'אחר': '#64748b',   
        'לא משויך': '#d1d5db' 
    };

    // --- 1. טעינת נתונים ---
    const fetchStats = useCallback(async () => {
        // אם הנתונים כבר נטענו, לא נטען שוב
        if (hasLoadedRef.current) {
            return;
        }
        
        if (!API_URL) {
            setError("כתובת שרת לא מוגדרת. אנא בדוק את הגדרות הסביבה.");
            return;
        }
        
        setLoading(true);
        setError(null);
        const fetchStartTime = performance.now();
        
        try {
            const response = await fetch(`${API_URL}/api/statistics/picking`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: `שגיאת שרת: ${response.status} ${response.statusText}` };
                }
                throw new Error(errorData.message || errorData.error || `שגיאת רשת: ${response.status}`);
            }
            
            const parseStartTime = performance.now();
            const data = await response.json();
            const parseEndTime = performance.now();
            
            if (Array.isArray(data)) {
                const setStateStartTime = performance.now();
                setAllStats(data);
                hasLoadedRef.current = true; // סמן שהנתונים נטענו
                const setStateEndTime = performance.now();
                
                const fetchEndTime = performance.now();
                console.log(`Fetch stats timing:
                    - Network: ${(parseStartTime - fetchStartTime).toFixed(2)}ms
                    - JSON Parse: ${(parseEndTime - parseStartTime).toFixed(2)}ms
                    - Set State: ${(setStateEndTime - setStateStartTime).toFixed(2)}ms
                    - Total: ${(fetchEndTime - fetchStartTime).toFixed(2)}ms
                    - Records: ${data.length}`);
            } else {
                throw new Error("פורמט נתונים לא תקין מהשרת");
            }
        } catch (err) {
            console.error('Error fetching picking stats:', err);
            let errorMessage = "אירעה שגיאה בטעינת הנתונים.";
            
            if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
                errorMessage = `לא ניתן להתחבר לשרת בכתובת ${API_URL}. אנא ודא שהשרת רץ וזמין.`;
            } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                errorMessage = `השרת לא זמין בכתובת ${API_URL}. אנא בדוק שהשרת רץ.`;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
            setAllStats([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // --- 2. סינון לפי תאריכים ---
    const dateFilteredStats = useMemo(() => {
        if (!allStats.length) return [];
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);

        return allStats.filter(stat => {
            const statDate = new Date(stat.date);
            return statDate >= start && statDate <= end;
        });
    }, [allStats, startDate, endDate]);

    // --- 2.1. סינון תקופת השוואה ---
    const compareFilteredStats = useMemo(() => {
        if (!compareMode || !allStats.length) return [];
        const start = new Date(compareStartDate); start.setHours(0,0,0,0);
        const end = new Date(compareEndDate); end.setHours(23,59,59,999);

        return allStats.filter(stat => {
            const statDate = new Date(stat.date);
            return statDate >= start && statDate <= end;
        });
    }, [allStats, compareMode, compareStartDate, compareEndDate]);

    // --- 3. סינון מקומי לטבלה ---
    const finalFilteredRows = useMemo(() => {
        return dateFilteredStats.filter(stat => {
            if (selectedPickingType !== 'all' && getPickingType(stat.location) !== selectedPickingType) return false;
            if (selectedWorkstationType !== 'all' && getWorkstationType(stat.workstation) !== selectedWorkstationType) return false;
            if (selectedWorkstation !== 'all' && stat.workstation !== selectedWorkstation) return false;
            if (selectedPicker !== 'all' && stat.picker !== selectedPicker) return false;

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const combined = `${stat.picker} ${stat.orderNumber} ${stat.shippingBox} ${stat.skuCode} ${stat.quantity} ${stat.workstation}`.toLowerCase();
                if (!combined.includes(term)) return false;
            }
            return true;
        });
    }, [dateFilteredStats, selectedPickingType, selectedWorkstationType, selectedWorkstation, selectedPicker, searchTerm]);

    // --- 4. חישוב גרפים ---
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

    // --- 5. KPI ---
    const kpiData = useMemo(() => {
        const source = finalFilteredRows;
        if (!source.length) return { 
            totalQuantity: 0, 
            uniqueOrders: 0, 
            uniquePickers: 0, 
            orderLines: 0,
            avgSkusPerOrder: 0,
            avgItemsPerOrder: 0
        };
        
        const uniqueOrders = new Set(source.map(s => s.orderNumber)).size;
        const totalQuantity = source.reduce((sum, item) => sum + item.quantity, 0);
        
        // חישוב ממוצע מקטים בהזמנה
        // נקבץ לפי הזמנה ונספור מקטים ייחודיים בכל הזמנה
        const orderSkusMap = new Map();
        source.forEach(item => {
            const orderNum = item.orderNumber;
            if (!orderSkusMap.has(orderNum)) {
                orderSkusMap.set(orderNum, new Set());
            }
            orderSkusMap.get(orderNum).add(item.skuCode);
        });
        
        // סכום המקטים הייחודיים בכל ההזמנות
        let totalUniqueSkus = 0;
        orderSkusMap.forEach(skus => {
            totalUniqueSkus += skus.size;
        });
        
        const avgSkusPerOrder = uniqueOrders > 0 ? totalUniqueSkus / uniqueOrders : 0;
        const avgItemsPerOrder = uniqueOrders > 0 ? totalQuantity / uniqueOrders : 0;
        
        return {
            totalQuantity,
            uniqueOrders,
            uniquePickers: new Set(source.map(s => s.picker).filter(Boolean)).size,
            orderLines: source.length,
            avgSkusPerOrder: Math.round(avgSkusPerOrder * 100) / 100, // עיגול ל-2 ספרות אחרי הנקודה
            avgItemsPerOrder: Math.round(avgItemsPerOrder * 100) / 100,
        };
    }, [finalFilteredRows]);

    // --- 5.1. חישוב KPI לתקופת השוואה ---
    const compareKpiData = useMemo(() => {
        if (!compareMode) return null;
        
        const source = compareFilteredStats.filter(stat => {
            if (selectedPickingType !== 'all' && getPickingType(stat.location) !== selectedPickingType) return false;
            if (selectedWorkstationType !== 'all' && getWorkstationType(stat.workstation) !== selectedWorkstationType) return false;
            if (selectedWorkstation !== 'all' && stat.workstation !== selectedWorkstation) return false;
            if (selectedPicker !== 'all' && stat.picker !== selectedPicker) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const combined = `${stat.picker} ${stat.orderNumber} ${stat.shippingBox} ${stat.skuCode} ${stat.quantity} ${stat.workstation}`.toLowerCase();
                if (!combined.includes(term)) return false;
            }
            return true;
        });
        
        if (!source.length) return { 
            totalQuantity: 0, 
            uniqueOrders: 0, 
            uniquePickers: 0, 
            orderLines: 0,
            avgSkusPerOrder: 0,
            avgItemsPerOrder: 0
        };
        
        const uniqueOrders = new Set(source.map(s => s.orderNumber)).size;
        const totalQuantity = source.reduce((sum, item) => sum + item.quantity, 0);
        
        const orderSkusMap = new Map();
        source.forEach(item => {
            const orderNum = item.orderNumber;
            if (!orderSkusMap.has(orderNum)) {
                orderSkusMap.set(orderNum, new Set());
            }
            orderSkusMap.get(orderNum).add(item.skuCode);
        });
        
        let totalUniqueSkus = 0;
        orderSkusMap.forEach(skus => {
            totalUniqueSkus += skus.size;
        });
        
        const avgSkusPerOrder = uniqueOrders > 0 ? totalUniqueSkus / uniqueOrders : 0;
        const avgItemsPerOrder = uniqueOrders > 0 ? totalQuantity / uniqueOrders : 0;
        
        return {
            totalQuantity,
            uniqueOrders,
            uniquePickers: new Set(source.map(s => s.picker).filter(Boolean)).size,
            orderLines: source.length,
            avgSkusPerOrder: Math.round(avgSkusPerOrder * 100) / 100,
            avgItemsPerOrder: Math.round(avgItemsPerOrder * 100) / 100,
        };
    }, [compareMode, compareFilteredStats, selectedPickingType, selectedWorkstationType, selectedWorkstation, selectedPicker, searchTerm]);

    // --- 5.2. בדיקה אם יש נתונים לתקופת השוואה ---
    const hasCompareData = useMemo(() => {
        if (!compareMode) return true;
        return compareFilteredStats.length > 0;
    }, [compareMode, compareFilteredStats]);

    // --- 5.3. חישוב שינוי באחוזים ---
    const comparisonData = useMemo(() => {
        if (!compareMode || !compareKpiData || !hasCompareData) return null;
        
        const calculateChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100 * 100) / 100;
        };
        
        return {
            totalQuantity: {
                current: kpiData.totalQuantity,
                previous: compareKpiData.totalQuantity,
                change: calculateChange(kpiData.totalQuantity, compareKpiData.totalQuantity)
            },
            uniqueOrders: {
                current: kpiData.uniqueOrders,
                previous: compareKpiData.uniqueOrders,
                change: calculateChange(kpiData.uniqueOrders, compareKpiData.uniqueOrders)
            },
            uniquePickers: {
                current: kpiData.uniquePickers,
                previous: compareKpiData.uniquePickers,
                change: calculateChange(kpiData.uniquePickers, compareKpiData.uniquePickers)
            },
            orderLines: {
                current: kpiData.orderLines,
                previous: compareKpiData.orderLines,
                change: calculateChange(kpiData.orderLines, compareKpiData.orderLines)
            },
            avgSkusPerOrder: {
                current: kpiData.avgSkusPerOrder,
                previous: compareKpiData.avgSkusPerOrder,
                change: calculateChange(kpiData.avgSkusPerOrder, compareKpiData.avgSkusPerOrder)
            },
            avgItemsPerOrder: {
                current: kpiData.avgItemsPerOrder,
                previous: compareKpiData.avgItemsPerOrder,
                change: calculateChange(kpiData.avgItemsPerOrder, compareKpiData.avgItemsPerOrder)
            }
        };
    }, [compareMode, kpiData, compareKpiData, hasCompareData]);

    // --- 9.1. סנכרון תקופת השוואה ---
    const handleRefreshComparePeriod = async () => {
        if (!API_URL) {
            setModalContent({ type: 'error', message: 'כתובת שרת לא מוגדרת.' });
            return;
        }
        
        // בדיקת טווח תאריכים מקסימלי (30 ימים)
        const daysDiff = Math.ceil((compareEndDate - compareStartDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > 30) {
            setModalContent({ 
                type: 'error', 
                message: `טווח תאריכים גדול מדי. מקסימום 30 ימים, נבחר: ${daysDiff} ימים. אנא בחר טווח קטן יותר.` 
            });
            return;
        }
        
        setModalContent({ type: 'loading', message: `מסנכרן נתונים מ-SQL לתקופת השוואה (${daysDiff} ימים), נא להמתין...` });
        try {
            const refreshResponse = await fetch(`${API_URL}/api/statistics/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: compareStartDate.toISOString(),
                    endDate: compareEndDate.toISOString(),
                }),
            });

            if (!refreshResponse.ok) {
                const errorData = await refreshResponse.json().catch(() => ({ message: `שגיאת שרת: ${refreshResponse.status}` }));
                throw new Error(errorData.message || errorData.error || 'שגיאה לא ידועה');
            }
            
            hasLoadedRef.current = false; // אפס את ה-flag כדי לטעון נתונים חדשים
            await fetchStats();
            setModalContent({ type: 'success', message: 'הסנכרון לתקופת השוואה הושלם בהצלחה.' });
            setTimeout(() => setIsModalOpen(false), 2000);

        } catch (err) {
            console.error('Error refreshing compare period SQL:', err);
            let errorMessage = err.message || 'שגיאה בסנכרון הנתונים';
            
            if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
                errorMessage = `לא ניתן להתחבר לשרת בכתובת ${API_URL}. אנא ודא שהשרת רץ וזמין.`;
            }
            
            setModalContent({ type: 'error', message: errorMessage });
        }
    };

    // --- 6. אפשרויות לפילטרים ---
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

    // --- 8. פונקציית ייצוא לאקסל (החדשה) ---
    const handleExportExcel = () => {
        if (!finalFilteredRows.length) return;

        // הכנת הנתונים לאקסל (מיפוי לעברית)
        const dataToExport = finalFilteredRows.map(row => ({
            'תאריך': new Date(row.date).toLocaleDateString('he-IL'),
            'שם מלקט': row.picker,
            'מספר הזמנה': row.orderNumber,
            'מק"ט': row.skuCode,
            'כמות': row.quantity,
            'ארגז שילוח': row.shippingBox,
            'עמדת עבודה': row.workstation,
            'סוג עמדה': getWorkstationType(row.workstation),
            'סוג ליקוט': getPickingType(row.location)
        }));

        // יצירת הגיליון
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "נתוני ליקוט");

        // שמירת הקובץ
        const fileName = `Picking_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // --- 9. סנכרון SQL ---
    const handleRefreshSQL = async () => {
        if (!API_URL) {
            setModalContent({ type: 'error', message: 'כתובת שרת לא מוגדרת.' });
            return;
        }
        
        // בדיקת טווח תאריכים מקסימלי (30 ימים)
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > 30) {
            setModalContent({ 
                type: 'error', 
                message: `טווח תאריכים גדול מדי. מקסימום 30 ימים, נבחר: ${daysDiff} ימים. אנא בחר טווח קטן יותר.` 
            });
            return;
        }
        
        setModalContent({ type: 'loading', message: `מסנכרן נתונים מ-SQL (${daysDiff} ימים), נא להמתין...` });
        try {
            const refreshResponse = await fetch(`${API_URL}/api/statistics/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                }),
            });

            if (!refreshResponse.ok) {
                const errorData = await refreshResponse.json().catch(() => ({ message: `שגיאת שרת: ${refreshResponse.status}` }));
                throw new Error(errorData.message || errorData.error || 'שגיאה לא ידועה');
            }
            
            hasLoadedRef.current = false; // אפס את ה-flag כדי לטעון נתונים חדשים
            await fetchStats();
            setModalContent({ type: 'success', message: 'הסנכרון הושלם בהצלחה.' });
            setTimeout(() => setIsModalOpen(false), 2000);

        } catch (err) {
            console.error('Error refreshing SQL:', err);
            let errorMessage = err.message || 'שגיאה בסנכרון הנתונים';
            
            if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
                errorMessage = `לא ניתן להתחבר לשרת בכתובת ${API_URL}. אנא ודא שהשרת רץ וזמין.`;
            }
            
            setModalContent({ type: 'error', message: errorMessage });
        }
    };

    const formatDateForInput = (d) => d.toISOString().split('T')[0];

    // ----------------- RENDER -----------------
    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            {/* כותרת וחיפוש תאריכים */}
            <div className="bg-gradient-to-br from-white via-slate-50/30 to-white p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/60">
                <div className="flex flex-col gap-4 sm:gap-6">
                    {/* מצב השוואת תקופות */}
                    <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/50">
                        <input 
                            type="checkbox" 
                            id="compareMode" 
                            checked={compareMode} 
                            onChange={(e) => setCompareMode(e.target.checked)}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="compareMode" className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                            <BarChart3 size={18} className="text-indigo-600" />
                            מצב השוואת תקופות
                            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">ALPHA</span>
                        </label>
                    </div>
                    
                    {/* תאריכים - תקופה נוכחית */}
                    <div>
                        <div className="text-xs font-bold text-indigo-600 mb-2 flex items-center gap-2">
                            <TrendingUp size={14} />
                            תקופה נוכחית
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-sm font-semibold text-slate-700">מתאריך</label>
                                <input type="date" value={formatDateForInput(startDate)} onChange={(e) => setStartDate(new Date(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-300 font-medium" />
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-sm font-semibold text-slate-700">עד תאריך</label>
                                <input type="date" value={formatDateForInput(endDate)} onChange={(e) => setEndDate(new Date(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-300 font-medium" />
                            </div>
                        </div>
                    </div>
                    
                    {/* תאריכים - תקופת השוואה */}
                    {compareMode && (
                        <div className="p-4 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-300">
                            <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-2">
                                <TrendingDown size={14} />
                                תקופת השוואה
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">מתאריך</label>
                                    <input type="date" value={formatDateForInput(compareStartDate)} onChange={(e) => setCompareStartDate(new Date(e.target.value))} className="w-full border-2 border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-400 font-medium" />
                                </div>
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">עד תאריך</label>
                                    <input type="date" value={formatDateForInput(compareEndDate)} onChange={(e) => setCompareEndDate(new Date(e.target.value))} className="w-full border-2 border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-400 font-medium" />
                                </div>
                            </div>
                            {!hasCompareData && (
                                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-amber-800 mb-1">אין נתונים לתקופת השוואה</p>
                                            <p className="text-xs text-amber-700 mb-2">כדי לראות השוואה, יש לסנכרן את הנתונים לתקופה זו מ-SQL.</p>
                                            <button 
                                                onClick={() => {
                                                    setModalContent({
                                                        type: 'confirm', 
                                                        message: `האם אתה בטוח שברצונך לסנכרן נתונים מ-SQL לתקופת השוואה (${formatDateForInput(compareStartDate)} - ${formatDateForInput(compareEndDate)})?`
                                                    }); 
                                                    setIsModalOpen(true);
                                                }} 
                                                className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors font-semibold"
                                            >
                                                סנכרן תקופת השוואה
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* כפתורים */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button onClick={fetchStats} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:from-red-700 hover:to-red-800 disabled:from-slate-300 disabled:to-slate-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base">
                            {loading ? <Spinner /> : <Search size={18} />} {loading ? 'טוען...' : 'טען נתונים'}
                        </button>
                        <button onClick={() => {setModalContent({type:'confirm', message:'האם אתה בטוח שברצונך לסנכרן נתונים מ-SQL?'}); setIsModalOpen(true);}} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white text-red-700 border-2 border-red-300 font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:border-red-400 disabled:bg-slate-50 disabled:border-slate-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base">
                            <RefreshCw size={18} /> <span className="hidden sm:inline">סנכרון SQL</span><span className="sm:hidden">סנכרון</span>
                        </button>
                        
                        {/* כפתור ייצוא לאקסל החדש */}
                        <button 
                            onClick={handleExportExcel} 
                            disabled={loading || finalFilteredRows.length === 0} 
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-300 disabled:to-slate-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base"
                        >
                            <FileSpreadsheet size={18} /> <span className="hidden sm:inline">ייצוא לאקסל</span><span className="sm:hidden">ייצוא</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* פילטרים */}
            <div className="bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-200/60">
                <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Search size={16} className="text-indigo-600" />
                    סינון תוצאות (מקומי)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                     <div className="relative group sm:col-span-2 lg:col-span-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-all duration-200" size={18} />
                        <input type="text" placeholder="חיפוש חופשי..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-300" />
                    </div>
                    <select value={selectedPickingType} onChange={(e) => { setSelectedPickingType(e.target.value); setPage(0); }} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-200 bg-white hover:border-slate-300 font-medium">
                        <option value="all">כל סוגי ליקוט</option>
                        <option value="ליקוט ידני (M2G)">ליקוט ידני (M2G)</option>
                        <option value="ליקוט רגיל">ליקוט רגיל</option>
                    </select>
                    <select value={selectedWorkstationType} onChange={(e) => { setSelectedWorkstationType(e.target.value); setPage(0); }} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-200 bg-white hover:border-slate-300 font-medium">
                        <option value="all">כל סוגי עמדות</option>
                        {uniqueOptions.wsTypes.filter(t=>t!=='all').map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <select value={selectedWorkstation} onChange={(e) => { setSelectedWorkstation(e.target.value); setPage(0); }} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-200 bg-white hover:border-slate-300 font-medium">
                        <option value="all">כל עמדות עבודה</option>
                        {uniqueOptions.workstations.filter(ws=>ws!=='all').map(ws => <option key={ws} value={ws}>{ws}</option>)}
                    </select>
                    <select value={selectedPicker} onChange={(e) => { setSelectedPicker(e.target.value); setPage(0); }} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-200 bg-white hover:border-slate-300 font-medium">
                        <option value="all">כל המלקטים</option>
                        {uniqueOptions.pickers.filter(p=>p!=='all').map(picker => <option key={picker} value={picker}>{picker}</option>)}
                    </select>
                </div>
            </div>

            {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 font-medium">{error}</div>}

            {dateFilteredStats.length > 0 ? (
                <div className="space-y-6 sm:space-y-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
                        <KpiCard 
                            title="סה״כ פריטים (מסונן)" 
                            value={kpiData.totalQuantity} 
                            icon={<Package className="text-white" />} 
                            color="bg-gradient-to-br from-indigo-500 to-indigo-600"
                            comparison={compareMode && comparisonData ? comparisonData.totalQuantity : null}
                        />
                        <KpiCard 
                            title="שורות הזמנה" 
                            value={kpiData.orderLines} 
                            icon={<ListOrdered className="text-white" />} 
                            color="bg-gradient-to-br from-blue-500 to-blue-600"
                            comparison={compareMode && comparisonData ? comparisonData.orderLines : null}
                        />
                        <KpiCard 
                            title="סך ההזמנות" 
                            value={kpiData.uniqueOrders} 
                            icon={<ClipboardList className="text-white" />} 
                            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                            comparison={compareMode && comparisonData ? comparisonData.uniqueOrders : null}
                        />
                        <KpiCard 
                            title="מלקטים פעילים" 
                            value={kpiData.uniquePickers} 
                            icon={<Users className="text-white" />} 
                            color="bg-gradient-to-br from-orange-500 to-orange-600"
                            comparison={compareMode && comparisonData ? comparisonData.uniquePickers : null}
                        />
                        <KpiCard 
                            title="ממוצע מקטים/הזמנה" 
                            value={kpiData.avgSkusPerOrder} 
                            icon={<Package className="text-white" />} 
                            color="bg-gradient-to-br from-purple-500 to-purple-600"
                            comparison={compareMode && comparisonData ? comparisonData.avgSkusPerOrder : null}
                        />
                        <KpiCard 
                            title="ממוצע פריטים/הזמנה" 
                            value={kpiData.avgItemsPerOrder} 
                            icon={<ListOrdered className="text-white" />} 
                            color="bg-gradient-to-br from-pink-500 to-pink-600"
                            comparison={compareMode && comparisonData ? comparisonData.avgItemsPerOrder : null}
                        />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                        <div className="lg:col-span-3 bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/60 hover:shadow-xl transition-all duration-300">
                             <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2"><Users size={18} className="sm:w-5 sm:h-5 text-indigo-600"/> ביצועי מלקטים</h2>
                            <div className="w-full" style={{ minHeight: '280px', height: '280px' }}>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 500}} dy={10} angle={-45} textAnchor="end" height={80} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 500}} />
                                        <Tooltip 
                                            contentStyle={{
                                                borderRadius: '12px', 
                                                border: '1px solid #e2e8f0', 
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)', 
                                                fontSize: '13px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                backdropFilter: 'blur(10px)'
                                            }} 
                                            formatter={(value) => new Intl.NumberFormat('he-IL').format(value)} 
                                        />
                                        <Legend wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 500}}/>
                                        <Bar dataKey="כמות מלוקטת" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} barSize={35}>
                                            <defs>
                                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8}/>
                                                </linearGradient>
                                            </defs>
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/60 hover:shadow-xl transition-all duration-300">
                             <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2"><Package size={18} className="sm:w-5 sm:h-5 text-indigo-600"/> חלוקה לפי סוג עמדה</h2>
                            <div className="w-full" style={{ minHeight: '280px', height: '280px' }}>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie 
                                        data={workstationDistribution} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        cx="50%" 
                                        cy="50%" 
                                        outerRadius={85} 
                                        innerRadius={55} 
                                        paddingAngle={3}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {workstationDistribution.map((entry) => (
                                            <Cell 
                                                key={`cell-${entry.name}`} 
                                                fill={WORKSTATION_COLORS[entry.name] || '#8884d8'} 
                                                strokeWidth={2}
                                                stroke="#fff"
                                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{
                                            borderRadius: '12px', 
                                            border: '1px solid #e2e8f0', 
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)', 
                                            fontSize: '13px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            backdropFilter: 'blur(10px)'
                                        }} 
                                        formatter={(value) => new Intl.NumberFormat('en').format(value)} 
                                    />
                                    <Legend wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 500}} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-gradient-to-br from-white to-slate-50/30 rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
                         <div className="p-3 sm:p-5 border-b-2 border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="flex items-center gap-2">
                                <ListOrdered className="text-indigo-600 sm:w-5 sm:h-5" size={18}/>
                                <h3 className="font-bold text-slate-800 text-sm sm:text-base">פירוט ליקוטים</h3>
                                <span className="text-xs font-semibold text-slate-600 bg-gradient-to-r from-indigo-100 to-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">{finalFilteredRows.length} שורות</span>
                            </div>
                            {selectedPicker !== 'all' && <span className="text-xs bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-3 py-1.5 rounded-full font-semibold shadow-md">מסנן מלקט: {selectedPicker}</span>}
                        </div>
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <table className="min-w-full text-xs sm:text-sm text-left text-slate-600">
                                    <thead className="text-xs uppercase bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-bold tracking-wide">
                                        <tr>
                                            {pickingHeadCells.map(cell => (
                                                <th key={cell.id} scope="col" className="px-3 sm:px-6 py-3 sm:py-4 cursor-pointer hover:bg-indigo-50 transition-all duration-200 whitespace-nowrap border-b-2 border-slate-200" onClick={() => handleSortRequest(cell.id)}>
                                                    <div className="flex items-center gap-1">
                                                        <span className="hidden sm:inline">{cell.label}</span>
                                                        <span className="sm:hidden">{cell.label.length > 8 ? cell.label.substring(0, 8) + '...' : cell.label}</span>
                                                        {orderBy === cell.id ? (order === 'desc' ? <ArrowDown size={12} className="text-indigo-600"/> : <ArrowUp size={12} className="text-indigo-600"/>) : <ChevronsUpDown size={12} className="opacity-30" />}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedRows.map((row, idx) => (
                                            <tr key={row._id || Math.random()} className={`bg-white hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/30 transition-all duration-200 ${idx % 2 === 0 ? 'bg-slate-50/30' : 'bg-white'}`}>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-slate-600 text-xs sm:text-sm font-medium">{new Date(row.date).toLocaleDateString('he-IL')}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-slate-800 text-xs sm:text-sm">{row.picker || '-'}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-slate-700 text-xs sm:text-sm">{row.orderNumber}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-slate-700 text-xs sm:text-sm">{row.shippingBox}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-slate-700 text-xs sm:text-sm">{row.skuCode}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-extrabold text-indigo-700 text-right text-xs sm:text-sm">{row.quantity}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-700 text-xs sm:text-sm font-medium">{row.workstation}</td>
                                            </tr>
                                        ))}
                                        {paginatedRows.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">לא נמצאו רשומות</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-white border-t-2 border-slate-200/60">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm border-2 border-slate-300 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300 font-semibold transition-all duration-200">הקודם</button>
                            <span className="text-xs sm:text-sm font-bold text-slate-700 bg-gradient-to-r from-indigo-100 to-blue-100 px-4 py-2 rounded-xl border border-indigo-200">עמוד {page + 1} מתוך {Math.ceil(finalFilteredRows.length / rowsPerPage) || 1}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(finalFilteredRows.length / rowsPerPage) - 1} className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm border-2 border-slate-300 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300 font-semibold transition-all duration-200">הבא</button>
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

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {modalContent.type === 'confirm' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <RefreshCw className="text-white" size={28}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3">אישור סנכרון</h3>
                        <p className="text-slate-600 mb-6 leading-relaxed">{modalContent.message}</p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={()=>setIsModalOpen(false)} 
                                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                ביטול
                            </button>
                            <button 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    // בדיקה אם זה סנכרון תקופת השוואה או תקופה נוכחית
                                    if (modalContent.message && modalContent.message.includes('תקופת השוואה')) {
                                        handleRefreshComparePeriod();
                                    } else {
                                        handleRefreshSQL();
                                    }
                                }} 
                                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                אשר
                            </button>
                        </div>
                    </div>
                )}
                {modalContent.type === 'loading' && (
                    <div className="text-center py-4">
                        <Spinner large />
                        <p className="mt-6 text-slate-700 font-semibold text-lg">{modalContent.message}</p>
                        <div className="mt-4 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                    </div>
                )}
                {modalContent.type === 'success' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg animate-in zoom-in-95">
                            <CheckCircle className="text-white" size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">הצלחה!</h3>
                        <p className="text-slate-600">{modalContent.message}</p>
                    </div>
                )}
                {modalContent.type === 'error' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <AlertTriangle className="text-white" size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">שגיאה</h3>
                        <p className="text-slate-600 mb-6">{modalContent.message}</p>
                        <button 
                            onClick={()=>setIsModalOpen(false)} 
                            className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            סגור
                        </button>
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
    const hasLoadedRef = useRef(false); // שמירה אם הנתונים כבר נטענו

    // --- LIVE MODE STATE ---
    const [isLive] = useState(false); 
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
    const [rowsPerPage] = useState(10);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('lastActivityTime');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ type: '', message: '' });

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    // --- 1. שליפת נתונים ---
    const fetchInboundStats = useCallback(async () => {
        if (!startDate || !endDate) return;
        
        // אם הנתונים כבר נטענו, לא נטען שוב
        if (hasLoadedRef.current && !isUpdating) {
            return;
        }
        
        if (!API_URL) {
            setError("כתובת שרת לא מוגדרת. אנא בדוק את הגדרות הסביבה.");
            return;
        }
        
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
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: `שגיאת שרת: ${response.status} ${response.statusText}` };
                }
                throw new Error(errorData.message || errorData.error || `שגיאת רשת: ${response.status}`);
            }
            const { data } = await response.json();
            
            if (Array.isArray(data)) {
                setAllRows(data);
                hasLoadedRef.current = true; // סמן שהנתונים נטענו
            } else {
                setAllRows([]);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            let errorMessage = "שגיאה בטעינת נתונים";
            
            if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
                errorMessage = `לא ניתן להתחבר לשרת בכתובת ${API_URL}. אנא ודא שהשרת רץ וזמין.`;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            if (!isLive) setError(errorMessage);
            setAllRows([]);
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


    const handleExportExcel = () => {
        if (!filteredRows.length) return;

        const summary = filteredRows.reduce((acc, row) => {
            const name = row.receiver || 'לא ידוע';
            
            const areaType = getMappedWorkArea(row);
            const isWeight = WEIGHT_SKUS.has(String(row.skuCode)) || row.pricingType === 'weight';

            if (!acc[name]) {
                acc[name] = {
                    'שם עובד': name,
                    'יחידות Inbound רגיל': 0,
                    'מק"טים יחידות': 0,
                    'כמות ב-M2G': 0,
                    'מק"טים M2G': 0,
                    'מק"טים AGV': 0,
                    'מק"טים BULK': 0, 
                    'מק"טים שקיל': 0,
                    'מספר הזמנות ייחודיות': new Set()
                };
            }

            acc[name]['מספר הזמנות ייחודיות'].add(row.orderNumber);

            if (isWeight) {
                acc[name]['מק"טים שקיל'] += 1;
            } else {
                acc[name]['מק"טים יחידות'] += 1;
            }
            
            if (areaType === 'M2G הכנסת סחורה') {
                acc[name]['כמות ב-M2G'] += row.quantity;
                acc[name]['מק"טים M2G'] += 1;
            } 
            else if (areaType === 'איזור AGV') {
                acc[name]['מק"טים AGV'] += 1; 
            } 
            else if (areaType === 'איזור BULK') { // שים לב: וודא שזה תואם לפונקציית העזר (אם היא מחזירה 'BULK' או 'איזור BULK')
                acc[name]['מק"טים BULK'] += 1; 
            } 
            else {
                acc[name]['יחידות Inbound רגיל'] += row.quantity;
            }

            return acc;
        }, {});

        // 2. המרה למערך שטוח
        const exportData = Object.values(summary).map(item => ({
            ...item,
            'מספר הזמנות ייחודיות': item['מספר הזמנות ייחודיות'].size
        }));

        // --- הוספת שורת סה"כ (החלק החדש) ---
        
        // יצירת אובייקט לסיכום
        const totalRow = {
            'שם עובד': 'סה"כ כללי',
            'יחידות Inbound רגיל': 0,
            'מק"טים יחידות': 0,
            'כמות ב-M2G': 0,
            'מק"טים M2G': 0,
            'מק"טים AGV': 0,
            'מק"טים BULK': 0,
            'מק"טים שקיל': 0,
            'מספר הזמנות ייחודיות': 0
        };

        // סכימת כל העמודות
        exportData.forEach(row => {
            totalRow['יחידות Inbound רגיל'] += row['יחידות Inbound רגיל'] || 0;
            totalRow['מק"טים יחידות'] += row['מק"טים יחידות'] || 0;
            totalRow['כמות ב-M2G'] += row['כמות ב-M2G'] || 0;
            totalRow['מק"טים M2G'] += row['מק"טים M2G'] || 0;
            totalRow['מק"טים AGV'] += row['מק"טים AGV'] || 0;
            totalRow['מק"טים BULK'] += row['מק"טים BULK'] || 0;
            totalRow['מק"טים שקיל'] += row['מק"טים שקיל'] || 0;
            totalRow['מספר הזמנות ייחודיות'] += row['מספר הזמנות ייחודיות'] || 0;
        });

        // הוספת שורת הסיכום לסוף המערך
        exportData.push(totalRow);

        // ------------------------------------

        // 3. יצירת האקסל
        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [
            {wch: 18}, // שם
            {wch: 18}, // Inbound רגיל
            {wch: 18}, // M2G כמות
            {wch: 18}, // M2G מקט
            {wch: 18}, // AGV מקט
            {wch: 18}, // BULK מקט
            {wch: 18}, // שקיל
            {wch: 18}, // יחידות
            {wch: 25}  // הזמנות
        ];

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
        if (!API_URL) {
            setModalContent({ type: 'error', message: 'כתובת שרת לא מוגדרת.' });
            return;
        }
        
        // בדיקת טווח תאריכים מקסימלי (30 ימים)
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > 30) {
            setModalContent({ 
                type: 'error', 
                message: `טווח תאריכים גדול מדי. מקסימום 30 ימים, נבחר: ${daysDiff} ימים. אנא בחר טווח קטן יותר.` 
            });
            return;
        }
        
        setModalContent({ type: 'loading', message: `מבצע סנכרון נתונים מול שרת SQL (${daysDiff} ימים)...` });
        try {
            const res = await fetch(`${API_URL}/api/statistics/inbound/refresh`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate }),
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: `שגיאת שרת: ${res.status}` }));
                throw new Error(errorData.message || errorData.error || 'שגיאה בסנכרון');
            }
            
            hasLoadedRef.current = false; // אפס את ה-flag כדי לטעון נתונים חדשים
            setModalContent({ type: 'success', message: 'הסנכרון הושלם בהצלחה!' });
            setTimeout(() => { setIsModalOpen(false); fetchInboundStats(); }, 1500);
        } catch (e) {
            console.error('Error refreshing inbound SQL:', e);
            let errorMessage = e.message || 'שגיאה בסנכרון הנתונים';
            
            if (e instanceof TypeError && (e.message.includes('fetch') || e.message.includes('Failed to fetch'))) {
                errorMessage = `לא ניתן להתחבר לשרת בכתובת ${API_URL}. אנא ודא שהשרת רץ וזמין.`;
            }
            
            setModalContent({ type: 'error', message: errorMessage });
        }
    };

    const formatDateForInput = (d) => d.toISOString().split('T')[0];
    const KpiCard = ({ title, value, icon, color }) => {
        // פורמט מספר - אם זה מספר עשרוני, נציג עם עד 2 ספרות אחרי הנקודה
        const formatValue = (val) => {
            if (typeof val === 'number' && val % 1 !== 0) {
                return new Intl.NumberFormat('he-IL', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 2 
                }).format(val);
            }
            return new Intl.NumberFormat('he-IL').format(val);
        };
        
        return (
            <div className="bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-5 rounded-2xl shadow-md border border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:shadow-xl hover:scale-[1.02] hover:border-slate-300 transition-all duration-300 min-h-[100px] sm:min-h-0 backdrop-blur-sm">
                <div className="flex-1 w-full sm:w-auto">
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-2 sm:mb-1 leading-tight break-words">{title}</p>
                    <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">{formatValue(value)}</p>
                </div>
                <div className={`p-3 sm:p-4 rounded-2xl shadow-lg flex-shrink-0 mt-2 sm:mt-0 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ${color || 'bg-gradient-to-br from-indigo-50 to-indigo-100'}`}>{icon}</div>
            </div>
        );
    };

    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            {/* Header */}
            <div className="bg-gradient-to-br from-white via-slate-50/30 to-white p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/60">
                <div className="flex flex-col gap-4 sm:gap-6">
                    {/* תאריכים */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                        <div className="flex-1 flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700">מתאריך</label>
                            <input type="date" value={formatDateForInput(startDate)} onChange={(e) => setStartDate(new Date(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-300 font-medium" />
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700">עד תאריך</label>
                            <input type="date" value={formatDateForInput(endDate)} onChange={(e) => setEndDate(new Date(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-300 font-medium" />
                        </div>
                    </div>
                    {/* כפתורים */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button onClick={fetchInboundStats} disabled={loading || isLive} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:from-red-700 hover:to-red-800 disabled:from-slate-300 disabled:to-slate-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base">
                            {loading ? <Spinner /> : <Search size={18} />} {loading ? 'טוען...' : 'חיפוש תאריכים'}
                        </button>
                        {/* <button onClick={() => setIsLive(!isLive)} className={`flex items-center gap-2 font-semibold py-2.5 px-6 rounded-lg shadow-md transition-all ${isLive ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {isLive ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} {isLive ? 'עצור LIVE' : 'הפעל LIVE'}
                        </button> */}
                        <button onClick={() => {setModalContent({type:'confirm', message:'האם אתה בטוח שברצונך לסנכרן נתונים מ-SQL?'}); setIsModalOpen(true);}} disabled={loading || isLive} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white text-red-700 border-2 border-red-300 font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:border-red-400 disabled:bg-slate-50 disabled:border-slate-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base">
                            <RefreshCw size={18} /> <span className="hidden sm:inline">סנכרון SQL</span><span className="sm:hidden">סנכרון</span>
                        </button>
                        <button onClick={handleExportExcel} disabled={loading || filteredRows.length === 0} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-300 disabled:to-slate-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base">
                            <FileSpreadsheet size={18} /> <span className="hidden sm:inline">ייצוא לאקסל</span><span className="sm:hidden">ייצוא</span>
                        </button>
                    </div>
                </div>
                {isUpdating && <div className="text-center mt-2 text-xs text-green-600 flex justify-center items-center gap-1"><RefreshCw size={12} className="animate-spin"/> מתעדכן אוטומטית...</div>}
            </div>

            {/* Filters */}
            <div className="bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-200/60">
                <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Search size={16} className="text-indigo-600" />
                    סינון תוצאות
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                    <select value={selectedPricingType} onChange={(e) => { setSelectedPricingType(e.target.value); setPage(0); }} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-200 bg-white hover:border-slate-300 font-medium">
                        <option value="all">כל סוגי התמחור</option>
                        <option value="weight">שקיל (Weight)</option>
                        <option value="unit">יחידות (Unit)</option>
                    </select>
                    <select value={selectedWorkArea} onChange={(e) => { setSelectedWorkArea(e.target.value); setPage(0); }} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-200 bg-white hover:border-slate-300 font-medium">
                        <option value="all">כל אזורי העבודה</option>
                        {uniqueOptions.workAreas.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={selectedReceiver} onChange={(e) => { setSelectedReceiver(e.target.value); setPage(0); }} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-200 bg-white hover:border-slate-300 font-medium">
                        <option value="all">כל הקולטים</option>
                        {uniqueOptions.receivers.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={selectedOrder} onChange={(e) => { setSelectedOrder(e.target.value); setPage(0); }} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-200 bg-white hover:border-slate-300 font-medium">
                        <option value="all">כל ההזמנות</option>
                        {uniqueOptions.orders.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={selectedSku} onChange={(e) => { setSelectedSku(e.target.value); setPage(0); }} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-200 bg-white hover:border-slate-300 font-medium">
                        <option value="all">כל המק״טים</option>
                        {uniqueOptions.skus.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <div className="relative group sm:col-span-2 lg:col-span-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-all duration-200" size={18} />
                        <input type="text" placeholder="חיפוש חופשי..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-300" />
                    </div>
                </div>
            </div>

            {error && !isLive && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 font-medium">{error}</div>}
            
            {allRows.length > 0 && (
                <div className="space-y-6 sm:space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <KpiCard title="סה״כ פריטים שנקלטו" value={kpiData.totalQuantity} icon={<Package className="text-white" />} color="bg-gradient-to-br from-indigo-500 to-indigo-600" />
                        <KpiCard title="שורות משקל (שקיל)" value={kpiData.weightScans} icon={<Scale className="text-white" />} color="bg-gradient-to-br from-purple-500 to-purple-600" />
                        <KpiCard title="שורות יחידות (בודדים)" value={kpiData.unitScans} icon={<Box className="text-white" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                        <KpiCard title="קולטים פעילים" value={kpiData.uniqueReceivers} icon={<Users className="text-white" />} color="bg-gradient-to-br from-orange-500 to-orange-600" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                        <div className="lg:col-span-3 bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/60 hover:shadow-xl transition-all duration-300">
                            <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2"><Users size={18} className="sm:w-5 sm:h-5 text-indigo-600"/> ביצועי קולטים (כמות)</h2>
                            <div className="w-full" style={{ minHeight: '280px', height: '280px' }}>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 500}} dy={10} angle={-45} textAnchor="end" height={80} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 500}} />
                                    <Tooltip 
                                        contentStyle={{
                                            borderRadius: '12px', 
                                            border: '1px solid #e2e8f0', 
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)', 
                                            fontSize: '13px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            backdropFilter: 'blur(10px)'
                                        }} 
                                        formatter={(val) => new Intl.NumberFormat('he-IL').format(val)} 
                                    />
                                    <Bar dataKey="כמות שנקלטה" fill="url(#colorGradientInbound)" radius={[8, 8, 0, 0]} barSize={35}>
                                        <defs>
                                            <linearGradient id="colorGradientInbound" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                                                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8}/>
                                            </linearGradient>
                                        </defs>
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/60 hover:shadow-xl transition-all duration-300">
                            <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2"><Package size={18} className="sm:w-5 sm:h-5 text-indigo-600"/> חלוקה לאזורים</h2>
                            <div className="w-full" style={{ minHeight: '280px', height: '280px' }}>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie 
                                        data={workAreaDistribution} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        cx="50%" 
                                        cy="50%" 
                                        outerRadius={85} 
                                        innerRadius={55} 
                                        paddingAngle={3}
                                        labelLine={false}
                                    >
                                        {workAreaDistribution.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={COLORS[index % COLORS.length]} 
                                                strokeWidth={2}
                                                stroke="#fff"
                                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{
                                            borderRadius: '12px', 
                                            border: '1px solid #e2e8f0', 
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)', 
                                            fontSize: '13px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            backdropFilter: 'blur(10px)'
                                        }} 
                                    />
                                    <Legend wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 500}} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-slate-50/30 rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
                        <div className="p-3 sm:p-5 border-b-2 border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="flex items-center gap-2">
                                <ListOrdered className="text-indigo-600 sm:w-5 sm:h-5" size={18}/>
                                <h3 className="font-bold text-slate-800 text-sm sm:text-base">פירוט רשומות</h3>
                                <span className="text-xs font-semibold text-slate-600 bg-gradient-to-r from-indigo-100 to-blue-100 border border-indigo-200 px-3 py-1 rounded-full">{filteredRows.length} שורות</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <table className="min-w-full text-xs sm:text-sm text-left text-slate-600">
                                    <thead className="text-xs uppercase bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-bold tracking-wide">
                                        <tr>
                                            {inboundHeadCells.map(cell => (
                                                <th key={cell.id} className="px-3 sm:px-6 py-3 sm:py-4 cursor-pointer hover:bg-indigo-50 transition-all duration-200 whitespace-nowrap border-b-2 border-slate-200" onClick={() => handleSortRequest(cell.id)}>
                                                    <div className="flex items-center gap-1">
                                                        <span className="hidden sm:inline">{cell.label}</span>
                                                        <span className="sm:hidden">{cell.label.length > 8 ? cell.label.substring(0, 8) + '...' : cell.label}</span>
                                                        {orderBy === cell.id ? (order === 'desc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>) : <ChevronsUpDown size={12} className="opacity-30"/>}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedRows.map((row, idx) => (
                                            <tr key={idx} className={`bg-white hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/30 transition-all duration-200 ${idx % 2 === 0 ? 'bg-slate-50/30' : 'bg-white'}`}>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-slate-600 text-xs sm:text-sm font-medium">{new Date(row.date).toLocaleDateString('he-IL')}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-slate-800 text-xs sm:text-sm">{row.receiver || '-'}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-slate-700 text-xs sm:text-sm">{row.orderNumber}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-slate-700 text-xs sm:text-sm">{row.skuCode}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-extrabold text-indigo-700 text-xs sm:text-sm">{row.quantity}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-700 text-xs sm:text-sm font-medium">{row.location || '-'}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs">{row.container}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-700 text-xs sm:text-sm font-medium">{row.batch || '-'}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 truncate max-w-[100px] sm:max-w-[150px] text-slate-700 text-xs sm:text-sm">{row.owner}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                         <div className="flex flex-col sm:flex-row justify-between items-center gap-2 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-white border-t-2 border-slate-200/60">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page===0} className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm border-2 border-slate-300 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300 font-semibold transition-all duration-200">הקודם</button>
                            <span className="text-xs sm:text-sm font-bold text-slate-700 bg-gradient-to-r from-indigo-100 to-blue-100 px-4 py-2 rounded-xl border border-indigo-200">עמוד {page + 1} מתוך {Math.ceil(filteredRows.length / rowsPerPage) || 1}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(filteredRows.length / rowsPerPage) - 1} className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm border-2 border-slate-300 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300 font-semibold transition-all duration-200">הבא</button>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {modalContent.type === 'confirm' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <RefreshCw className="text-white" size={28}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3">אישור סנכרון</h3>
                        <p className="text-slate-600 mb-6 leading-relaxed">{modalContent.message}</p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={()=>setIsModalOpen(false)} 
                                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                ביטול
                            </button>
                            <button 
                                onClick={handleRefreshSQL} 
                                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                אשר
                            </button>
                        </div>
                    </div>
                )}
                {modalContent.type === 'loading' && (
                    <div className="text-center py-4">
                        <Spinner large />
                        <p className="mt-6 text-slate-700 font-semibold text-lg">{modalContent.message}</p>
                        <div className="mt-4 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                    </div>
                )}
                {modalContent.type === 'success' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg animate-in zoom-in-95">
                            <CheckCircle className="text-white" size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">הצלחה!</h3>
                        <p className="text-slate-600">{modalContent.message}</p>
                    </div>
                )}
                {modalContent.type === 'error' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <AlertTriangle className="text-white" size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">שגיאה</h3>
                        <p className="text-slate-600 mb-6">{modalContent.message}</p>
                        <button 
                            onClick={()=>setIsModalOpen(false)} 
                            className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            סגור
                        </button>
                    </div>
                )}
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
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6 min-h-[3rem]">
                    <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-slate-800 via-indigo-700 to-slate-800 bg-clip-text text-transparent">{tabTitles[activeTab]}</h1>
                </header>
                
                <div className="border-b-2 border-slate-200/60 mb-6 bg-white/50 rounded-t-xl p-2 shadow-sm">
                    <nav className="-mb-px flex space-x-6" style={{ direction: 'rtl' }}>
                        <button
                            onClick={() => setActiveTab('picking')}
                            className={cn(
                                "py-3 px-5 font-bold text-sm whitespace-nowrap rounded-t-xl transition-all duration-200",
                                activeTab === 'picking' 
                                    ? "text-indigo-700 border-b-3 border-indigo-600 bg-gradient-to-b from-indigo-50/50 to-transparent shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-b-2 border-transparent"
                            )}
                        >
                            סטטיסטיקת ליקוט
                        </button>
                        <button
                             onClick={() => setActiveTab('inbound')}
                             className={cn(
                                 "py-3 px-5 font-bold text-sm whitespace-nowrap rounded-t-xl transition-all duration-200",
                                 activeTab === 'inbound' 
                                     ? "text-indigo-700 border-b-3 border-indigo-600 bg-gradient-to-b from-indigo-50/50 to-transparent shadow-sm" 
                                     : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-b-2 border-transparent"
                             )}
                        >
                            סטטיסטיקת הכנסת סחורה
                        </button>
                    </nav>
                </div>

                <main className="min-h-[400px]">
                    <div style={{ display: activeTab === 'picking' ? 'block' : 'none' }}>
                        <PickingStats />
                    </div>
                    <div style={{ display: activeTab === 'inbound' ? 'block' : 'none' }}>
                        <InboundStats />
                    </div>
                </main>
            </div>
        </div>
        </>
    );
};

// --- קומפוננטות עזר (משותפות) ---
const KpiCard = ({ title, value, icon, color, comparison }) => {
    // פורמט מספר - אם זה מספר עשרוני, נציג עם עד 2 ספרות אחרי הנקודה
    const formatValue = (val) => {
        if (typeof val === 'number' && val % 1 !== 0) {
            // מספר עשרוני - נציג עם עד 2 ספרות
            return new Intl.NumberFormat('he-IL', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 2 
            }).format(val);
        }
        // מספר שלם - פורמט רגיל
        return new Intl.NumberFormat('he-IL').format(val);
    };
    
    const getChangeColor = (change) => {
        if (change > 0) return 'text-emerald-600 bg-emerald-50';
        if (change < 0) return 'text-red-600 bg-red-50';
        return 'text-slate-600 bg-slate-50';
    };
    
    const getChangeIcon = (change) => {
        if (change > 0) return <TrendingUp size={14} />;
        if (change < 0) return <TrendingDown size={14} />;
        return null;
    };
    
    return (
        <div className="bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-5 rounded-2xl shadow-md border border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:shadow-xl hover:scale-[1.02] hover:border-slate-300 transition-all duration-300 min-h-[100px] sm:min-h-0 backdrop-blur-sm">
            <div className="flex-1 w-full sm:w-auto">
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-2 sm:mb-1 leading-tight break-words">{title}</p>
                <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">{formatValue(value)}</p>
                {comparison && (
                    <div className={`mt-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold w-fit ${getChangeColor(comparison.change)}`}>
                        {getChangeIcon(comparison.change)}
                        <span>{comparison.change > 0 ? '+' : ''}{formatValue(comparison.change)}%</span>
                        <span className="text-xs opacity-70">({formatValue(comparison.previous)} → {formatValue(comparison.current)})</span>
                    </div>
                )}
            </div>
            <div className={`p-3 sm:p-4 rounded-2xl shadow-lg flex-shrink-0 mt-2 sm:mt-0 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ${color || 'bg-gradient-to-br from-indigo-50 to-indigo-100'}`}>
                {/* אם מעבירים צבע מותאם אישית (gradient), האייקון יהיה לבן. אחרת ברירת מחדל */}
                {color ? icon : React.cloneElement(icon, { className: "text-indigo-600" })}
            </div>
        </div>
    );
};

const Alert = ({ type, children }) => {
    const typeClasses = {
        info: "bg-blue-50 text-blue-700",
        error: "bg-red-50 text-red-700",
    };
    return <div className={cn("p-4 mb-4 rounded-md text-sm", typeClasses[type])}>{children}</div>;
};

const Spinner = ({ large = false }) => (
    <div className="flex flex-col items-center justify-center">
        <div className={cn(
            "animate-spin rounded-full border-4 border-transparent",
            large ? "w-16 h-16 border-t-4 border-r-4" : "w-8 h-8 border-t-2 border-r-2"
        )} style={{ 
            borderTopColor: '#6366f1', 
            borderRightColor: '#818cf8',
            borderBottomColor: '#c7d2fe',
            borderLeftColor: '#e0e7ff'
        }}></div>
        {large && (
            <div className="mt-4 space-y-2">
                <div className="flex gap-1 justify-center">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        )}
    </div>
);

const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex justify-center items-center p-4 animate-in fade-in duration-200" 
            style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
            }}
            onClick={onClose}
        >
            <div 
                className="bg-gradient-to-br from-white via-slate-50 to-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300 animate-in zoom-in-95 fade-in"
                onClick={e => e.stopPropagation()}
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                }}
            >
                <div className="flex justify-end p-4 pb-0">
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1.5 transition-all duration-200"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="px-6 pb-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Statistics;