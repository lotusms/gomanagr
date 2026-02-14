import Logo from '@/components/Logo';

/**
 * Logo for public layout header (e.g. links to home).
 */
export default function PublicLogo() {
  return <Logo href="/" variant="responsive" wordmarkLight inlineClassName="h-16" />;
}
