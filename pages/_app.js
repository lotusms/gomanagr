import '../styles/globals.scss';
import { AuthProvider } from '@/client/lib/AuthContext';
import { ThemeProvider } from '@/client/lib/ThemeContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </AuthProvider>
  );
}
