import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL;

export default function ChangePasswordModal({ onClose }) {
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?._id;

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);

  const handleSubmit = async () => {
    if (!userId) {
      setMessage(t('userNotFound'));
      return;
    }

    const res = await fetch(`${API_URL}/api/auth/changePassword`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    });

    const data = await res.json();
    if (data.success) {
      setMessage(t('passwordUpdatedSuccessfully'));
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 1500);
    } else {
      setMessage(data.error || t('failedToUpdatePassword'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-300 w-full max-w-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">{t('changePasswordTitle')}</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">{t('currentPassword')}</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">{t('newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>

          {message && (
            <div
              className={`text-sm ${
                message.includes('successfully') ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {message}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            {t('updatePassword')}
          </button>
        </div>
      </div>
    </div>
  );
}
