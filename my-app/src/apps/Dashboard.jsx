'use client';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { 
  AlertTriangle, Package, RefreshCw, Search, X, User, 
  Activity, LayoutDashboard, AlertOctagon, ChevronDown, 
  ChevronUp, Snowflake, Briefcase, Filter 
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user')) || { username: 'admin' };
  
  // --- States ---
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [expandedDriverId, setExpandedDriverId] = useState(null); // שינוי: שימוש ב-ID ייחודי
  
  // Data Holder
  const [equipmentLogs, setEquipmentLogs] = useState([]); 
  const [activeBoxesList, setActiveBoxesList] = useState([]); 
  const [damagedList, setDamagedList] = useState([]); 
  
  // Date Range (ברירת מחדל: היום)
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  // Search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ from: dateFrom, to: dateTo });

      const [statsRes, boxesRes, equipRes] = await Promise.all([
          fetch(`${API_URL}/api/dashboard/stats?${queryParams}`),
          fetch(`${API_URL}/api/dashboard/boxes`),
          fetch(`${API_URL}/api/dashboard/equipment?${queryParams}`) 
      ]);

      if (statsRes.ok && boxesRes.ok && equipRes.ok) {
          const statsData = await statsRes.json();
          const boxesData = await boxesRes.json();
          const equipData = await equipRes.json();
          
          setDamagedList(statsData.damagedInventory || []);
          setEquipmentLogs(equipData);
          
          const activeOnly = Array.isArray(boxesData) ? boxesData.filter(b => {
              const s = (b.status || '').toLowerCase();
              return !s.includes('damaged') && 
                     !s.includes('broken') && 
                     !s.includes('returned') &&
                     !s.includes('warehouse') &&
                     !s.includes('completed');
          }) : [];
          setActiveBoxesList(activeOnly);

      } else {
          toast.error(t('errorLoadingData'));
      }

    } catch (error) {
      console.error(error);
      toast.error(t('errorConnectingServer'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  // --- Helper: Aggressive Driver Detective ---
  const resolveDriver = (box) => {
    if (box.currentLocation?.actualDriverName) return box.currentLocation.actualDriverName;

    if (box.history && box.history.length > 0) {
        const sorted = [...box.history].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        const lastHumanEvent = sorted.find(h => 
            h.driverName && 
            h.driverName !== 'System' && 
            h.driverName !== 'Admin' &&
            h.driverName !== 'Unknown'
        );
        if (lastHumanEvent) return lastHumanEvent.driverName;
    }
    return t('unknownDriver');
  };

  // --- Logic: איחוד נתונים לפי נהג + תאריך ---
  const driverStats = useMemo(() => {
      const map = {};
      
      const getEntry = (name, dateRaw) => {
          const cleanName = name ? name.trim() : t('unknownDriver');
          
          // המרת תאריך לפורמט אחיד (DD/MM/YYYY)
          const d = new Date(dateRaw || new Date());
          const dateKey = d.toLocaleDateString('he-IL'); 
          
          // יצירת מפתח ייחודי שכולל גם שם וגם תאריך
          const uniqueKey = `${cleanName}_${dateKey}`; 

          if (!map[uniqueKey]) {
              map[uniqueKey] = { 
                  id: uniqueKey, // מזהה ייחודי לפתיחת השורה
                  name: cleanName, 
                  date: dateKey, 
                  rawDate: d,    
                  takenCoolers: 0, returnedCoolers: 0, 
                  takenIce: 0, returnedIce: 0,
                  activeBoxes: [], damagedBoxes: [] 
              };
          }
          return map[uniqueKey];
      };

      // 1. Equipment Logs
      equipmentLogs.forEach(log => {
          const entry = getEntry(log.driverName, log.timestamp);
          const c = parseInt(log.coolers || 0);
          const i = parseInt(log.ice || 0);
          
          if (log.type === 'DISPATCH') { 
              entry.takenCoolers += c; 
              entry.takenIce += i; 
          }
          else if (log.type === 'RETURN') { 
              entry.returnedCoolers += c; 
              entry.returnedIce += i; 
          }
      });

      // 2. Active Boxes
      activeBoxesList.forEach(box => {
          const driverName = resolveDriver(box);
          // תאריך משוער: תאריך יציאה או תאריך עדכון
          const boxDate = box.currentLocation?.dispatchedAt || box.updatedAt;
          
          const entry = getEntry(driverName, boxDate);
          
          const isAlreadyDamaged = damagedList.some(d => d.barcode === box.barcode);
          if (!isAlreadyDamaged) {
              entry.activeBoxes.push(box);
          }
      });

      // 3. Damaged Boxes (משויך ליום שבו זה קרה)
      damagedList.forEach(box => {
          const driverName = resolveDriver(box);
          const entry = getEntry(driverName, box.updatedAt);
          
          if (!entry.damagedBoxes.find(d => d.barcode === box.barcode)) {
              entry.damagedBoxes.push(box);
          }
      });

      return Object.values(map)
        .map(d => ({
            ...d,
            debtCoolers: d.takenCoolers - d.returnedCoolers,
            debtIce: d.takenIce - d.returnedIce
        }))
        // מציג רק שורות עם פעילות
        .filter(d => d.activeBoxes.length > 0 || d.damagedBoxes.length > 0 || d.takenCoolers > 0 || d.takenIce > 0 || d.returnedCoolers > 0)
        // מיון: לפי תאריך (חדש לישן) ואז לפי שם
        .sort((a,b) => b.rawDate - a.rawDate || a.name.localeCompare(b.name));
  }, [equipmentLogs, activeBoxesList, damagedList]);

  // --- Logic: סיכום עבור טאב הציוד ---
  const equipmentStats = useMemo(() => {
    let takenCoolers = 0, returnedCoolers = 0;
    let takenIce = 0, returnedIce = 0;

    equipmentLogs.forEach(log => {
        const c = parseInt(log.coolers || 0);
        const i = parseInt(log.ice || 0);
        if (log.type === 'DISPATCH') {
            takenCoolers += c;
            takenIce += i;
        } else {
            returnedCoolers += c;
            returnedIce += i;
        }
    });

    return { takenCoolers, returnedCoolers, takenIce, returnedIce };
  }, [equipmentLogs]);

  // Search Logic
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
        const res = await fetch(`${API_URL}/api/dashboard/search/${searchQuery}`);
        if(res.ok) setSearchResult(await res.json());
        else toast.error(t('noResults'));
    } catch(e) {}
  };

  return (
    <>
      <Header user={user} />
      <Sidebar user={user} />

      <div className="min-h-screen bg-[#f8f9fc] p-4 lg:p-8 font-sans text-slate-800" dir="ltr">
        <main className="max-w-7xl mx-auto space-y-6 pb-20">
          
          {/* Top Bar */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-6">
             <div>
                <h1 className="text-2xl font-extrabold text-slate-900">{t('dashboardTitle')}</h1>
                <p className="text-slate-500 text-sm">{t('driversAndInventory') || 'נהגים ומלאי (חי בזמן אמת)'}</p>
             </div>

             <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                    <Filter size={16} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase">טווח תאריכים:</span>
                </div>
                <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="bg-white border text-sm font-bold rounded-lg px-2 py-1 outline-none"/>
                    <span className="text-slate-300 font-bold">→</span>
                    <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="bg-white border text-sm font-bold rounded-lg px-2 py-1 outline-none"/>
                </div>
             </div>
             
             <div className="flex flex-wrap gap-3">
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                     <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <LayoutDashboard size={16}/> {t('driver')}
                     </button>
                     
                     <button onClick={() => setActiveTab('equipment')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'equipment' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Snowflake size={16}/> {t('equipment')}
                     </button>

                     <button onClick={() => setActiveTab('damaged')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'damaged' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <AlertOctagon size={16}/> {t('damagedBoxes')} ({damagedList.length})
                     </button>
                 </div>
                 <button onClick={() => setIsSearchOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100">
                    <Search size={18} /> Track
                 </button>
                 <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><RefreshCw size={20} /></button>
             </div>
          </div>

          {/* TAB 1: DRIVER ROWS (Grouped by Date) */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                {driverStats.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                        <p className="text-slate-400 font-bold">לא נמצאו נתונים.</p>
                        <p className="text-xs text-slate-300">ודא שהתאריכים נכונים ושבוצעו משלוחים.</p>
                    </div>
                )}
                
                {driverStats.map((driver) => {
                    // שימוש ב-ID כדי למנוע פתיחה של כל התאריכים יחד
                    const isOpen = expandedDriverId === driver.id;
                    
                    return (
                        <div key={driver.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${isOpen ? 'border-blue-300 ring-1 ring-blue-100 shadow-md' : 'border-slate-200'}`}>
                            
                            {/* Header Summary */}
                            <div onClick={() => setExpandedDriverId(isOpen ? null : driver.id)} className="p-4 flex flex-col md:flex-row items-center justify-between cursor-pointer gap-4 hover:bg-slate-50">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${driver.name === t('unknownDriver') ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                                        {driver.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-slate-800">{driver.name}</div>
                                        {/* תאריך הפעילות */}
                                        <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Activity size={12}/> {driver.date}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                    
                                    {/* Coolers */}
                                    <div className={`flex flex-col items-center p-2 rounded-xl w-24 ${driver.debtCoolers !== 0 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                                        <div className="text-[10px] font-bold uppercase mb-1 flex gap-1 text-slate-500"><Briefcase size={10}/> Coolers</div>
                                        <div className={`font-extrabold text-xl ${driver.debtCoolers !== 0 ? 'text-red-600' : 'text-green-700'}`}>
                                            {driver.debtCoolers}
                                        </div>
                                    </div>

                                    {/* Ice */}
                                    <div className={`flex flex-col items-center p-2 rounded-xl w-24 ${driver.debtIce !== 0 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                                        <div className="text-[10px] font-bold uppercase mb-1 flex gap-1 text-slate-500"><Snowflake size={10}/> Ice</div>
                                        <div className={`font-extrabold text-xl ${driver.debtIce !== 0 ? 'text-red-600' : 'text-green-700'}`}>
                                            {driver.debtIce}
                                        </div>
                                    </div>

                                    {/* Active Boxes */}
                                    <div className="flex flex-col items-center p-2 rounded-xl w-28 bg-blue-50 border border-blue-100">
                                        <div className="text-[10px] font-bold uppercase mb-1 text-blue-500">Active Boxes</div>
                                        <div className="font-extrabold text-xl text-blue-700">{driver.activeBoxes.length}</div>
                                    </div>

                                    {/* Broken Boxes */}
                                    <div className={`flex flex-col items-center p-2 rounded-xl w-24 border ${driver.damagedBoxes.length > 0 ? 'bg-red-100 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className={`text-[10px] font-bold uppercase mb-1 ${driver.damagedBoxes.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>Broken</div>
                                        <div className={`font-extrabold text-xl ${driver.damagedBoxes.length > 0 ? 'text-red-700' : 'text-slate-300'}`}>{driver.damagedBoxes.length}</div>
                                    </div>

                                    <div className="pl-2 text-slate-300">{isOpen ? <ChevronUp /> : <ChevronDown />}</div>
                                </div>
                            </div>

                            {/* Full Details */}
                            {isOpen && (
                                <div className="bg-slate-50 p-6 border-t border-slate-200">
                                    
                                    {/* Equipment Details */}
                                    <div className="mb-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b pb-2">פירוט ציוד ליום זה ({driver.date})</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <span className="font-bold text-slate-700 flex items-center gap-2"><Briefcase size={16} className="text-slate-400"/> צידניות</span>
                                                <div className="flex gap-4 text-sm">
                                                    <div><span className="text-[10px] text-slate-400 uppercase">לקח</span> <span className="font-bold text-lg">{driver.takenCoolers}</span></div>
                                                    <div className="w-px bg-slate-200"></div>
                                                    <div><span className="text-[10px] text-slate-400 uppercase">החזיר</span> <span className="font-bold text-lg text-green-600">{driver.returnedCoolers}</span></div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <span className="font-bold text-slate-700 flex items-center gap-2"><Snowflake size={16} className="text-slate-400"/> קרח</span>
                                                <div className="flex gap-4 text-sm">
                                                    <div><span className="text-[10px] text-slate-400 uppercase">לקח</span> <span className="font-bold text-lg">{driver.takenIce}</span></div>
                                                    <div className="w-px bg-slate-200"></div>
                                                    <div><span className="text-[10px] text-slate-400 uppercase">החזיר</span> <span className="font-bold text-lg text-green-600">{driver.returnedIce}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* ACTIVE BOXES LIST */}
                                        <div>
                                            <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-2"><Package size={14}/> קופסאות פעילות (נמצאות אצל הנהג)</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {driver.activeBoxes.map((b, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm font-mono font-bold text-slate-700 shadow-sm cursor-default">
                                                        {b.barcode}
                                                    </span>
                                                ))}
                                                {driver.activeBoxes.length === 0 && <span className="text-slate-400 text-sm italic">אין קופסאות פעילות.</span>}
                                            </div>
                                        </div>

                                        {/* BROKEN BOXES LIST */}
                                        {driver.damagedBoxes.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-bold text-red-600 uppercase mb-3 flex items-center gap-2"><AlertTriangle size={14}/> פריטים שבורים / פגומים</h4>
                                                <div className="flex flex-col gap-2">
                                                    {driver.damagedBoxes.map((b, i) => (
                                                        <div key={i} className="flex justify-between items-center px-4 py-2 bg-white border-l-4 border-red-500 rounded shadow-sm">
                                                            <span className="font-mono font-bold text-slate-800">{b.barcode}</span>
                                                            <div className="text-right">
                                                                <span className="block text-xs font-bold text-red-600">{b.status}</span>
                                                                <span className="block text-[10px] text-slate-400">{new Date(b.updatedAt).toLocaleTimeString()}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          )}
        
          {/* TAB 2: EQUIPMENT LOGS */}
          {activeTab === 'equipment' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                
                {/* כרטיסי סיכום */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">צידניות שיצאו</div>
                        <div className="text-2xl font-extrabold text-indigo-600">{equipmentStats.takenCoolers}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">צידניות שחזרו</div>
                        <div className="text-2xl font-extrabold text-green-600">{equipmentStats.returnedCoolers}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-cyan-100 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">שקיות קרח שיצאו</div>
                        <div className="text-2xl font-extrabold text-cyan-600">{equipmentStats.takenIce}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">שקיות קרח שחזרו</div>
                        <div className="text-2xl font-extrabold text-green-600">{equipmentStats.returnedIce}</div>
                    </div>
                </div>

                {/* טבלת לוגים */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Briefcase size={18} className="text-indigo-500"/> יומן תנועות ציוד
                        </h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                            {equipmentLogs.length} שורות
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b text-slate-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">סוג פעולה</th>
                                    <th className="p-4">שעה</th>
                                    <th className="p-4">נהג</th>
                                    <th className="p-4 text-center">צידניות</th>
                                    <th className="p-4 text-center">קרח</th>
                                    <th className="p-4 text-right">רכב</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {equipmentLogs.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                                            לא נמצאו תנועות ציוד בטווח התאריכים הנבחר.
                                        </td>
                                    </tr>
                                )}
                                {equipmentLogs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            {log.type === 'DISPATCH' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> יציאה
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 font-bold text-xs">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> החזרה
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 font-mono text-slate-500">
                                            {new Date(log.timestamp).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}
                                            <span className="text-[10px] text-slate-300 block">
                                                {new Date(log.timestamp).toLocaleDateString('he-IL')}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">{log.driverName}</td>
                                        <td className="p-4 text-center font-bold text-lg text-slate-600">{log.coolers}</td>
                                        <td className="p-4 text-center font-bold text-lg text-cyan-600">{log.ice}</td>
                                        <td className="p-4 text-right text-slate-500">{log.vehicleNumber || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}

          {/* TAB 3: DAMAGED LIST (Global) */}
          {activeTab === 'damaged' && (
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden animate-in fade-in">
                <div className="p-5 border-b border-slate-100 bg-red-50/30">
                    <h3 className="font-bold text-red-700 flex items-center gap-2"><AlertOctagon size={18}/> רשימת פגומים מלאה</h3>
                    <p className="text-xs text-red-400 mt-1">רשימה זו מציגה את כל המלאי הפגום הקיים במערכת (ללא סינון תאריכים)</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Barcode</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Driver</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Date</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {damagedList.map((box, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-4 font-mono font-bold text-slate-700">{box.barcode}</td>
                                    <td className="p-4 font-bold text-slate-600 flex items-center gap-2"><User size={14}/> {resolveDriver(box)}</td>
                                    <td className="p-4 text-xs text-slate-500">{new Date(box.updatedAt).toLocaleDateString()}</td>
                                    <td className="p-4"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{box.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          )}

          {/* Search Modal */}
          {isSearchOpen && (
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl p-6 relative shadow-2xl">
                    <button onClick={() => setIsSearchOpen(false)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100"><X size={20}/></button>
                    <h3 className="font-bold text-lg mb-4">Track Box</h3>
                    <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                        <input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="S-002-985..." className="flex-1 border-2 border-slate-200 p-2 rounded-xl outline-none"/>
                        <button className="bg-blue-600 text-white px-4 rounded-xl font-bold">Search</button>
                    </form>
                    {searchResult && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h3 className="font-mono font-bold text-xl text-blue-900 mb-2">{searchResult.barcode}</h3>
                            <div className="text-sm font-bold text-slate-600 mb-4">{searchResult.status}</div>
                            <div className="space-y-3 pl-4 border-l-2 border-slate-300">
                                {searchResult.history?.map((h, i) => (
                                    <div key={i}>
                                        <div className="font-bold text-xs">{h.eventType}</div>
                                        <div className="text-xs text-slate-500">{h.driverName} - {new Date(h.timestamp).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
             </div>
          )}
        </main>
      </div>
    </>
  );
}