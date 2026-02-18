import '../styles/globals.scss';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import Script from 'next/script';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
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
          <Component {...pageProps} />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
