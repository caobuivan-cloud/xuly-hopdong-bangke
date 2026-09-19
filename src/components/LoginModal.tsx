import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import { GOOGLE_CLIENT_ID, decodeJwt, GoogleUser, saveCurrentUser } from '../services/authService';

interface LoginModalProps {
  onSuccess: (user: GoogleUser) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginModal({ onSuccess }: LoginModalProps) {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCredentialResponse = (response: any) => {
    try {
      if (!response.credential) {
        setErrorMsg('Không nhận được token phản hồi từ Google.');
        return;
      }
      const payload = decodeJwt(response.credential);
      if (!payload || !payload.email) {
        setErrorMsg('Thông tin tài khoản Google không hợp lệ.');
        return;
      }

      const user: GoogleUser = {
        email: payload.email,
        name: payload.name || payload.email,
        picture: payload.picture,
        sub: payload.sub
      };

      saveCurrentUser(user);
      onSuccess(user);
    } catch (err: any) {
      console.error('Lỗi xử lý đăng nhập Google:', err);
      setErrorMsg('Đã có lỗi xảy ra trong quá trình xác thực.');
    }
  };

  useEffect(() => {
    let intervalId: any = null;

    const renderGoogleButton = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: false
          });

          // Xóa các element cũ nếu có trước khi render
          googleBtnRef.current.innerHTML = '';

          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320
          });

          if (intervalId) clearInterval(intervalId);
        } catch (e) {
          console.error('Lỗi render nút Google:', e);
        }
      }
    };

    renderGoogleButton();

    // Nếu script SDK chưa tải xong, đợi polling một chút
    if (!window.google?.accounts?.id) {
      intervalId = setInterval(() => {
        if (window.google?.accounts?.id) {
          renderGoogleButton();
        }
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-8 text-center relative overflow-hidden">
        {/* Decorative header background */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-50 rounded-full blur-2xl pointer-events-none" />

        {/* Logo / Badge */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Đăng nhập Kế toán VCC
        </h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Hệ thống yêu cầu xác thực tài khoản Google để ghi nhận danh tính và bảo mật nhật ký đối chiếu Hợp đồng - Bảng kê.
        </p>

        {errorMsg && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Nút bấm Google Sign In được SDK render */}
        <div className="flex justify-center mb-6 min-h-[44px]">
          <div ref={googleBtnRef} className="w-full flex justify-center"></div>
        </div>

        <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
          <p>Hỗ trợ tài khoản Google Workspace công ty</p>
        </div>
      </div>
    </div>
  );
}
