import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { Input } from '../../../client/components/ui/input';
import { Label } from '../../../client/components/ui/label';
import { Mail } from 'lucide-react';

export default function FamilyInviteCodePage() {
  const { t } = useTranslation('family');
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    navigate(`/convite/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-sm border border-border/70 bg-muted/30">
            <Mail className="h-6 w-6 text-[#071A2D]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#071A2D]">{t('landing.insert_code')}</h1>
          <p className="text-sm text-muted-foreground">{t('signup.requires_invite')}</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-sm border border-border/70 bg-white p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">{t('landing.insert_code')}</Label>
            <Input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="abc123..."
              autoFocus
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!code.trim()}>
            {t('invite.accept')}
          </Button>
        </form>
      </div>
    </div>
  );
}
