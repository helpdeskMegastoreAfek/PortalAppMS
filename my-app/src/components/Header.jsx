'use client';

import { useState, useEffect, useRef } from 'react';
import { LogOut, User, Lock, Languages } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import { useTranslation } from 'react-i18next';

export default function Header({ user }) {
  const [showModal, setShowModal] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const menuRef = useRef(null);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    // document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
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
      <header className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white sticky  top-0 right-0 left-0">
        <div className="text-lg font-light text-gray-900 ml-11">{t('dashboard')}</div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>
              {user?.username} ({user?.role})
            </span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Change Language"
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
          >
            <Lock className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('logout')}
          </button>
        </div>
      </header>

      {showModal && <ChangePasswordModal onClose={() => setShowModal(false)} />}
    </>
  );
}
