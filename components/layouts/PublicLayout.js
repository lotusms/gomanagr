import Head from 'next/head';
import { useAuth } from '@/client/lib/AuthContext';
import { useRouter } from 'next/router';
import Logo from '@/components/Logo';
import { PublicHeader } from './PublicHeader';

export default function PublicLayout({ children, title = 'GoManagr' }) {
  const { currentUser } = useAuth();
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleTryFree = () => {
    router.push('/signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 relative overflow-hidden">
      {/* Animated Background - shared across all public pages */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <Head>
        <title>{title}</title>
        <meta name="description" content="GoManagr - Customer-first service at scale" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <PublicHeader
        currentUser={!!currentUser}
        onSignIn={handleSignIn}
        onTryFree={handleTryFree}
      />

      {/* Main Content */}
      <main className="relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-purple-700 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <Logo href="/" />
            <p className="text-purple-300 text-sm">
              © {new Date().getFullYear()} GoManagr. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
