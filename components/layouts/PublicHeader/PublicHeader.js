import PublicLogo from './PublicLogo';
import PublicNav from './PublicNav';
import PublicActionButtons from './PublicActionButtons';

/**
 * Public layout header: logo, nav links, and action buttons.
 * @param {Object} props
 * @param {boolean} props.currentUser - Whether user is authenticated
 * @param {() => void} props.onSignIn - Called when "Sign in" is clicked
 * @param {() => void} props.onTryFree - Called when "Try for free" is clicked
 */
export default function PublicHeader({ currentUser, onSignIn, onTryFree }) {
  return (
    <header className="relative z-10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <PublicLogo />
          <PublicNav />
          <PublicActionButtons
            currentUser={currentUser}
            onSignIn={onSignIn}
            onTryFree={onTryFree}
          />
        </div>
      </nav>
    </header>
  );
}
