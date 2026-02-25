import '../styles/globals.scss';
import { useRouter } from 'next/router';
import { AuthProvider } from '@/lib/AuthContext';
import { UserAccountProvider } from '@/lib/UserAccountContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Script from 'next/script';

function AppContent({ Component, pageProps }) {
  const router = useRouter();
  const isDashboard = router.pathname.startsWith('/dashboard');

  if (isDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Component {...pageProps} />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <UserAccountProvider>
        <ThemeProvider>
          <ToastProvider>
          {process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY && (
            <Script
              src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places&loading=async`}
              strategy="lazyOnload"
              onError={(e) => {
                console.error('Failed to load Google Maps JavaScript API:', e);
              }}
            />
          )}
          <AppContent Component={Component} pageProps={pageProps} />
        </ToastProvider>
        </ThemeProvider>
      </UserAccountProvider>
    </AuthProvider>
  );
}
