import '../styles/globals.scss';
import { AuthProvider } from '@/client/lib/AuthContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
