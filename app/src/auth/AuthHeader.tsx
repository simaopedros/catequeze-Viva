import { Link } from "react-router";
import { BrandLockup } from "../client/components/brand/Brand";

/**
 * Minimal header for auth pages — brand only (language lives in layout footer).
 */
export function AuthHeader({ mobileOnly = false }: { mobileOnly?: boolean }) {
  return (
    <header
      className={
        mobileOnly
          ? "border-b border-[#071A2D]/08 bg-white lg:hidden"
          : "border-b border-[#071A2D]/08 bg-white"
      }
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
        <Link
          to="/"
          className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#071A2D]/30 focus-visible:ring-offset-2"
        >
          <BrandLockup compact hideBadge />
        </Link>
      </div>
    </header>
  );
}
