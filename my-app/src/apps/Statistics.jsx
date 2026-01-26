// src/apps/Statistics.jsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ClipboardList, Package, ListOrdered, ChevronsUpDown, ArrowUp, ArrowDown, RefreshCw, Search, X, CheckCircle, AlertTriangle,Scale, Box,FileSpreadsheet, Zap, Loader2, TrendingUp, TrendingDown, BarChart3, Download, Radio } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, CartesianGrid, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import toast, { Toaster } from 'react-hot-toast';
import { debounce } from 'lodash';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const API_URL = import.meta.env.VITE_API_URL;

// --- פונקציות עזר ---
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

const getWorkstationType = (workstation, t) => {
    if (!workstation) return t('notAssigned');
    // בדיקה מיוחדת ל-M2G ידני (עמדות M2G) - צריך להיות קודם לפני הבדיקה של המספרים
    if (workstation === 'עמדות (M2G)' || workstation === 'M2G ידני' || (workstation.includes('M2G') && !workstation.match(/[0-9]/))) {
        return 'M2G ידני'; // נחזיר ערך קבוע כדי שיתאים ל-WORKSTATION_COLORS
    }
    const stationNumStr = workstation.replace(/[^0-9]/g, '');
    if (!stationNumStr) return t('other');
    const stationNum = parseInt(stationNumStr, 10);
    
    if ((stationNum >= 2101 && stationNum <= 2104) || (stationNum >= 2201 && stationNum <= 2205)) return t('cooling');
    if ((stationNum >= 2105 && stationNum <= 2110) || (stationNum >= 2206 && stationNum <= 2211)) return t('dry');
    if (stationNum >= 2111 && stationNum <= 2112) return t('agv');
    return t('other');
};

const getPickingType = (location, workstation, t) => {
    // ליקוט ידני M2G - מהשאילתה החדשה (work_area_id = 'WHAREA00031')
    // בדיקה גם ל-'M2G ידני' כי זה הערך שנשמר ב-workstation
    if (workstation === 'עמדות (M2G)' || workstation === 'M2G ידני' || (workstation && workstation.includes('M2G') && workstation.includes('ידני'))) {
        return t('manualM2gPicking');
    }
    // ליקוט M2G בעמדה - מה שהיה קיים (location = 'MOVETO')
    if (location === 'MOVETO') {
        return t('m2gPickingStation');
    }
    // ליקוט רגיל
    return t('regularPicking');
};

const WORKSTATION_COLORS = {
    'קירור': '#3b82f6', 'יבש': '#f97316', 'AGV': '#16a34a',
    'אחר': '#64748b', 'לא משויך': '#d1d5db'
};

const getPickingHeadCells = (t) => [
    { id: 'date', label: t('date') },
    { id: 'picker', label: t('pickerLabel') },
    { id: 'orderNumber', label: t('orderNumber') },
    { id: 'shippingBox', label: t('shippingBox') },
    { id: 'skuCode', label: t('skuCode') },
    { id: 'quantity', label: t('quantity') },
    { id: 'workstation', label: t('workstationLabel') }
];

// src/apps/Statistics.jsx -> PickingStats Component

const PickingStats = () => {
    const { t } = useTranslation();
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
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedPickingType, setSelectedPickingType] = useState('all');
    const [selectedWorkstationType, setSelectedWorkstationType] = useState('all');
    const [selectedWorkstation, setSelectedWorkstation] = useState('all');
    const [selectedPicker, setSelectedPicker] = useState('all');
    const [filterLoading, setFilterLoading] = useState(false); // אינדיקטור טעינה לפילטרים
    const [selectedPickerDetails, setSelectedPickerDetails] = useState(null); // פרטי המלקט שנבחר בגרף
    const [showPickerSkusModal, setShowPickerSkusModal] = useState(false); // מודל מקטים ייחודיים של מלקט
    
    // --- State לביצועים ---
    const [loadingProgress, setLoadingProgress] = useState(0); // התקדמות טעינה
    const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false); // עדכון בזמן אמת
    const realTimeIntervalRef = useRef(null); // ref לעדכון בזמן אמת

    // --- State לטבלה ---
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('date');
    const [expandedPicker, setExpandedPicker] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});

    // --- State למודל ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ type: '', message: '' });

    const WORKSTATION_COLORS = {
        [t('cooling')]: '#3b82f6', 
        [t('dry')]: '#f97316',   
        [t('agv')]: '#16a34a',
        'M2G ידני': '#8b5cf6', // צבע סגול ל-M2G ידני
        [t('other')]: '#64748b',   
        [t('notAssigned')]: '#d1d5db' 
    };

    // --- Caching helper ---
    const getCacheKey = useCallback((start, end) => {
        return `picking_stats_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
    }, []);

    const getCachedData = useCallback((key) => {
        try {
            const cached = sessionStorage.getItem(key);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // Cache valid for 5 minutes
                if (Date.now() - timestamp < 5 * 60 * 1000) {
                    return data;
                }
            }
        } catch (e) {
            console.warn('Cache read error:', e);
        }
        return null;
    }, []);

    const setCachedData = useCallback((key, data) => {
        try {
            // בדיקת גודל הנתונים לפני שמירה
            const dataString = JSON.stringify({
                data,
                timestamp: Date.now()
            });
            const sizeInBytes = new Blob([dataString]).size;
            const sizeInMB = sizeInBytes / (1024 * 1024);
            
            // אם הנתונים גדולים מדי (יותר מ-6MB), ננסה לנקות cache ישן לפני שמירה
            if (sizeInMB > 6) {
                // נמחק את כל ה-cache הישן לפני שמירה
                const keysToRemove = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    const storageKey = sessionStorage.key(i);
                    if (storageKey && storageKey.startsWith('picking_stats_') && storageKey !== key) {
                        keysToRemove.push(storageKey);
                    }
                }
                keysToRemove.forEach(k => {
                    try {
                        sessionStorage.removeItem(k);
                    } catch {
                        // שקט - לא צריך warning על זה
                    }
                });
            }
            
            // ניסיון שמירה - אם יש בעיית quota, ננקה cache ישן
            sessionStorage.setItem(key, dataString);
        } catch (quotaError) {
            if (quotaError.name === 'QuotaExceededError') {
                // נסה לנקות cache ישן - נמחק את כל ה-cache הישן
                const keysToRemove = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    const storageKey = sessionStorage.key(i);
                    if (storageKey && storageKey.startsWith('picking_stats_')) {
                        // אם זה לא ה-key הנוכחי, מחק אותו
                        if (storageKey !== key) {
                            keysToRemove.push(storageKey);
                        } else {
                            // אם זה ה-key הנוכחי, נסה לבדוק אם הוא ישן
                            try {
                                const cached = sessionStorage.getItem(storageKey);
                                if (cached) {
                                    const { timestamp } = JSON.parse(cached);
                                    // מחק cache ישן יותר מ-5 דקות
                                    if (Date.now() - timestamp > 5 * 60 * 1000) {
                                        keysToRemove.push(storageKey);
                                    }
                                }
                            } catch {
                                // אם יש שגיאה בקריאת cache, מחק אותו
                                keysToRemove.push(storageKey);
                            }
                        }
                    }
                }
                
                // מחק cache ישן
                if (keysToRemove.length > 0) {
                    keysToRemove.forEach(k => {
                        try {
                            sessionStorage.removeItem(k);
                        } catch {
                            // שקט - לא צריך warning על זה
                        }
                    });
                    
                    // נסה שוב לשמור
                    try {
                        const dataString = JSON.stringify({
                            data,
                            timestamp: Date.now()
                        });
                        sessionStorage.setItem(key, dataString);
                    } catch {
                        // אם עדיין יש שגיאה, פשוט נמשיך בלי cache - זה בסדר
                    }
                }
                // אם אין cache ישן למחוק - הנתונים גדולים מדי
                // זה בסדר, פשוט נמשיך בלי cache
            }
            // אם זה לא QuotaExceededError, פשוט נמשיך בלי cache
        }
    }, []);

    // --- 1. טעינת נתונים ---
    const fetchStats = useCallback(async () => {
        if (!startDate || !endDate) {
            toast.error(t('pleaseSelectDateRange'), { icon: '⚠️' });
            return;
        }
        
        if (!API_URL) {
            setError(t('serverAddressNotConfigured'));
            return;
        }
        
        // בדיקת cache
        const cacheKey = getCacheKey(startDate, endDate);
        const cachedData = getCachedData(cacheKey);
        if (cachedData && !hasLoadedRef.current) {
            setAllStats(cachedData);
            hasLoadedRef.current = true;
                toast.success(`${t('loadedFromCache')} ${cachedData.length} ${t('recordsFromCache')}`, {
                icon: '💾',
                duration: 2000,
            });
            return;
        }
        
        setLoading(true);
        setLoadingProgress(0);
        setError(null);
        const fetchStartTime = performance.now();
        
        try {
            // סימולציה של התקדמות (אם יש Content-Length)
            setLoadingProgress(10);
            
            // טעינה ישירה מ-SQL ללא שמירה ב-MongoDB
            const params = new URLSearchParams({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });
            
            setLoadingProgress(30);
            const response = await fetch(`${API_URL}/api/statistics/picking/direct?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            setLoadingProgress(60);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: `${t('serverError')}: ${response.status} ${response.statusText}` };
                }
                throw new Error(errorData.message || errorData.error || `${t('serverError')}: ${response.status}`);
            }
            
            const parseStartTime = performance.now();
            const data = await response.json();
            const parseEndTime = performance.now();
            
            setLoadingProgress(80);
            
            // אם התגובה היא אובייקט עם data, נקח את data, אחרת נשתמש בתגובה ישירות
            const statsData = Array.isArray(data) ? data : (data.data || []);
            
            if (Array.isArray(statsData)) {
                const setStateStartTime = performance.now();
                setAllStats(statsData);
                setCachedData(cacheKey, statsData); // שמירה ב-cache
                hasLoadedRef.current = true; // סמן שהנתונים נטענו
                const setStateEndTime = performance.now();
                
                setLoadingProgress(100);
                
                const fetchEndTime = performance.now();
                console.log(`Fetch stats timing:
                    - Network: ${(parseStartTime - fetchStartTime).toFixed(2)}ms
                    - JSON Parse: ${(parseEndTime - parseStartTime).toFixed(2)}ms
                    - Set State: ${(setStateEndTime - setStateStartTime).toFixed(2)}ms
                    - Total: ${(fetchEndTime - fetchStartTime).toFixed(2)}ms
                    - Records: ${statsData.length}`);
                
                toast.success(`${t('loadedFromCache')} ${statsData.length} ${t('recordsSuccessfully')}`, {
                    icon: '✅',
                    duration: 2000,
                });
            } else {
                throw new Error(t('invalidDataFormat'));
            }
        } catch (err) {
            console.error('Error fetching picking stats:', err);
            let errorMessage = t('errorLoadingData');
            
            if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
                errorMessage = `${t('cannotConnectToServer')} ${API_URL}.`;
            } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                errorMessage = `${t('serverNotAvailable')} ${API_URL}.`;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
            setAllStats([]);
            toast.error(errorMessage, {
                icon: '❌',
                duration: 4000,
            });
        } finally {
            setLoading(false);
            setTimeout(() => setLoadingProgress(0), 500);
        }
    }, [startDate, endDate, getCacheKey, getCachedData, setCachedData, t]);

    // הסרת הטעינה האוטומטית - הטעינה תתבצע רק בלחיצה על כפתור "חיפוש תאריכים"

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

    // --- Debounce effect לחיפוש ---
    useEffect(() => {
        const handler = debounce(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        
        handler();
        
        return () => {
            handler.cancel();
        };
    }, [searchTerm]);

    // --- 3. סינון מקומי לטבלה ---
    const finalFilteredRows = useMemo(() => {
        return dateFilteredStats.filter(stat => {
            if (selectedPickingType !== 'all' && getPickingType(stat.location, stat.workstation, t) !== selectedPickingType) return false;
            if (selectedWorkstationType !== 'all' && getWorkstationType(stat.workstation, t) !== selectedWorkstationType) return false;
            if (selectedWorkstation !== 'all' && stat.workstation !== selectedWorkstation) return false;
            if (selectedPicker !== 'all' && stat.picker !== selectedPicker) return false;

            if (debouncedSearchTerm) {
                const term = debouncedSearchTerm.toLowerCase();
                const combined = `${stat.picker} ${stat.orderNumber} ${stat.shippingBox} ${stat.skuCode} ${stat.quantity} ${stat.workstation}`.toLowerCase();
                if (!combined.includes(term)) return false;
            }
            return true;
        });
    }, [dateFilteredStats, selectedPickingType, selectedWorkstationType, selectedWorkstation, selectedPicker, debouncedSearchTerm, t]);

    // --- פונקציה לאיפוס כל הפילטרים ---
    const handleResetFilters = useCallback(() => {
        setSelectedPickingType('all');
        setSelectedWorkstationType('all');
        setSelectedWorkstation('all');
        setSelectedPicker('all');
        setSearchTerm('');
        setPage(0);
        setFilterLoading(true);
        setTimeout(() => setFilterLoading(false), 300);
    }, []);

    // --- 4. חישוב גרפים ---
    const chartData = useMemo(() => {
        const pickerPerformance = dateFilteredStats.reduce((acc, curr) => {
            if (curr.picker) {
                if (!acc[curr.picker]) {
                    acc[curr.picker] = { 
                        name: curr.picker, 
                        [t('pickedQuantity')]: 0,
                        orders: new Set(),
                        orderLines: 0,
                        skus: new Set()
                    };
                }
                acc[curr.picker][t('pickedQuantity')] += curr.quantity;
                acc[curr.picker].orders.add(curr.orderNumber);
                acc[curr.picker].orderLines++;
                acc[curr.picker].skus.add(curr.skuCode);
            }
            return acc;
        }, {});
        
        // המרה למערך עם נתונים נוספים
        return Object.values(pickerPerformance).map(picker => ({
            name: picker.name,
            [t('pickedQuantity')]: picker[t('pickedQuantity')],
            ordersCount: picker.orders.size,
            orderLines: picker.orderLines,
            uniqueSkus: picker.skus.size,
            avgItemsPerOrder: picker.orders.size > 0 ? (picker[t('pickedQuantity')] / picker.orders.size).toFixed(2) : 0
        })).sort((a, b) => b[t('pickedQuantity')] - a[t('pickedQuantity')]);
    }, [dateFilteredStats, t]);

    // --- 4.1. חישוב פרטי מלקט ספציפי ---
    const pickerDetails = useMemo(() => {
        if (!selectedPickerDetails) return null;
        
        const pickerRows = dateFilteredStats.filter(stat => stat.picker === selectedPickerDetails);
        if (!pickerRows.length) return null;
        
        const uniqueOrders = new Set(pickerRows.map(r => r.orderNumber));
        const uniqueSkus = new Set(pickerRows.map(r => r.skuCode));
        const totalQuantity = pickerRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
        const pickingTypes = pickerRows.reduce((acc, r) => {
            const type = getPickingType(r.location, r.workstation, t);
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        
        return {
            name: selectedPickerDetails,
            totalQuantity,
            uniqueOrders: uniqueOrders.size,
            orderLines: pickerRows.length,
            uniqueSkus: uniqueSkus.size,
            uniqueSkusList: Array.from(uniqueSkus).sort(), // רשימת המקטים הייחודיים
            avgItemsPerOrder: uniqueOrders.size > 0 ? (totalQuantity / uniqueOrders.size).toFixed(2) : 0,
            avgSkusPerOrder: uniqueOrders.size > 0 ? (uniqueSkus.size / uniqueOrders.size).toFixed(2) : 0,
            pickingTypes
        };
    }, [selectedPickerDetails, dateFilteredStats, t]);

    const workstationDistribution = useMemo(() => {
        if (!dateFilteredStats.length) return [];
        const distribution = dateFilteredStats.reduce((acc, stat) => {
            const type = getWorkstationType(stat.workstation, t);
            if (!acc[type]) acc[type] = { name: type, value: 0 };
            acc[type].value += stat.quantity;
            return acc;
        }, {});
        return Object.values(distribution).filter(item => item.value > 0);
    }, [dateFilteredStats, t]);

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
        const totalQuantity = source.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
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
        const avgItemsPerOrder = uniqueOrders > 0 && totalQuantity > 0 ? totalQuantity / uniqueOrders : 0;
        
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
            if (selectedPickingType !== 'all' && getPickingType(stat.location, stat.workstation, t) !== selectedPickingType) return false;
            if (selectedWorkstationType !== 'all' && getWorkstationType(stat.workstation, t) !== selectedWorkstationType) return false;
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
        const totalQuantity = source.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
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
        const avgItemsPerOrder = uniqueOrders > 0 && totalQuantity > 0 ? totalQuantity / uniqueOrders : 0;
        
        return {
            totalQuantity,
            uniqueOrders,
            uniquePickers: new Set(source.map(s => s.picker).filter(Boolean)).size,
            orderLines: source.length,
            avgSkusPerOrder: Math.round(avgSkusPerOrder * 100) / 100,
            avgItemsPerOrder: Math.round(avgItemsPerOrder * 100) / 100,
        };
    }, [compareMode, compareFilteredStats, selectedPickingType, selectedWorkstationType, selectedWorkstation, selectedPicker, searchTerm, t]);

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
            setModalContent({ type: 'error', message: t('serverAddressNotConfigured') });
            return;
        }
        
        const daysDiff = Math.ceil((compareEndDate - compareStartDate) / (1000 * 60 * 60 * 24));
        
        setModalContent({ type: 'loading', message: `${t('syncingData')} (${daysDiff} ${t('days')}), ${t('pleaseWait')}` });
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
                throw new Error(errorData.message || errorData.error || t('unknownError'));
            }
            
            hasLoadedRef.current = false; // אפס את ה-flag כדי לטעון נתונים חדשים
            await fetchStats();
            setModalContent({ type: 'success', message: t('syncCompleted') });
            toast.success(`${t('syncCompletedSuccessfully')} (${daysDiff} ${t('days')})`, {
                icon: '✅',
                duration: 3000,
            });
            setTimeout(() => setIsModalOpen(false), 2000);

        } catch (err) {
            console.error('Error refreshing compare period SQL:', err);
            let errorMessage = err.message || t('errorSyncing');
            
            if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
                errorMessage = `${t('cannotConnectToServerAt')} ${API_URL}. ${t('pleaseEnsureServerRunning')}`;
            }
            
            setModalContent({ type: 'error', message: errorMessage });
            toast.error(errorMessage, {
                icon: '❌',
                duration: 5000,
            });
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
                wsTypes.add(getWorkstationType(stat.workstation, t));
            }
        });

        return {
            pickers: ['all', ...Array.from(pickers).sort()],
            wsTypes: ['all', ...Array.from(wsTypes).sort()],
            workstations: ['all', ...Array.from(workstations).sort()]
        };
    }, [dateFilteredStats, t]);

    // --- Real-time updates effect ---
    useEffect(() => {
        if (isRealTimeEnabled && hasLoadedRef.current) {
            // עדכון כל 30 שניות
            realTimeIntervalRef.current = setInterval(() => {
                fetchStats();
            }, 30000);
            
            return () => {
                if (realTimeIntervalRef.current) {
                    clearInterval(realTimeIntervalRef.current);
                }
            };
        } else {
            if (realTimeIntervalRef.current) {
                clearInterval(realTimeIntervalRef.current);
                realTimeIntervalRef.current = null;
            }
        }
    }, [isRealTimeEnabled, fetchStats]);

    // --- 7. מיון ודפדוף ---
    const handleSortRequest = useCallback((property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    }, [orderBy, order]);

    // --- קיבוץ רשומות לפי מלקט לטבלת הפירוט ---
    const pickerGroups = useMemo(() => {
        const map = {};
        finalFilteredRows.forEach(row => {
            const picker = row.picker || t('unknown');
            if (!map[picker]) {
                map[picker] = {
                    picker,
                    totalQuantity: 0,
                    rows: [],
                };
            }
            map[picker].rows.push(row);
            map[picker].totalQuantity += row.quantity || 0;
        });
        return Object.values(map);
    }, [finalFilteredRows, t]);

    const paginatedRows = useMemo(() => {
        const sorted = [...pickerGroups].sort((a, b) => b.totalQuantity - a.totalQuantity);
        return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [pickerGroups, page, rowsPerPage]);

    // --- 8. פונקציית ייצוא לאקסל (החדשה) ---
    const handleExportExcel = () => {
        if (!finalFilteredRows.length) {
            toast.error(t('noDataToExport'), { icon: '⚠️' });
            return;
        }
        
        const toastId = toast.loading(t('exportingToExcel'), { icon: '📊' });

        // יצירת גיליון סטטיסטיקה לפי תאריך, עמדה ומלקט
        const pickerStats = {};
        
        finalFilteredRows.forEach(row => {
            const picker = row.picker || t('unknown');
            const dateObj = new Date(row.date);
            const dateStr = dateObj.toLocaleDateString('he-IL');
            const workstation = row.workstation || '';
            const key = `${dateObj.getTime()}_${workstation}_${picker}`; // מפתח ייחודי לפי timestamp, עמדה ומלקט
            const workstationType = getWorkstationType(row.workstation, t);
            const qty = row.quantity || 0;
            const isCooling = workstationType === t('cooling');
            
            if (!pickerStats[key]) {
                pickerStats[key] = {
                    '_dateTimestamp': dateObj.getTime(), // שמירת timestamp למיון
                    'תאריך': dateStr,
                    'שם מלקט': picker,
                    'איזור עבודה': workstation,
                    'קירור': 0, // כמות בקירור
                    [t('regularPickingM2GStation')]: 0,
                    [t('agvBulk')]: 0,
                    [t('manualM2GPicking')]: 0,
                    [t('total')]: 0
                };
            }
            
            // צבירת כמות פריטים בקירור
            if (isCooling) {
                pickerStats[key]['קירור'] += qty;
            } else {
                // רק אם זה לא קירור, נצבור לפי סוג: AGV/BULK, ליקוט ידני M2G, כל השאר ליקוט רגיל/M2G בעמדה
                if (workstationType === 'M2G ידני') {
                    // ליקוט ידני M2G לפי סוג עמדת עבודה
                    pickerStats[key][t('manualM2GPicking')] += qty;
                } else if (
                    workstationType === t('agv') ||
                    (row.location && row.location.toUpperCase().includes('BULK'))
                ) {
                    // עמדות AGV או לוקיישנים שמכילים BULK
                    pickerStats[key][t('agvBulk')] += qty;
                } else {
                    // כל השאר נחשבים ליקוט רגיל / M2G בעמדה (ללא קירור)
                    pickerStats[key][t('regularPickingM2GStation')] += qty;
                }
            }
            
            // סה"כ פריטים (כל הסוגים יחד)
            pickerStats[key][t('total')] += qty;
        });
        
        // המרה למערך ומיון לפי תאריך, עמדה ואז שם מלקט
        const statsData = Object.values(pickerStats).sort((a, b) => {
            // קודם לפי תאריך (שימוש ב-timestamp)
            if (a['_dateTimestamp'] !== b['_dateTimestamp']) {
                return a['_dateTimestamp'] - b['_dateTimestamp'];
            }
            // אם אותו תאריך, לפי איזור עבודה (עמדה)
            const workstationA = a['איזור עבודה'] || '';
            const workstationB = b['איזור עבודה'] || '';
            if (workstationA !== workstationB) {
                return workstationA.localeCompare(workstationB, 'he');
            }
            // אם אותו תאריך ואותה עמדה, לפי שם מלקט
            const pickerA = a['שם מלקט'] || '';
            const pickerB = b['שם מלקט'] || '';
            if (pickerA !== pickerB) {
                return pickerA.localeCompare(pickerB, 'he');
            }
            // אם הכל זהה, לפי סה"כ פריטים
            return b[t('total')] - a[t('total')];
        }).map(item => {
            // הסרת ה-timestamp לפני יצירת האקסל
            const { _dateTimestamp, ...rest } = item;
            // החלפת "עמדות (M2G)" ב-"(M2G)" בעמודת איזור עבודה
            if (rest['איזור עבודה'] === 'עמדות (M2G)') {
                rest['איזור עבודה'] = '(M2G)';
            }
            return rest;
        }).filter(item => {
            // הסרת שורות עם שם מלקט "Unknown"
            const pickerName = item['שם מלקט'] || '';
            return pickerName !== t('unknown') && pickerName !== 'Unknown' && pickerName !== 'unknown';
        });
        
        // יצירת גיליון סטטיסטיקה
        const statsWs = XLSX.utils.json_to_sheet(statsData);
        
        // הגדרת רוחב עמודות לסטטיסטיקה
        statsWs['!cols'] = [
            { wch: 12 }, // תאריך
            { wch: 20 }, // שם מלקט
            { wch: 15 }, // איזור עבודה
            { wch: 12 }, // קירור
            { wch: 22 }, // ליקוט רגיל / M2G בעמדה
            { wch: 18 }, // AGV / BULK
            { wch: 18 }, // ליקוט ידני M2G
            { wch: 15 }  // סה"כ
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, statsWs, t('pickerStatistics'));

        // שמירת הקובץ עם תאריכים של הדוח
        const startDateStr = formatDateForInput(startDate);
        const endDateStr = formatDateForInput(endDate);
        const fileName = `Picking_Report_${startDateStr}_to_${endDateStr}.xlsx`;
        
        try {
            XLSX.writeFile(wb, fileName);
            toast.success(`הקובץ ${fileName} נוצר בהצלחה!`, { 
                id: toastId,
                icon: '✅',
                duration: 3000,
            });
        } catch {
            toast.error('שגיאה ביצירת הקובץ', { 
                id: toastId,
                icon: '❌',
            });
        }
    };


    const formatDateForInput = (d) => d.toISOString().split('T')[0];

    // --- פונקציות ייצוא גרפים כתמונות ---
    const exportChartAsImage = useCallback(async (chartElementOrSelector, filename, chartTitle) => {
        try {
            const chartElement = typeof chartElementOrSelector === 'string' 
                ? document.querySelector(chartElementOrSelector) 
                : chartElementOrSelector;
            if (!chartElement) {
                toast.error(t('chartNotFound'), { icon: '⚠️' });
                return;
            }

            const toastId = toast.loading(`${t('exporting')} ${chartTitle}...`, { icon: '📊' });

            // יצירת עותק של האלמנט עם המרת oklab ל-rgb
            const clone = chartElement.cloneNode(true);
            
            // העתקת computed styles מה-element המקורי
            const computedStyle = window.getComputedStyle(chartElement);
            clone.style.cssText = computedStyle.cssText; // העתקת כל ה-styles
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.visibility = 'visible'; // צריך להיות visible ל-html2canvas
            clone.style.opacity = '1';
            clone.style.zIndex = '-9999'; // מאחורי הכל
            
            // וידוא שיש גודל
            if (!clone.offsetWidth || clone.offsetWidth === 0) {
                clone.style.width = computedStyle.width || chartElement.offsetWidth + 'px';
            }
            if (!clone.offsetHeight || clone.offsetHeight === 0) {
                clone.style.height = computedStyle.height || chartElement.offsetHeight + 'px';
            }
            
            document.body.appendChild(clone);
            
            // המתן קצת שהאלמנט יטען ויוצג
            await new Promise(resolve => setTimeout(resolve, 300));

            // הסרת כל ה-style sheets שמכילים oklab מה-clone
            const removeOklabStyles = (element) => {
                // הסרת style tags מה-clone
                const styleTags = element.querySelectorAll('style');
                styleTags.forEach(style => {
                    if (style.textContent && (style.textContent.includes('oklab') || style.textContent.includes('oklch'))) {
                        // ננסה להמיר במקום למחוק
                        let modifiedText = style.textContent;
                        modifiedText = modifiedText.replace(/oklab\([^)]*\)/gi, 'rgb(99, 102, 241)');
                        modifiedText = modifiedText.replace(/oklch\([^)]*\)/gi, 'rgb(99, 102, 241)');
                        if (modifiedText !== style.textContent) {
                            style.textContent = modifiedText;
                        } else {
                            style.remove();
                        }
                    }
                });
                
                // המרת כל ה-oklab/oklch ל-rgb באמצעות computed styles
                const allElements = [element, ...element.querySelectorAll('*')];
                allElements.forEach(el => {
                    const computed = window.getComputedStyle(el);
                    
                    // המרת כל ה-properties שמכילים oklab/oklch
                    const allProps = ['background', 'backgroundImage', 'backgroundColor', 'color', 'borderColor', 'outlineColor'];
                    allProps.forEach(prop => {
                        const value = computed.getPropertyValue(prop);
                        if (value && (value.includes('oklab') || value.includes('oklch'))) {
                            // נסה להמיר ל-rgb
                            let modifiedValue = value;
                            modifiedValue = modifiedValue.replace(/oklab\([^)]*\)/gi, 'rgb(99, 102, 241)');
                            modifiedValue = modifiedValue.replace(/oklch\([^)]*\)/gi, 'rgb(99, 102, 241)');
                            
                            if (modifiedValue !== value && !modifiedValue.includes('oklab') && !modifiedValue.includes('oklch')) {
                                el.style.setProperty(prop, modifiedValue);
                            } else {
                                // אם לא הצלחנו להמיר, נשתמש ב-computed value
                                const safeValue = computed.getPropertyValue(prop);
                                if (safeValue && !safeValue.includes('oklab') && !safeValue.includes('oklch')) {
                                    el.style.setProperty(prop, safeValue);
                                } else if (prop === 'backgroundImage' || prop === 'background') {
                                    el.style.setProperty(prop, 'none');
                                    const bgColor = computed.backgroundColor;
                                    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                                        el.style.backgroundColor = bgColor;
                                    }
                                }
                            }
                        }
                    });
                    
                    // המרת כל property אחר שמכיל oklab
                    for (let i = 0; i < el.style.length; i++) {
                        const prop = el.style[i];
                        const value = el.style.getPropertyValue(prop);
                        if (value && (value.includes('oklab') || value.includes('oklch'))) {
                            const computedValue = computed.getPropertyValue(prop);
                            if (computedValue && !computedValue.includes('oklab') && !computedValue.includes('oklch')) {
                                el.style.setProperty(prop, computedValue);
                            } else {
                                // נסה להמיר
                                let modifiedValue = value;
                                modifiedValue = modifiedValue.replace(/oklab\([^)]*\)/gi, 'rgb(99, 102, 241)');
                                modifiedValue = modifiedValue.replace(/oklch\([^)]*\)/gi, 'rgb(99, 102, 241)');
                                if (modifiedValue !== value && !modifiedValue.includes('oklab') && !modifiedValue.includes('oklch')) {
                                    el.style.setProperty(prop, modifiedValue);
                                } else {
                                    el.style.removeProperty(prop);
                                }
                            }
                        }
                    }
                });
            };

            removeOklabStyles(clone);
            
            // המתן עוד קצת שההמרה תתבצע
            await new Promise(resolve => setTimeout(resolve, 100));

            let canvas;
            let originalStyles = [];
            try {
                // המרת כל ה-CSS שמכיל oklab ב-document לפני ש-html2canvas רץ
                const styleSheets = Array.from(document.styleSheets);
                
                styleSheets.forEach((sheet) => {
                    try {
                        const rules = sheet.cssRules || sheet.rules;
                        if (rules) {
                            Array.from(rules).forEach((rule) => {
                                if (rule.style) {
                                    // בדיקה של כל ה-properties
                                    const properties = Array.from(rule.style);
                                    let hasOklab = false;
                                    
                                    properties.forEach(prop => {
                                        const value = rule.style.getPropertyValue(prop);
                                        if (value && (value.includes('oklab') || value.includes('oklch'))) {
                                            hasOklab = true;
                                            // שמירת הערך המקורי
                                            if (!originalStyles.find(s => s.rule === rule)) {
                                                originalStyles.push({ rule, originalText: rule.style.cssText });
                                            }
                                            
                                            // המרת oklab/oklch ל-rgb
                                            let modifiedValue = value;
                                            modifiedValue = modifiedValue.replace(/oklab\([^)]*\)/gi, 'rgb(99, 102, 241)');
                                            modifiedValue = modifiedValue.replace(/oklch\([^)]*\)/gi, 'rgb(99, 102, 241)');
                                            
                                            // עדכון ה-property
                                            try {
                                                rule.style.setProperty(prop, modifiedValue);
                                            } catch {
                                                // לא ניתן לערוך property זה
                                            }
                                        }
                                    });
                                    
                                    // אם יש oklab ב-cssText הכללי, ננסה לתקן
                                    if (!hasOklab) {
                                        const styleText = rule.style.cssText;
                                        if (styleText && (styleText.includes('oklab') || styleText.includes('oklch'))) {
                                            // שמירת הערך המקורי
                                            originalStyles.push({ rule, originalText: styleText });
                                            
                                            // המרת oklab ל-rgb - החלפה מדויקת יותר
                                            let modifiedText = styleText;
                                            // החלפת oklab() ב-rgb - regex יותר מדויק
                                            modifiedText = modifiedText.replace(/oklab\([^)]*\)/gi, 'rgb(99, 102, 241)');
                                            // החלפת oklch() ב-rgb
                                            modifiedText = modifiedText.replace(/oklch\([^)]*\)/gi, 'rgb(99, 102, 241)');
                                            
                                            // עדכון ה-rule
                                            try {
                                                rule.style.cssText = modifiedText;
                                            } catch {
                                                // לא ניתן לערוך rule זה
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    } catch {
                        // Cross-origin stylesheet - לא ניתן לערוך
                        // זה בסדר, נמשיך
                    }
                });

                // בדיקה שהאלמנט מוכן
                if (!clone.offsetWidth || !clone.offsetHeight) {
                    throw new Error('Element has no dimensions');
                }

                canvas = await html2canvas(clone, {
                    backgroundColor: '#ffffff',
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: false,
                    foreignObjectRendering: false,
                    width: clone.scrollWidth || clone.offsetWidth,
                    height: clone.scrollHeight || clone.offsetHeight,
                    ignoreElements: (element) => {
                        // התעלם מ-style tags
                        return element.tagName === 'STYLE';
                    },
                    onclone: (clonedDoc) => {
                        // ניקוי נוסף ב-clone
                        const allStyles = clonedDoc.querySelectorAll('style');
                        allStyles.forEach(style => {
                            if (style.textContent && (style.textContent.includes('oklab') || style.textContent.includes('oklch'))) {
                                let modifiedText = style.textContent;
                                modifiedText = modifiedText.replace(/oklab\([^)]+\)/gi, 'rgb(99, 102, 241)');
                                modifiedText = modifiedText.replace(/oklch\([^)]+\)/gi, 'rgb(99, 102, 241)');
                                if (modifiedText !== style.textContent) {
                                    style.textContent = modifiedText;
                                }
                            }
                        });
                        
                        const allElements = clonedDoc.querySelectorAll('*');
                        allElements.forEach(el => {
                            if (el.style) {
                                if (el.style.colorScheme) {
                                    el.style.colorScheme = '';
                                }
                                if (el.style.backgroundImage && (el.style.backgroundImage.includes('oklab') || el.style.backgroundImage.includes('oklch'))) {
                                    el.style.backgroundImage = 'none';
                                }
                                if (el.style.background && (el.style.background.includes('oklab') || el.style.background.includes('oklch'))) {
                                    el.style.background = 'none';
                                }
                            }
                        });
                    }
                });
            } catch (error) {
                // שחזור CSS לפני העלאת השגיאה
                originalStyles.forEach(({ rule, originalText }) => {
                    try {
                        rule.style.cssText = originalText;
                    } catch {
                        // לא ניתן לשחזר
                    }
                });
                throw error;
            } finally {
                // שחזור ה-CSS המקורי תמיד
                originalStyles.forEach(({ rule, originalText }) => {
                    try {
                        rule.style.cssText = originalText;
                    } catch (e) {
                        console.warn('Could not restore CSS rule:', e);
                    }
                });
                
                // הסרת ה-clone מהדום גם אם יש שגיאה
                if (clone.parentNode) {
                    document.body.removeChild(clone);
                }
            }

            // בדיקה שהתמונה נוצרה בהצלחה
            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                throw new Error('Failed to create canvas - canvas is empty');
            }

            const imgData = canvas.toDataURL('image/png');
            
            // בדיקה שהתמונה לא ריקה
            if (!imgData || imgData === 'data:,') {
                throw new Error('Failed to create image - image data is empty');
            }

            const link = document.createElement('a');
            link.download = `${filename}_${formatDateForInput(startDate)}_${formatDateForInput(endDate)}.png`;
            link.href = imgData;
            link.click();

            toast.success(`${chartTitle} ${t('exportedSuccessfully')}`, {
                id: toastId,
                icon: '✅',
                duration: 2000,
            });
        } catch (error) {
            console.error('Error exporting chart:', error);
            toast.error(`${t('errorExporting')} ${chartTitle}: ${error.message}`, {
                icon: '❌',
                duration: 3000,
            });
        }
    }, [startDate, endDate, t]);

    const handleExportPickerChart = useCallback(() => {
        // מציאת הגרף הראשון (ביצועי מלקטים)
        const chartContainer = document.querySelector('[class*="lg:col-span-3"][class*="bg-gradient-to-br"]');
        if (chartContainer) {
            exportChartAsImage(chartContainer, 'picker_performance_chart', t('pickerPerformanceChart'));
        } else {
            toast.error(t('chartNotFound'), { icon: '⚠️' });
        }
    }, [exportChartAsImage, t]);

    const handleExportWorkstationChart = useCallback(() => {
        // מציאת הגרף השני (התפלגות עמדות)
        const chartContainers = document.querySelectorAll('[class*="lg:col-span-2"][class*="bg-gradient-to-br"]');
        const pieChart = Array.from(chartContainers).find(el => el.textContent.includes('חלוקה לפי סוג עמדה'));
        if (pieChart) {
            exportChartAsImage(pieChart, 'workstation_distribution_chart', t('workstationDistributionChart'));
        } else {
            toast.error(t('chartNotFound'), { icon: '⚠️' });
        }
    }, [exportChartAsImage, t]);


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
                            {t('compareMode')}
                            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">ALPHA</span>
                        </label>
                    </div>
                    
                    {/* תאריכים - תקופה נוכחית */}
                    <div>
                        <div className="text-xs font-bold text-indigo-600 mb-2 flex items-center gap-2">
                            <TrendingUp size={14} />
                            {t('currentPeriod')}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-sm font-semibold text-slate-700">{t('fromDate')}</label>
                                <input type="date" value={formatDateForInput(startDate)} onChange={(e) => setStartDate(new Date(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-300 font-medium" />
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-sm font-semibold text-slate-700">{t('toDate')}</label>
                                <input type="date" value={formatDateForInput(endDate)} onChange={(e) => setEndDate(new Date(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-300 font-medium" />
                            </div>
                        </div>
                    </div>
                    
                    {/* תאריכים - תקופת השוואה */}
                    {compareMode && (
                        <div className="p-4 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-300">
                            <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-2">
                                <TrendingDown size={14} />
                                {t('comparisonPeriod')}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">{t('fromDate')}</label>
                                    <input type="date" value={formatDateForInput(compareStartDate)} onChange={(e) => setCompareStartDate(new Date(e.target.value))} className="w-full border-2 border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-400 font-medium" />
                                </div>
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">{t('toDate')}</label>
                                    <input type="date" value={formatDateForInput(compareEndDate)} onChange={(e) => setCompareEndDate(new Date(e.target.value))} className="w-full border-2 border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-400 font-medium" />
                                </div>
                            </div>
                            {!hasCompareData && (
                                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-amber-800 mb-1">{t('noDataForComparison')}</p>
                                            <p className="text-xs text-amber-700 mb-2">{t('toSeeComparison')}</p>
                                            <button 
                                                onClick={() => {
                                                    setModalContent({
                                                        type: 'confirm', 
                                                        message: `${t('areYouSureSync')} (${formatDateForInput(compareStartDate)} - ${formatDateForInput(compareEndDate)})?`
                                                    }); 
                                                    setIsModalOpen(true);
                                                }} 
                                                className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors font-semibold"
                                            >
                                                {t('syncComparisonPeriod')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Real-time toggle */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-blue-50/50 rounded-xl border border-blue-200/50 hover:border-blue-300/50 transition-all duration-200">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isRealTimeEnabled ? 'bg-blue-100' : 'bg-slate-100'} transition-colors duration-200`}>
                                <Radio size={20} className={isRealTimeEnabled ? 'text-blue-600' : 'text-slate-400'} />
                            </div>
                            <div className="flex flex-col">
                                <label htmlFor="realTimeMode" className="cursor-pointer font-semibold text-slate-700 text-sm sm:text-base">
                                    {t('realTimeUpdate')}
                                </label>
                                <span className="text-xs text-slate-500">
                                    {isRealTimeEnabled ? t('active') : t('inactive')}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            id="realTimeMode"
                            role="switch"
                            aria-checked={isRealTimeEnabled}
                            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                isRealTimeEnabled ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-slate-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                                    isRealTimeEnabled ? 'translate-x-8' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    {/* אינדיקטור התקדמות */}
                    {loading && loadingProgress > 0 && (
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${loadingProgress}%` }}
                            ></div>
                        </div>
                    )}

                    {/* כפתורים */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button onClick={() => {
                            hasLoadedRef.current = false; // איפוס flag כדי לאפשר טעינה מחדש (עוקף cache)
                            fetchStats();
                        }} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:from-red-700 hover:to-red-800 disabled:from-slate-300 disabled:to-slate-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base">
                            {loading ? <Spinner /> : <Search size={18} />} {loading ? t('loading') : t('loadData')}
                        </button>
                        
                        {/* כפתור ייצוא לאקסל */}
                        <button 
                            onClick={handleExportExcel} 
                            disabled={loading || finalFilteredRows.length === 0} 
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-300 disabled:to-slate-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base"
                        >
                            <FileSpreadsheet size={18} /> <span className="hidden sm:inline">{t('exportToExcel')}</span><span className="sm:hidden">{t('exportChart')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* פילטרים */}
            <div className="bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-200/60">
                <div className="text-sm font-bold text-slate-700 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Search size={16} className="text-indigo-600" />
                        {t('filterResults')}
                    </div>
                    <button
                        onClick={handleResetFilters}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-200 hover:shadow-md"
                        title={t('resetFilters')}
                    >
                        <X size={14} />
                        <span className="hidden sm:inline">{t('resetFilters')}</span>
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                     <div className="relative group sm:col-span-2 lg:col-span-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-all duration-200" size={18} />
                        <input type="text" placeholder={t('freeSearch')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-slate-300" />
                    </div>
                    <div className="relative">
                    <select 
                        value={selectedPickingType} 
                        onChange={(e) => { 
                            setFilterLoading(true);
                            setSelectedPickingType(e.target.value); 
                            setPage(0);
                            setTimeout(() => setFilterLoading(false), 300);
                        }} 
                        className="w-full border-2 border-slate-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md font-medium"
                    >
                        <option value="all">{t('allPickingTypes')}</option>
                        <option value={t('regularPicking')}>{t('regularPicking')}</option>
                        <option value={t('m2gPickingStation')}>{t('m2gPickingStation')}</option>
                        <option value={t('manualM2gPicking')}>{t('manualM2gPicking')}</option>
                    </select>
                        {filterLoading && selectedPickingType !== 'all' && (
                            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                        )}
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedWorkstationType} 
                            onChange={(e) => { 
                                setFilterLoading(true);
                                setSelectedWorkstationType(e.target.value); 
                                setPage(0);
                                setTimeout(() => setFilterLoading(false), 300);
                            }} 
                            className="w-full border-2 border-slate-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md font-medium"
                        >
                            <option value="all">{t('allWorkstationTypes')}</option>
                            {uniqueOptions.wsTypes.filter(t=>t!=='all').map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        {filterLoading && selectedWorkstationType !== 'all' && (
                            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                        )}
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedWorkstation} 
                            onChange={(e) => { 
                                setFilterLoading(true);
                                setSelectedWorkstation(e.target.value); 
                                setPage(0);
                                setTimeout(() => setFilterLoading(false), 300);
                            }} 
                            className="w-full border-2 border-slate-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md font-medium"
                        >
                            <option value="all">{t('allWorkstations')}</option>
                            {uniqueOptions.workstations.filter(ws=>ws!=='all').map(ws => <option key={ws} value={ws}>{ws}</option>)}
                        </select>
                        {filterLoading && selectedWorkstation !== 'all' && (
                            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                        )}
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedPicker} 
                            onChange={(e) => { 
                                setFilterLoading(true);
                                setSelectedPicker(e.target.value); 
                                setPage(0);
                                setTimeout(() => setFilterLoading(false), 300);
                            }} 
                            className="w-full border-2 border-slate-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md font-medium"
                        >
                            <option value="all">{t('allPickers')}</option>
                            {uniqueOptions.pickers.filter(p=>p!=='all').map(picker => <option key={picker} value={picker}>{picker}</option>)}
                        </select>
                        {filterLoading && selectedPicker !== 'all' && (
                            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                        )}
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 font-medium">{error}</div>}

            {dateFilteredStats.length > 0 ? (
                <div className="space-y-6 sm:space-y-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
                        <KpiCard 
                            title={t('totalItems')} 
                            value={kpiData.totalQuantity} 
                            icon={<Package className="text-white" />} 
                            color="bg-gradient-to-br from-indigo-500 to-indigo-600"
                            comparison={compareMode && comparisonData ? comparisonData.totalQuantity : null}
                        />
                        <KpiCard 
                            title={t('orderLines')} 
                            value={kpiData.orderLines} 
                            icon={<ListOrdered className="text-white" />} 
                            color="bg-gradient-to-br from-blue-500 to-blue-600"
                            comparison={compareMode && comparisonData ? comparisonData.orderLines : null}
                        />
                        <KpiCard 
                            title={t('totalOrders')} 
                            value={kpiData.uniqueOrders} 
                            icon={<ClipboardList className="text-white" />} 
                            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                            comparison={compareMode && comparisonData ? comparisonData.uniqueOrders : null}
                        />
                        <KpiCard 
                            title={t('activePickers')} 
                            value={kpiData.uniquePickers} 
                            icon={<Users className="text-white" />} 
                            color="bg-gradient-to-br from-orange-500 to-orange-600"
                            comparison={compareMode && comparisonData ? comparisonData.uniquePickers : null}
                        />
                        <KpiCard 
                            title={t('avgSkusPerOrder')} 
                            value={kpiData.avgSkusPerOrder} 
                            icon={<Package className="text-white" />} 
                            color="bg-gradient-to-br from-purple-500 to-purple-600"
                            comparison={compareMode && comparisonData ? comparisonData.avgSkusPerOrder : null}
                        />
                        <KpiCard 
                            title={t('avgItemsPerOrder')} 
                            value={kpiData.avgItemsPerOrder} 
                            icon={<ListOrdered className="text-white" />} 
                            color="bg-gradient-to-br from-pink-500 to-pink-600"
                            comparison={compareMode && comparisonData ? comparisonData.avgItemsPerOrder : null}
                        />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                        <div className="lg:col-span-3 bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/60 hover:shadow-xl transition-all duration-300">
                             <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="sm:w-5 sm:h-5 text-indigo-600"/> {t('pickerPerformance')}</h2>
                                <button 
                                    onClick={handleExportPickerChart}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-all duration-200 font-semibold"
                                    title={t('exportChartAsImage')}
                                >
                                    <Download size={14} />
                                    <span className="hidden sm:inline">{t('exportChart')}</span>
                                </button>
                             </div>
                            <div className="w-full" style={{ minHeight: '280px', height: '280px' }}>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart 
                                        data={chartData} 
                                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                                        onClick={(e) => {
                                            // אם יש activeLabel, זה אומר שלחצו על Bar
                                            if (e && e.activeLabel) {
                                                const clickedData = chartData.find(item => item.name === e.activeLabel);
                                                if (clickedData && clickedData.name) {
                                                    setSelectedPickerDetails(clickedData.name);
                                                    setIsModalOpen(true);
                                                }
                                            }
                                            // אם יש activePayload, זה אומר שלחצו על Bar
                                            else if (e && e.activePayload && e.activePayload.length > 0) {
                                                const clickedData = e.activePayload[0].payload;
                                                if (clickedData && clickedData.name) {
                                                    setSelectedPickerDetails(clickedData.name);
                                                    setIsModalOpen(true);
                                                }
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
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
                                        <Bar 
                                            dataKey={t('pickedQuantity')} 
                                            fill="url(#colorGradient)" 
                                            radius={[8, 8, 0, 0]} 
                                            barSize={50}
                                            onClick={(data, index) => {
                                                if (data && chartData[index] && chartData[index].name) {
                                                    setSelectedPickerDetails(chartData[index].name);
                                                    setIsModalOpen(true);
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <defs>
                                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8}/>
                                                </linearGradient>
                                            </defs>
                                            {chartData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`}
                                                    onClick={() => {
                                                        if (entry && entry.name) {
                                                            setSelectedPickerDetails(entry.name);
                                                            setIsModalOpen(true);
                                                        }
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/60 hover:shadow-xl transition-all duration-300">
                             <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2"><Package size={18} className="sm:w-5 sm:h-5 text-indigo-600"/> {t('distributionByWorkstationType')}</h2>
                                <button 
                                    onClick={handleExportWorkstationChart}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-all duration-200 font-semibold"
                                    title={t('exportChartAsImage')}
                                >
                                    <Download size={14} />
                                    <span className="hidden sm:inline">{t('exportChart')}</span>
                                </button>
                             </div>
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
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}
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
                                <h3 className="font-bold text-slate-800 text-sm sm:text-base">{t('detailRecords')}</h3>
                                <span className="text-xs font-semibold text-slate-600 bg-gradient-to-r from-indigo-100 to-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">{finalFilteredRows.length} {t('rows')}</span>
                            </div>
                            {selectedPicker !== 'all' && <span className="text-xs bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-3 py-1.5 rounded-full font-semibold shadow-md">{t('picker')}: {selectedPicker}</span>}
                        </div>
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <table className="min-w-full text-xs sm:text-sm text-left text-slate-600">
                                    <thead className="text-xs uppercase bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-bold tracking-wide">
                                        <tr>
                                            {getPickingHeadCells(t).map(cell => (
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
                                        {paginatedRows.map((group, idx) => (
                                            <React.Fragment key={group.picker}>
                                                {/* שורת סיכום לפי מלקט */}
                                                <tr
                                                    className={`bg-white hover:bg-gradient-to-r hover:from-indigo-50/60 hover:to-blue-50/40 transition-all duration-200 cursor-pointer ${idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'}`}
                                                    onClick={() => setExpandedPicker(expandedPicker === group.picker ? null : group.picker)}
                                                >
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-slate-600 text-xs sm:text-sm font-medium">
                                                        {/* טווח תאריכים של המלקט */}
                                                        {group.rows.length
                                                            ? `${new Date(group.rows[0].date).toLocaleDateString('he-IL')}`
                                                            : '-'}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                                                        <span>{group.picker || '-'}</span>
                                                        <span className="text-[10px] sm:text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                            {group.rows.length} {t('records')}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-500 text-xs sm:text-sm" colSpan={2}>
                                                        <span className="hidden sm:inline">{t('clickToShowAllRecords')}</span>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-500 text-xs sm:text-sm">
                                                        {/* מק"ט לדוגמה */}-
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-extrabold text-indigo-700 text-right text-xs sm:text-sm">
                                                        {new Intl.NumberFormat('he-IL').format(group.totalQuantity)}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-700 text-xs sm:text-sm font-medium text-right">
                                                        {expandedPicker === group.picker ? `${t('close')} ▲` : `${t('open')} ▼`}
                                                    </td>
                                                </tr>

                                                {/* רשומות מפורטות של המלקט - מקובצות לפי מספר הזמנה */}
                                                {expandedPicker === group.picker && (() => {
                                                    const ordersMap = {};
                                                    group.rows.forEach((row) => {
                                                        const orderKey = row.orderNumber || t('noOrderNumber');
                                                        if (!ordersMap[orderKey]) {
                                                            ordersMap[orderKey] = {
                                                                orderNumber: orderKey,
                                                                totalQuantity: 0,
                                                                rows: [],
                                                            };
                                                        }
                                                        ordersMap[orderKey].rows.push(row);
                                                        ordersMap[orderKey].totalQuantity += row.quantity || 0;
                                                    });
                                                    const orders = Object.values(ordersMap);
                                                    
                                                    return orders.map((orderGroup) => {
                                                        const isOrderExpanded =
                                                            expandedOrders[group.picker]?.[orderGroup.orderNumber] || false;
                                                        
                                                        return (
                                                            <React.Fragment key={`${group.picker}-${orderGroup.orderNumber}`}>
                                                                {/* שורת סיכום להזמנה */}
                                                                <tr
                                                                    className="bg-slate-50 hover:bg-slate-100 transition-all duration-150 cursor-pointer"
                                                                    onClick={() =>
                                                                        setExpandedOrders((prev) => {
                                                                            const pickerKey = group.picker || 'לא ידוע';
                                                                            const current = prev[pickerKey] || {};
                                                                            return {
                                                                                ...prev,
                                                                                [pickerKey]: {
                                                                                    ...current,
                                                                                    [orderGroup.orderNumber]:
                                                                                        !current[orderGroup.orderNumber],
                                                                                },
                                                                            };
                                                                        })
                                                                    }
                                                                >
                                                                    <td className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap text-slate-500 text-[11px] sm:text-xs">
                                                                        {/* תאריך של השורה הראשונה בהזמנה */}
                                                                        {orderGroup.rows.length
                                                                            ? new Date(orderGroup.rows[0].date).toLocaleDateString(
                                                                                  'he-IL'
                                                                              )
                                                                            : '-'}
                                                                    </td>
                                                                    <td className="px-3 sm:px-6 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-xs">
                                                                        {/* שם מלקט כבר מופיע בשורה הראשית למעלה */}
                                                                    </td>
                                                                    <td className="px-3 sm:px-6 py-2 sm:py-3 font-mono text-slate-800 text-[11px] sm:text-xs font-semibold">
                                                                        הזמנה: {orderGroup.orderNumber}
                                                                    </td>
                                                                    <td className="px-3 sm:px-6 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-xs">
                                                                        {orderGroup.rows[0]?.shippingBox || '-'}
                                                                    </td>
                                                                    <td className="px-3 sm:px-6 py-2 sm:py-3 text-slate-500 text-[11px] sm:text-xs">
                                                                        {orderGroup.rows.length} {t('rows')}
                                                                    </td>
                                                                    <td className="px-3 sm:px-6 py-2 sm:py-3 text-right text-[11px] sm:text-xs font-bold text-indigo-700">
                                                                        {new Intl.NumberFormat('he-IL').format(orderGroup.totalQuantity)}
                                                                    </td>
                                                                    <td className="px-3 sm:px-6 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-xs text-right">
                                                                        {isOrderExpanded ? `${t('closeOrder')} ▲` : `${t('openOrder')} ▼`}
                                                                    </td>
                                                                </tr>

                                                                {/* שורות הליקוט בתוך אותה הזמנה */}
                                                                {isOrderExpanded &&
                                                                    orderGroup.rows.map((row) => (
                                                                        <tr
                                                                            key={
                                                                                row._id ||
                                                                                `${group.picker}-${orderGroup.orderNumber}-${row.skuCode}-${row.date}`
                                                                            }
                                                                            className="bg-white hover:bg-slate-50 transition-all duration-150"
                                                                        >
                                                                            <td className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap text-slate-500 text-[11px] sm:text-xs">
                                                                                {new Date(row.date).toLocaleDateString('he-IL')}
                                                                            </td>
                                                                            <td className="px-3 sm:px-6 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-xs">
                                                                                {/* ריק כי השם כבר למעלה */}
                                                                            </td>
                                                                            <td className="px-3 sm:px-6 py-2 sm:py-3 font-mono text-slate-700 text-[11px] sm:text-xs">
                                                                                {row.orderNumber}
                                                                            </td>
                                                                            <td className="px-3 sm:px-6 py-2 sm:py-3 font-mono text-slate-700 text-[11px] sm:text-xs">
                                                                                {row.shippingBox}
                                                                            </td>
                                                                            <td className="px-3 sm:px-6 py-2 sm:py-3 font-mono text-slate-700 text-[11px] sm:text-xs">
                                                                                {row.skuCode}
                                                                            </td>
                                                                            <td className="px-3 sm:px-6 py-2 sm:py-3 text-right text-[11px] sm:text-xs font-semibold text-indigo-700">
                                                                                {row.quantity}
                                                                            </td>
                                                                            <td className="px-3 sm:px-6 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-xs">
                                                                                {row.workstation}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                            </React.Fragment>
                                                        );
                                                    });
                                                })()}
                                            </React.Fragment>
                                        ))}
                                        {paginatedRows.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">{t('noRecordsFound')}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-white border-t-2 border-slate-200/60">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm border-2 border-slate-300 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300 font-semibold transition-all duration-200">{t('previous')}</button>
                            <span className="text-xs sm:text-sm font-bold text-slate-700 bg-gradient-to-r from-indigo-100 to-blue-100 px-4 py-2 rounded-xl border border-indigo-200">{t('page')} {page + 1} {t('of')} {Math.ceil(pickerGroups.length / rowsPerPage) || 1}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(pickerGroups.length / rowsPerPage) - 1} className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm border-2 border-slate-300 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300 font-semibold transition-all duration-200">{t('next')}</button>
                        </div>
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <div className="text-slate-400 mb-2"><Search size={48} className="mx-auto opacity-50"/></div>
                        <h3 className="text-lg font-medium text-slate-600">{t('noDataForDateRange')}</h3>
                        <p className="text-slate-500">{t('tryChangeDatesOrLoad')}</p>
                    </div>
                )
            )}

            {/* Modal למקטים ייחודיים של מלקט */}
            {showPickerSkusModal && pickerDetails && (
                <div 
                    className="fixed inset-0 z-[60] flex justify-center items-center p-4 animate-in fade-in duration-200" 
                    style={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                    }}
                    onClick={() => setShowPickerSkusModal(false)}
                >
                    <div 
                        className="bg-gradient-to-br from-white via-slate-50 to-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 transform transition-all duration-300 animate-in zoom-in-95 fade-in max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <div className="flex justify-end p-4 pb-0">
                            <button 
                                onClick={() => setShowPickerSkusModal(false)} 
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1.5 transition-all duration-200"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-6 pb-6 flex-1 overflow-y-auto">
                        <div className="mb-4">
                            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Package className="text-purple-600" size={24} />
                                {t('uniqueSkus')} - {pickerDetails.name}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">{t('total')} {pickerDetails.uniqueSkusList.length} {t('uniqueSkus')}</p>
                        </div>
                        
                        <div className="max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {pickerDetails.uniqueSkusList.map((sku) => (
                                    <div 
                                        key={sku} 
                                        className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200 hover:shadow-md transition-all duration-200"
                                    >
                                        <p className="text-sm font-mono font-bold text-purple-900 text-center">{sku}</p>
                                    </div>
                                ))}
                            </div>
                            {pickerDetails.uniqueSkusList.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <Package size={48} className="mx-auto opacity-50 mb-2" />
                                    <p>{t('noDataAvailable')}</p>
                                </div>
                            )}
                        </div>
                        
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowPickerSkusModal(false)}
                                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => {
                setIsModalOpen(false);
                setSelectedPickerDetails(null);
            }}>
                {selectedPickerDetails && pickerDetails && (
                    <div className="py-4">
                        <div className="mb-4">
                            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Users className="text-indigo-600" size={24} />
                                {t('pickerDetails')}: {pickerDetails.name}
                            </h3>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                                <p className="text-xs font-semibold text-indigo-700 mb-1">{t('totalItems')}</p>
                                <p className="text-2xl font-bold text-indigo-900">{new Intl.NumberFormat('he-IL').format(pickerDetails.totalQuantity)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                                <p className="text-xs font-semibold text-emerald-700 mb-1">{t('totalOrders')}</p>
                                <p className="text-2xl font-bold text-emerald-900">{new Intl.NumberFormat('he-IL').format(pickerDetails.uniqueOrders)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                <p className="text-xs font-semibold text-blue-700 mb-1">{t('orderLines')}</p>
                                <p className="text-2xl font-bold text-blue-900">{new Intl.NumberFormat('he-IL').format(pickerDetails.orderLines)}</p>
                            </div>
                            <div 
                                onClick={() => setShowPickerSkusModal(true)}
                                className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                            >
                                <p className="text-xs font-semibold text-purple-700 mb-1">{t('uniqueSkus')}</p>
                                <p className="text-2xl font-bold text-purple-900">{new Intl.NumberFormat('he-IL').format(pickerDetails.uniqueSkus)}</p>
                                <p className="text-xs text-purple-600 mt-1 opacity-75">לחץ לצפייה ברשימה</p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                                <p className="text-xs font-semibold text-amber-700 mb-1">{t('avgItemsPerOrder')}</p>
                                <p className="text-2xl font-bold text-amber-900">{pickerDetails.avgItemsPerOrder}</p>
                            </div>
                            <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-xl border border-rose-200">
                                <p className="text-xs font-semibold text-rose-700 mb-1">{t('avgSkusPerOrder')}</p>
                                <p className="text-2xl font-bold text-rose-900">{pickerDetails.avgSkusPerOrder}</p>
                            </div>
                        </div>
                        
                        {Object.keys(pickerDetails.pickingTypes).length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-bold text-slate-700 mb-3">{t('distributionByPickingType')}:</h4>
                                <div className="space-y-2">
                                    {Object.entries(pickerDetails.pickingTypes).map(([type, count]) => (
                                        <div key={type} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                            <span className="text-sm font-medium text-slate-700">{type}</span>
                                            <span className="text-sm font-bold text-indigo-600">{count} {t('rows')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => {
                                    setSelectedPicker(pickerDetails.name);
                                    setPage(0);
                                    setIsModalOpen(false);
                                    setSelectedPickerDetails(null);
                                }}
                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                {t('filterByThisPicker')}
                            </button>
                        </div>
                    </div>
                )}
                {!selectedPickerDetails && modalContent.type === 'confirm' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <RefreshCw className="text-white" size={28}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3">{t('refresh')}</h3>
                        <p className="text-slate-600 mb-6 leading-relaxed">{modalContent.message}</p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={()=>setIsModalOpen(false)} 
                                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                {t('cancel')}
                            </button>
                            <button 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    // בדיקה אם זה סנכרון תקופת השוואה או תקופה נוכחית
                                    if (modalContent.message && modalContent.message.includes('תקופת השוואה')) {
                                        handleRefreshComparePeriod();
                                    } else {
                                        // טעינה מחדש של נתונים (עוקף cache)
                                        hasLoadedRef.current = false;
                                        fetchStats();
                                    }
                                }} 
                                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                {t('confirm')}
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
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{t('success')}</h3>
                        <p className="text-slate-600">{modalContent.message}</p>
                    </div>
                )}
                {modalContent.type === 'error' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <AlertTriangle className="text-white" size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{t('errorLoadingData')}</h3>
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
const getMappedWorkArea = (row, t) => {
    const rawArea = row.workArea;
    const location = row.location || '';
    
    // 1. בדיקת M2G לפי אזור עבודה
    if (rawArea === 'PA M-2-G') return t('m2gInbound');

    // 2. בדיקת מיקומים ספציפיים לרשימה ששלחת (ROTO, MF, ומדפים) - מוגדרים כ-M2G
    if (location === 'ROTO') return t('m2gInbound');
    if (location.startsWith('MF-')) return t('m2gInbound'); // תופס MF-1 עד MF-10
    // בדיקה באמצעות Regex לתבנית של מדפים: מספר-מספר-מספר (למשל 10-05-05 או 1-01-01)
    if (/^\d{1,2}-\d{2}-\d{2}$/.test(location)) return t('m2gInbound');

    // 3. בדיקת BULK (MJ)
    if (location.startsWith('MJ')) return t('bulkArea'); 
    
    // 4. בדיקת AGV
    if (rawArea === 'AGVSTAGE' || location.startsWith('AGV')) return t('agvArea');
    
    return rawArea || 'Inbound';
};

// --- כותרות הטבלה ---
const getInboundHeadCells = (t) => [
    { id: 'date', label: t('date') },
    { id: 'receiver', label: t('receiver') },
    { id: 'orderNumber', label: t('po') },
    { id: 'skuCode', label: t('skuCode') },
    { id: 'quantity', label: t('quantity') },
    { id: 'location', label: t('location') },
    { id: 'container', label: t('shippingBox') },
    { id: 'batch', label: t('batch') },
    { id: 'owner', label: '' },
];

const InboundStats = () => {
    const { t } = useTranslation();
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
    const [filterLoading, setFilterLoading] = useState(false); // אינדיקטור טעינה לפילטרים

    // טבלה
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('lastActivityTime');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalContent = { type: '', message: '' }; // לא בשימוש כרגע, אבל נשאר למקרה שיהיה צורך בעתיד

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    // --- 1. שליפת נתונים ---
    const fetchInboundStats = useCallback(async () => {
        if (!startDate || !endDate) {
            toast.error(t('pleaseSelectDateRange'), { icon: '⚠️' });
            return;
        }
        
        if (!API_URL) {
            setError(t('serverAddressNotConfigured'));
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
            // טעינה ישירה מ-SQL ללא שמירה ב-MongoDB
            const response = await fetch(`${API_URL}/api/statistics/inbound/direct?${params.toString()}`);
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: `${t('serverError')}: ${response.status} ${response.statusText}` };
                }
                throw new Error(errorData.message || errorData.error || `${t('serverError')}: ${response.status}`);
            }
            const { data } = await response.json();
            
            if (Array.isArray(data)) {
                setAllRows(data);
                hasLoadedRef.current = true; // סמן שהנתונים נטענו
                toast.success(`${t('loadedFromCache')} ${data.length} ${t('recordsSuccessfully')}`, {
                    icon: '✅',
                    duration: 2000,
                });
            } else {
                setAllRows([]);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            let errorMessage = t('errorLoadingData');
            
            if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
                errorMessage = `${t('cannotConnectToServerAt')} ${API_URL}. ${t('pleaseEnsureServerRunning')}`;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            if (!isLive) setError(errorMessage);
            setAllRows([]);
            toast.error(errorMessage, {
                icon: '❌',
                duration: 4000,
            });
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, isUpdating, isLive, t]);

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
            workAreas.add(getMappedWorkArea(row, t)); // משתמש בלוגיקה החדשה
        });

        return {
            receivers: Array.from(receivers).sort(),
            orders: Array.from(orders).sort(),
            skus: Array.from(skus).sort(),
            workAreas: Array.from(workAreas).sort(),
        };
    }, [allRows, t]);

    // --- סינון נתונים ---
    const filteredRows = useMemo(() => {
        return allRows.filter(row => {
            if (selectedReceiver !== 'all' && row.receiver !== selectedReceiver) return false;
            if (selectedOrder !== 'all' && row.orderNumber !== selectedOrder) return false;
            if (selectedSku !== 'all' && row.skuCode !== selectedSku) return false;
            if (selectedWorkArea !== 'all' && getMappedWorkArea(row, t) !== selectedWorkArea) return false; // משתמש בלוגיקה החדשה
            
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
    }, [allRows, selectedReceiver, selectedOrder, selectedSku, selectedWorkArea, selectedPricingType, searchTerm, t]);

    // --- פונקציה לאיפוס כל הפילטרים ---
    const handleResetFilters = useCallback(() => {
        setSelectedReceiver('all');
        setSelectedOrder('all');
        setSelectedSku('all');
        setSelectedWorkArea('all');
        setSelectedPricingType('all');
        setSearchTerm('');
        setPage(0);
        setFilterLoading(true);
        setTimeout(() => setFilterLoading(false), 300);
    }, []);

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
            const categoryName = getMappedWorkArea(curr, t); // משתמש בלוגיקה החדשה
            if (!acc[categoryName]) acc[categoryName] = { name: categoryName, value: 0 };
            acc[categoryName].value += curr.quantity;
            return acc;
        }, {});
        return Object.values(distribution).filter(item => item.value > 0);
    }, [allRows, t]);

    const chartData = useMemo(() => {
        if (!allRows.length) return [];
        const receiverPerformance = allRows.reduce((acc, curr) => {
            const name = curr.receiver || t('unknown');
            if (!acc[name]) acc[name] = { name: name, [t('receivedQuantity')]: 0 };
            acc[name][t('receivedQuantity')] += curr.quantity;
            return acc;
        }, {});
        return Object.values(receiverPerformance).sort((a, b) => b[t('receivedQuantity')] - a[t('receivedQuantity')]);
    }, [allRows, t]);


    const handleExportExcel = () => {
        if (!filteredRows.length) {
            toast.error(t('noDataToExport'), { icon: '⚠️' });
            return;
        }
        
        const toastId = toast.loading(t('exportingToExcel'), { icon: '📊' });

        const summary = filteredRows.reduce((acc, row) => {
            const name = row.receiver || 'לא ידוע';
            
            const areaType = getMappedWorkArea(row, t);
            const isWeight = WEIGHT_SKUS.has(String(row.skuCode)) || row.pricingType === 'weight';

            if (!acc[name]) {
                acc[name] = {
                    'שם עובד': name,
                    'יחידות Inbound רגיל': 0,
                    'שורות/קופסאות (יחידות)': 0,
                    'כמות יחידות ב-M2G': 0,
                    'מק"טים M2G': 0,
                    'כמות יחידות ב-AGV': 0,
                    'מק"טים AGV': 0,
                    'כמות יחידות ב-BULK': 0,
                    'מק"טים BULK': 0, 
                    'מק"טים שקיל יחידות': 0
                };
            }

            if (isWeight) {
                acc[name]['מק"טים שקיל יחידות'] += row.quantity;
            } else {
                acc[name]['שורות/קופסאות (יחידות)'] += 1;
            }
            
            if (areaType === t('m2gInbound')) {
                acc[name]['כמות יחידות ב-M2G'] += row.quantity;
                acc[name]['מק"טים M2G'] += 1;
            } 
            else if (areaType === t('agvArea')) {
                acc[name]['כמות יחידות ב-AGV'] += row.quantity;
                acc[name]['מק"טים AGV'] += 1; 
            } 
            else if (areaType === t('bulkArea')) { // שים לב: וודא שזה תואם לפונקציית העזר (אם היא מחזירה 'BULK' או 'איזור BULK')
                acc[name]['כמות יחידות ב-BULK'] += row.quantity;
                acc[name]['מק"טים BULK'] += 1; 
            } 
            else if (!isWeight) {
                acc[name]['יחידות Inbound רגיל'] += row.quantity;
            }

            return acc;
        }, {});

        // 2. המרה למערך שטוח
        const exportData = Object.values(summary);

        // --- הוספת שורת סה"כ (החלק החדש) ---
        
        // יצירת אובייקט לסיכום
        const totalRow = {
            'שם עובד': 'סה"כ כללי',
            'יחידות Inbound רגיל': 0,
            'שורות/קופסאות (יחידות)': 0,
            'כמות יחידות ב-M2G': 0,
            'מק"טים M2G': 0,
            'כמות יחידות ב-AGV': 0,
            'מק"טים AGV': 0,
            'כמות יחידות ב-BULK': 0,
            'מק"טים BULK': 0,
            'מק"טים שקיל יחידות': 0
        };

        // סכימת כל העמודות
        exportData.forEach(row => {
            totalRow['יחידות Inbound רגיל'] += row['יחידות Inbound רגיל'] || 0;
            totalRow['שורות/קופסאות (יחידות)'] += row['שורות/קופסאות (יחידות)'] || 0;
            totalRow['כמות יחידות ב-M2G'] += row['כמות יחידות ב-M2G'] || 0;
            totalRow['מק"טים M2G'] += row['מק"טים M2G'] || 0;
            totalRow['כמות יחידות ב-AGV'] += row['כמות יחידות ב-AGV'] || 0;
            totalRow['מק"טים AGV'] += row['מק"טים AGV'] || 0;
            totalRow['כמות יחידות ב-BULK'] += row['כמות יחידות ב-BULK'] || 0;
            totalRow['מק"טים BULK'] += row['מק"טים BULK'] || 0;
            totalRow['מק"טים שקיל יחידות'] += row['מק"טים שקיל יחידות'] || 0;
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
            {wch: 18}, // AGV כמות
            {wch: 18}, // AGV מקט
            {wch: 18}, // BULK כמות
            {wch: 18}, // BULK מקט
            {wch: 18}, // שקיל
            {wch: 18}  // יחידות
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('inboundSummary'));
        // שמירת הקובץ עם תאריכים של הדוח
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        const fileName = `Inbound_Summary_${startDateStr}_to_${endDateStr}.xlsx`;
        
        try {
            XLSX.writeFile(wb, fileName);
            toast.success(`הקובץ ${fileName} נוצר בהצלחה!`, { 
                id: toastId,
                icon: '✅',
                duration: 3000,
            });
        } catch {
            toast.error('שגיאה ביצירת הקובץ', { 
                id: toastId,
                icon: '❌',
            });
        }
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
                        <button onClick={() => {
                            hasLoadedRef.current = false; // איפוס flag כדי לאפשר טעינה מחדש
                            fetchInboundStats();
                        }} disabled={loading || isLive} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:from-red-700 hover:to-red-800 disabled:from-slate-300 disabled:to-slate-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base">
                            {loading ? <Spinner /> : <Search size={18} />} {loading ? t('loading') : t('loadData')}
                        </button>
                        {/* <button onClick={() => setIsLive(!isLive)} className={`flex items-center gap-2 font-semibold py-2.5 px-6 rounded-lg shadow-md transition-all ${isLive ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {isLive ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} {isLive ? 'עצור LIVE' : 'הפעל LIVE'}
                        </button> */}
                        <button onClick={handleExportExcel} disabled={loading || filteredRows.length === 0} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-300 disabled:to-slate-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:scale-100 transition-all duration-200 text-sm sm:text-base">
                            <FileSpreadsheet size={18} /> <span className="hidden sm:inline">{t('exportToExcel')}</span><span className="sm:hidden">{t('exportChart')}</span>
                        </button>
                    </div>
                </div>
                {isUpdating && <div className="text-center mt-2 text-xs text-green-600 flex justify-center items-center gap-1"><RefreshCw size={12} className="animate-spin"/> {t('updatingAutomatically')}</div>}
            </div>

            {/* Filters */}
            <div className="bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-200/60">
                <div className="text-sm font-bold text-slate-700 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Search size={16} className="text-indigo-600" />
                        {t('filterResults')}
                    </div>
                    <button
                        onClick={handleResetFilters}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-200 hover:shadow-md"
                        title={t('resetFilters')}
                    >
                        <X size={14} />
                        <span className="hidden sm:inline">{t('resetFilters')}</span>
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                    <div className="relative">
                        <select 
                            value={selectedPricingType} 
                            onChange={(e) => { 
                                setFilterLoading(true);
                                setSelectedPricingType(e.target.value); 
                                setPage(0);
                                setTimeout(() => setFilterLoading(false), 300);
                            }} 
                            className="w-full border-2 border-slate-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md font-medium"
                        >
                            <option value="all">כל סוגי התמחור</option>
                            <option value="weight">שקיל (Weight)</option>
                            <option value="unit">יחידות (Unit)</option>
                        </select>
                        {filterLoading && selectedPricingType !== 'all' && (
                            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                        )}
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedWorkArea} 
                            onChange={(e) => { 
                                setFilterLoading(true);
                                setSelectedWorkArea(e.target.value); 
                                setPage(0);
                                setTimeout(() => setFilterLoading(false), 300);
                            }} 
                            className="w-full border-2 border-slate-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md font-medium"
                        >
                            <option value="all">{t('allWorkAreas')}</option>
                            {uniqueOptions.workAreas.map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                        {filterLoading && selectedWorkArea !== 'all' && (
                            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                        )}
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedReceiver} 
                            onChange={(e) => { 
                                setFilterLoading(true);
                                setSelectedReceiver(e.target.value); 
                                setPage(0);
                                setTimeout(() => setFilterLoading(false), 300);
                            }} 
                            className="w-full border-2 border-slate-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md font-medium"
                        >
                            <option value="all">{t('allReceivers')}</option>
                            {uniqueOptions.receivers.map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                        {filterLoading && selectedReceiver !== 'all' && (
                            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                        )}
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedOrder} 
                            onChange={(e) => { 
                                setFilterLoading(true);
                                setSelectedOrder(e.target.value); 
                                setPage(0);
                                setTimeout(() => setFilterLoading(false), 300);
                            }} 
                            className="w-full border-2 border-slate-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md font-medium"
                        >
                            <option value="all">{t('allOrders')}</option>
                            {uniqueOptions.orders.map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                        {filterLoading && selectedOrder !== 'all' && (
                            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                        )}
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedSku} 
                            onChange={(e) => { 
                                setFilterLoading(true);
                                setSelectedSku(e.target.value); 
                                setPage(0);
                                setTimeout(() => setFilterLoading(false), 300);
                            }} 
                            className="w-full border-2 border-slate-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none cursor-pointer transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md font-medium"
                        >
                            <option value="all">{t('allSkus')}</option>
                            {uniqueOptions.skus.map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                        {filterLoading && selectedSku !== 'all' && (
                            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                        )}
                    </div>
                    <div className="relative group sm:col-span-2 lg:col-span-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-all duration-300" size={18} />
                        <input 
                            type="text" 
                            placeholder={t('freeSearch')} 
                            value={searchTerm} 
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(0);
                            }} 
                            className="w-full border-2 border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-300 bg-white hover:border-indigo-300 hover:shadow-md" 
                        />
                    </div>
                </div>
            </div>

            {error && !isLive && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 font-medium">{error}</div>}
            
            {allRows.length > 0 && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <KpiCard title={t('totalItemsReceived')} value={kpiData.totalQuantity} icon={<Package className="text-white" />} color="bg-gradient-to-br from-indigo-500 to-indigo-600" />
                        <KpiCard title={t('weightRows')} value={kpiData.weightScans} icon={<Scale className="text-white" />} color="bg-gradient-to-br from-purple-500 to-purple-600" />
                        <KpiCard title={t('unitRows')} value={kpiData.unitScans} icon={<Box className="text-white" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                        <KpiCard title={t('activeReceivers')} value={kpiData.uniqueReceivers} icon={<Users className="text-white" />} color="bg-gradient-to-br from-orange-500 to-orange-600" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                        <div className="lg:col-span-3 bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/60 hover:shadow-xl transition-all duration-300">
                            <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2"><Users size={18} className="sm:w-5 sm:h-5 text-indigo-600"/> {t('receiverPerformance')}</h2>
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
                                    <Bar dataKey={t('receivedQuantity')} fill="url(#colorGradientInbound)" radius={[8, 8, 0, 0]} barSize={35}>
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
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}
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
                                <h3 className="font-bold text-slate-800 text-sm sm:text-base">{t('detailRecords')}</h3>
                                <span className="text-xs font-semibold text-slate-600 bg-gradient-to-r from-indigo-100 to-blue-100 border border-indigo-200 px-3 py-1 rounded-full">{filteredRows.length} {t('rows')}</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <table className="min-w-full text-xs sm:text-sm text-left text-slate-600">
                                    <thead className="text-xs uppercase bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-bold tracking-wide">
                                        <tr>
                                            {getInboundHeadCells(t).map(cell => {
                                                const isMobileHidden = ['container', 'batch', 'owner'].includes(cell.id);
                                                return (
                                                    <th
                                                        key={cell.id}
                                                        className={cn(
                                                            "px-3 sm:px-6 py-3 sm:py-4 cursor-pointer hover:bg-indigo-50 transition-all duration-200 whitespace-nowrap border-b-2 border-slate-200",
                                                            isMobileHidden ? 'hidden md:table-cell' : ''
                                                        )}
                                                        onClick={() => handleSortRequest(cell.id)}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span className={isMobileHidden ? 'hidden md:inline' : 'hidden sm:inline'}>
                                                                {cell.label}
                                                            </span>
                                                            <span className={isMobileHidden ? 'md:hidden' : 'sm:hidden'}>
                                                                {cell.label.length > 8 ? cell.label.substring(0, 8) + '...' : cell.label}
                                                            </span>
                                                            {orderBy === cell.id ? (
                                                                order === 'desc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>
                                                            ) : (
                                                                <ChevronsUpDown size={12} className="opacity-30"/>
                                                            )}
                                                        </div>
                                                    </th>
                                                );
                                            })}
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
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs hidden md:table-cell">{row.container}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-700 text-xs sm:text-sm font-medium hidden md:table-cell">{row.batch || '-'}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 truncate max-w-[100px] sm:max-w-[150px] text-slate-700 text-xs sm:text-sm hidden md:table-cell">{row.owner}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                         <div className="flex flex-col sm:flex-row justify-between items-center gap-2 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-white border-t-2 border-slate-200/60">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page===0} className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm border-2 border-slate-300 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300 font-semibold transition-all duration-200">{t('previous')}</button>
                            <span className="text-xs sm:text-sm font-bold text-slate-700 bg-gradient-to-r from-indigo-100 to-blue-100 px-4 py-2 rounded-xl border border-indigo-200">{t('page')} {page + 1} {t('of')} {Math.ceil(filteredRows.length / rowsPerPage) || 1}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(filteredRows.length / rowsPerPage) - 1} className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm border-2 border-slate-300 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300 font-semibold transition-all duration-200">{t('next')}</button>
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
                        <h3 className="text-xl font-bold text-slate-800 mb-3">{t('refresh')}</h3>
                        <p className="text-slate-600 mb-6 leading-relaxed">{modalContent.message}</p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={()=>setIsModalOpen(false)} 
                                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                {t('cancel')}
                            </button>
                            <button 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    // טעינה מחדש של נתונים (עוקף cache)
                                    hasLoadedRef.current = false;
                                    fetchInboundStats();
                                }} 
                                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                {t('confirm')}
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
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{t('success')}</h3>
                        <p className="text-slate-600">{modalContent.message}</p>
                    </div>
                )}
                {modalContent.type === 'error' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <AlertTriangle className="text-white" size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{t('errorLoadingData')}</h3>
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
    const { t } = useTranslation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [activeTab, setActiveTab] = useState('picking');

    const tabTitles = {
        picking: t('pickingStatsTitle'),
        inbound: t('inboundStatsTitle')
    };
    
    return (
        <>
        <Toaster 
            position="top-center"
            toastOptions={{
                duration: 3000,
                style: {
                    background: '#fff',
                    color: '#1e293b',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '500',
                },
                success: {
                    iconTheme: {
                        primary: '#10b981',
                        secondary: '#fff',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                    },
                },
                loading: {
                    iconTheme: {
                        primary: '#6366f1',
                        secondary: '#fff',
                    },
                },
            }}
        />
        <Sidebar user={user} />
        <Header user={user} />
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 min-h-screen pt-20 md:pt-24 p-4 sm:p-6 lg:p-8 font-sans md:ml-16">
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
                            {t('pickingTab')}
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
                            {t('inboundTab')}
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
const KpiCard = React.memo(({ title, value, icon, color, comparison }) => {
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
});

const Alert = React.memo(({ type, children }) => {
    const typeClasses = {
        info: "bg-blue-50 text-blue-700",
        error: "bg-red-50 text-red-700",
    };
    return <div className={cn("p-4 mb-4 rounded-md text-sm", typeClasses[type])}>{children}</div>;
});

const Spinner = React.memo(({ large = false }) => (
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
));

const Modal = React.memo(({ isOpen, onClose, children }) => {
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
});

export default Statistics;