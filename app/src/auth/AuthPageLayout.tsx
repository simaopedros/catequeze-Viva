import { ReactNode } from "react";
import { PublicNavbar } from "../catequese/PublicNavbar";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <div className="flex flex-1 flex-col justify-center pt-10 pb-8 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card text-card-foreground px-4 py-8 shadow-xl ring-1 ring-gray-900/10 sm:rounded-lg sm:px-10">
            <div className="-mt-8">{children}</div>
          </div>
        </div>
      </div>
      <footer className="border-t py-3 text-center text-xs text-muted-foreground">
        Catequese Viva &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
