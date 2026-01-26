import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, User, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL;

export default function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  // בדיקה אם המשתמש כבר מחובר - אם כן, העברה לדף הראשי
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');
    
    if (user && user.username && token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // טעינת פרטי התחברות שמורים
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    if (savedUsername && savedRememberMe) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async () => {
    // איפוס שגיאות
    setError('');
    
    // ולידציה בסיסית
    if (!username.trim()) {
      setError(t('pleaseEnterUsername'));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (!password.trim()) {
      setError(t('pleaseEnterPassword'));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.message || t('loginError');
        setError(errorMessage);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        toast.error(errorMessage, {
          duration: 4000,
          position: 'top-center',
        });
        setIsLoading(false);
        return;
      }

      const userFromResponse = data.user;
      const fixedId =
        typeof userFromResponse._id === 'object' ? userFromResponse._id.$oid : userFromResponse._id;
      const userWithFixedId = { ...userFromResponse, _id: fixedId };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userWithFixedId));

      // שמירת שם משתמש אם "זכור אותי" מסומן
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedUsername');
        localStorage.removeItem('rememberMe');
      }

      toast.success(t('loginSuccess'), {
        duration: 2000,
        position: 'top-center',
      });

      if (data.needsPasswordChange) {
        navigate(`/change-password/${fixedId}`);
        return;
      }

      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = t('serverError');
      setError(errorMessage);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
      });
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 animate-fade-in">
      <Toaster />
      <div 
        className={`bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 transition-all duration-300 ${
          shake ? 'animate-shake' : ''
        }`}
      >
        <div className="flex flex-col items-center mb-8 animate-slide-down">
          <div className="w-64 h-32 mb-6 overflow-hidden flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-full w-auto object-contain scale-150 cursor-pointer transition-transform hover:scale-[1.6]"
              onClick={handleLogin}
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{t('welcomeBack')}</h2>
          <p className="text-gray-500 text-sm">{t('pleaseSignIn')}</p>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="animate-fade-in-up">
          {/* הודעת שגיאה */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 animate-slide-down">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="mb-5">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              {t('username')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="username"
                type="text"
                placeholder={t('enterUsername')}
                className="w-full border-2 border-gray-300 pl-10 pr-3 py-3 rounded-lg focus:outline-none focus:border-black transition-colors"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('enterPassword')}
                className="w-full border-2 border-gray-300 pl-10 pr-10 py-3 rounded-lg focus:outline-none focus:border-black transition-colors"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* זכור אותי */}
          <div className="mb-4 flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 cursor-pointer">
              {t('rememberMe')}
            </label>
          </div>

          {/* שכחת סיסמה */}
          <div className="mb-6 text-center">
            <button
              type="button"
              onClick={() => {
                toast(t('forgotPasswordMessage'), {
                  icon: 'ℹ️',
                  duration: 5000,
                  position: 'top-center',
                });
              }}
              className="text-sm text-gray-600 hover:text-black transition-colors underline"
              disabled={isLoading}
            >
              {t('forgotPassword')}
            </button>
          </div>
          
          <button
            type="submit"
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('loggingIn')}</span>
              </>
            ) : (
              t('login')
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-10px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(10px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-in;
        }

        .animate-slide-down {
          animation: slide-down 0.6s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out 0.2s both;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
