import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AppShell } from '../AppShell';
import { Loader2 } from 'lucide-react';

export default function ActivitiesPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/app/content-library?activities=1', { replace: true });
  }, [navigate]);

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Redirecionando para a Biblioteca...</p>
      </div>
    </AppShell>
  );
}
