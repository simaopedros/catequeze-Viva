import { ReactNode } from "react";
import { PublicNavbar } from "../catequese/PublicNavbar";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <div className="flex flex-1 flex-col justify-center pt-10 pb-8 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card text-card-foreground px-4 py-8 shadow-lg ring-1 ring-border sm:rounded-lg sm:px-10">
            {children}
          </div>
        </div>
      </div>
      <footer className="border-t py-3 text-center text-xs text-muted-foreground">
        Catequese Viva &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
