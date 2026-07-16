import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2 } from "lucide-react";

/**
 * Legacy route `/app/parishes/:id/members` redirects to the canonical Team area.
 * Workspace is selected via the app shell; parish id in the URL is informational only.
 */
export default function ParishMembersPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    navigate("/app/team", { replace: true, state: { parishId: id } });
  }, [navigate, id]);

  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
    </div>
  );
}
