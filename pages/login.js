import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import PublicLayout from '@/components/layouts/PublicLayout';
import AuthForm from '@/components/AuthForm';
import Logo from '@/components/Logo';

const THEME_COOKIE = 'gomanagr_palette';
const DEFAULT_PALETTE = 'palette1';

export default function LoginPage() {
  const { currentUser, loading } = useAuth();
  const redirecting = useRef(false);

  useEffect(() => {
    if (!currentUser || redirecting.current) return;
    redirecting.current = true;
    getUserAccount(currentUser.uid)
      .then((account) => {
        const paletteId = account?.selectedPalette && typeof account.selectedPalette === 'string'
          ? account.selectedPalette
          : DEFAULT_PALETTE;
        document.cookie = `${THEME_COOKIE}=${encodeURIComponent(paletteId)};path=/;max-age=31536000;SameSite=Lax`;
        window.location.href = '/dashboard';
      })
      .catch(() => {
        document.cookie = `${THEME_COOKIE}=${encodeURIComponent(DEFAULT_PALETTE)};path=/;max-age=31536000;SameSite=Lax`;
        window.location.href = '/dashboard';
      });
  }, [currentUser]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-white">Loading...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (currentUser) {
    return null;
  }

  return (
    <PublicLayout title="Sign In - GoManagr">
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
        <div className="relative z-10 w-full max-w-md">
          {/* Logo/Brand Section */}
          <Logo variant="stacked" />

          {/* Auth Card */}
          <div className="relative">
            {/* Glassmorphism Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative overflow-hidden group hover:border-white/30 transition-all duration-300">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="mb-8 text-center">                 
                  <h2 className="text-3xl font-bold text-white mb-2 transform transition-all duration-300">
                    Welcome Back
                  </h2>
                  <p className="text-primary-200/70 text-sm">
                    Sign in to continue to your dashboard
                  </p>
                </div>

                {/* Auth Form */}
                <AuthForm mode="login" darkMode={true} />
              </div>

              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-br-full"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-white/10 to-transparent rounded-tl-full"></div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <p className="text-primary-200/60 text-xs">
              By continuing, you agree to our{' '}
              <a href="#" className="text-primary-200 hover:text-white underline transition">Terms</a>
              {' '}and{' '}
              <a href="#" className="text-primary-200 hover:text-white underline transition">Privacy Policy</a>
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.6s ease-out forwards;
          }
        `}</style>
      </div>
    </PublicLayout>
  );
}
