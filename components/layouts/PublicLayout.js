import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/client/lib/AuthContext';
import { useRouter } from 'next/router';

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
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900">
      <Head>
        <title>{title}</title>
        <meta name="description" content="GoManagr - Customer-first service at scale" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header/Navigation */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-purple-900 font-bold text-xl">G</span>
              </div>
              <span className="text-white text-xl font-semibold">GoManagr</span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-white hover:text-purple-200 transition cursor-pointer">
                Product
              </a>
              <a href="#solutions" className="text-white hover:text-purple-200 transition cursor-pointer">
                Solutions
              </a>
              <a href="#resources" className="text-white hover:text-purple-200 transition cursor-pointer">
                Resources
              </a>
              <a href="#pricing" className="text-white hover:text-purple-200 transition cursor-pointer">
                Pricing
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              {!currentUser && (
                <>
                  <button
                    onClick={handleSignIn}
                    className="text-white hover:text-purple-200 transition font-medium"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={handleTryFree}
                    className="px-4 py-2 bg-white text-purple-900 rounded-lg font-medium hover:bg-purple-50 transition"
                  >
                    Try for free
                  </button>
                </>
              )}
              {currentUser && (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-white text-purple-900 rounded-lg font-medium hover:bg-purple-50 transition"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-700 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-purple-900 font-bold">G</span>
              </div>
              <span className="text-white font-semibold">GoManagr</span>
            </Link>
            <p className="text-purple-300 text-sm">
              © {new Date().getFullYear()} GoManagr. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
