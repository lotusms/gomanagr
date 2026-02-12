import Link from 'next/link';
import { PrimaryButton } from '@/components/buttons';

/**
 * Sign in / Try for free (when logged out) or Go to Dashboard (when logged in).
 * @param {Object} props
 * @param {boolean} props.currentUser - Whether user is authenticated
 * @param {() => void} props.onSignIn - Called when "Sign in" is clicked
 * @param {() => void} props.onTryFree - Called when "Try for free" is clicked
 */
export default function PublicActionButtons({ currentUser, onSignIn, onTryFree }) {
  return (
    <div className="flex items-center space-x-4">
      {!currentUser && (
        <>
          <button
            onClick={onSignIn}
            className="text-white hover:text-purple-200 transition font-medium"
          >
            Sign in
          </button>
          <PrimaryButton onClick={onTryFree}>
            Try for free
          </PrimaryButton>
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
  );
}
