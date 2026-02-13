/**
 * Main navigation links for public layout header.
 */
export default function PublicNav() {
  return (
    <div className="hidden md:flex items-center space-x-8">
      <a href="#features" className="text-white hover:text-primary-200 transition cursor-pointer">
        Product
      </a>
      <a href="#solutions" className="text-white hover:text-primary-200 transition cursor-pointer">
        Solutions
      </a>
      <a href="#resources" className="text-white hover:text-primary-200 transition cursor-pointer">
        Resources
      </a>
      <a href="#pricing" className="text-white hover:text-primary-200 transition cursor-pointer">
        Pricing
      </a>
    </div>
  );
}
