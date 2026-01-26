import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes - ping server to update lastActivity

export default function PrivateRoute({ children }) {
  const location = useLocation();
  const hasLoggedUnauthorizedAccess = useRef(false);
  const inactivityTimer = useRef(null);
  const pingInterval = useRef(null);
  
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  // רשימת דפים שדורשים הרשאות admin/developer בלבד
  const adminOnlyRoutes = ['/admin', '/developer'];
  
  // בדיקת הרשאות לפי נתיב
  const currentPath = location.pathname;
  
  // בדיקה אם יש ניסיון גישה לא מורשית
  let isUnauthorizedAccess = false;
  
  // בדיקה אם יש משתמש מחובר עם token תקף
  const isNotLoggedIn = !user || !user.username || !token;
  
  if (!isNotLoggedIn) {
    // אם זה דף שדורש admin/developer בלבד
    if (adminOnlyRoutes.includes(currentPath)) {
      if (user?.role !== 'admin' && user?.role !== 'developer') {
        isUnauthorizedAccess = true;
      }
    } else {
      // לכל שאר הדפים - בדיקה אם למשתמש יש הרשאה או שהוא admin/developer
      // admin ו-developer יש להם גישה לכל הדפים
      const isAdminOrDeveloper = user?.role === 'admin' || user?.role === 'developer';
      
      if (!isAdminOrDeveloper) {
        // בדיקה אם המשתמש יש לו את הדף הזה ב-allowedApps
        const allowedApps = user?.allowedApps || [];
        if (!allowedApps.includes(currentPath)) {
          isUnauthorizedAccess = true;
        }
      }
    }
  }

  // שליחת לוג על ניסיון גישה לא מורשית - HOOKS תמיד לפני return
  useEffect(() => {
    if (isUnauthorizedAccess && !hasLoggedUnauthorizedAccess.current && user) {
      hasLoggedUnauthorizedAccess.current = true;
      
      const logData = {
        username: user?.username || 'unknown',
        role: user?.role || 'unknown',
        attemptedPath: currentPath,
        userAgent: navigator.userAgent,
        ip: 'client-side', // IP יתקבל בצד השרת
      };
      
      // לוג לקונסול לצורך דיבוג
      console.warn('🚫 Unauthorized access attempt detected:', logData);
      
      // שליחת לוג לשרת (ללא חסימת המשתמש)
      fetch(`${API_URL}/api/logs/unauthorized-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log('✅ Unauthorized access logged successfully:', data);
        })
        .catch((error) => {
          // לא מציג שגיאה למשתמש, רק לוג בקונסול
          console.error('❌ Failed to log unauthorized access:', error);
        });
    }
    
    // איפוס הדגל כשמשנים דף
    if (!isUnauthorizedAccess) {
      hasLoggedUnauthorizedAccess.current = false;
    }
  }, [isUnauthorizedAccess, currentPath, user]);

  // Auto-logout after inactivity and ping server for session activity
  useEffect(() => {
    if (!token || isUnauthorizedAccess || isNotLoggedIn) {
      return;
    }

    // Function to ping server and update lastActivity
    const pingServer = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sessions/ping`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        });

        // If session is invalid (401), logout user
        if (response.status === 401) {
          console.warn('Session expired or invalid. Logging out...');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          // Clear intervals before redirecting
          if (pingInterval.current) {
            clearInterval(pingInterval.current);
          }
          if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
          }
          window.location.href = '/login';
          return;
        }

        // If response is not ok (but not 401), log error
        if (!response.ok) {
          console.error('Failed to ping server:', response.status, response.statusText);
        }
      } catch (error) {
        // Only log network errors, not 401 errors (handled above)
        if (error.name !== 'TypeError' || !error.message.includes('401')) {
          console.error('Failed to ping server:', error);
        }
      }
    };

    // Ping server every 5 minutes to update lastActivity
    pingInterval.current = setInterval(pingServer, PING_INTERVAL);
    
    // Ping immediately
    pingServer();

    // Reset inactivity timer on user activity
    const resetInactivityTimer = () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }

      inactivityTimer.current = setTimeout(() => {
        // Auto logout after inactivity
        alert('You have been logged out due to inactivity. Please login again.');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, INACTIVITY_TIMEOUT);
    };

    // Listen for user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Initialize timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [token, isUnauthorizedAccess, isNotLoggedIn]);

  // בדיקה אם יש משתמש מחובר עם token תקף
  if (isNotLoggedIn) {
    // ניקוי localStorage במקרה של נתונים לא תקינים
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  // אם אין הרשאה - הפניה לדף הבית
  if (isUnauthorizedAccess) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}
