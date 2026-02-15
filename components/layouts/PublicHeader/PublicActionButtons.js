import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

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
          <SecondaryButton onClick={onSignIn} variant="light">
            Sign in
          </SecondaryButton>
          <PrimaryButton onClick={onTryFree}>
            Try for free
          </PrimaryButton>
        </>
      )}
      {currentUser && (
        <PrimaryButton href="/dashboard">
          Go to Dashboard
        </PrimaryButton>
      )}
    </div>
  );
}
