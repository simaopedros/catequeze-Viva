import { FC, ReactNode, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { ShellBase } from "../../client/components/ShellBase";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

const DefaultLayout: FC<Props> = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  // 2FA enforcement: admin users should have 2FA enabled.
  // We show a warning but don't block navigation to avoid lockout.
  // Uncomment the block below to enforce mandatory 2FA:
  // if (!userHasTwoFactor) {
  //   return <Navigate to="/app/settings" replace />;
  // }

  return (
    <ShellBase variant="app">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="relative flex flex-1 flex-col overflow-y-auto">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} />
        <main>
          <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6 2xl:p-10 bg-background">
            {children}
          </div>
        </main>
      </div>
    </ShellBase>
  );
};

export default DefaultLayout;
