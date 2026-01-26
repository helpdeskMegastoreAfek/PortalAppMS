'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Lock, Languages } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import { useTranslation } from 'react-i18next';

export default function Header({ user }) {
  const [showModal, setShowModal] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const menuRef = useRef(null);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  return (
    <>
      {/* 
        השינוי העיקרי: הוספנו px-4 (רווח פנימי קטן יותר) למסכים קטנים
        ו-px-6 (הרווח המקורי) למסכים בינוניים ומעלה.
      */}
      <header className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        {/*
          השינוי: הסרנו את ה-ml-11 (רווח שמאלי גדול) במסכים קטנים.
          הוא יחול רק על מסכים בינוניים ומעלה.
        */}
        <div className="text-lg font-light text-gray-900 ml-13 md:ml-11">{t('dashboard')}</div>

        {/*
          השינוי: הקטנו את ה-gap (רווח) בין האלמנטים מ-6 ל-3 במסכים קטנים.
          הרווח המקורי של 6 יחול רק על מסכים בינוניים ומעלה.
        */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* שם המשתמש תמיד יוצג */}
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{user?.username}</span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title={t('changeLanguage')}
            >
              <Languages className="w-5 h-5" />
            </button>
            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  <button
                    onClick={() => changeLanguage('en')}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    English
                  </button>
                  <button
                    onClick={() => changeLanguage('he')}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    עברית
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title={t('changePassword')}
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* כפתור התנתקות - רק אייקון */}
          <button
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const API_URL = import.meta.env.VITE_API_URL || 'http://172.20.0.49:3000';
                
                // Logout from server (terminate session)
                if (token) {
                  try {
                    const response = await fetch(`${API_URL}/api/sessions/logout`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-auth-token': token,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    if (!response.ok) {
                      console.warn('Logout API call failed, but continuing with client-side logout');
                    }
                  } catch (fetchError) {
                    // Continue with logout even if server call fails
                    console.warn('Failed to contact server for logout:', fetchError);
                  }
                }
              } catch (error) {
                console.error('Logout error:', error);
              }
              
              // Always clear local storage FIRST, before redirect
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              
              // Clear any other auth-related items
              localStorage.removeItem('rememberedUsername');
              localStorage.removeItem('rememberMe');
              
              // Force redirect to login page using React Router
              // Using replace to prevent back button from returning to protected pages
              navigate('/login', { replace: true });
              
              // Force a page reload to clear any cached state
              setTimeout(() => {
                window.location.reload();
              }, 100);
            }}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
            {/* הטקסט הוסר מכאן */}
          </button>
        </div>
      </header>

      {showModal && <ChangePasswordModal onClose={() => setShowModal(false)} />}
    </>
  );
}
