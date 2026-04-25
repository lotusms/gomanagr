import Link from 'next/link';

/**
 * Main navigation links for public layout header.
 */
export default function PublicNav() {
  return (
    <div className="hidden md:flex items-center space-x-8">
      <Link href="/#features" className="text-white hover:text-primary-200 transition cursor-pointer">
        Product
      </Link>
      <Link href="/solutions" className="text-white hover:text-primary-200 transition cursor-pointer">
        Solutions
      </Link>
      <Link href="/resources" className="text-white hover:text-primary-200 transition cursor-pointer">
        Resources
      </Link>
      <Link href="/pricing" className="text-white hover:text-primary-200 transition cursor-pointer">
        Pricing
      </Link>
    </div>
  );
}
