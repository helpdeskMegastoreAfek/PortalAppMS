import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');
  
  // בדיקה אם יש משתמש מחובר עם token תקף
  if (!user || !user.username || !token) {
    // ניקוי localStorage במקרה של נתונים לא תקינים
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
