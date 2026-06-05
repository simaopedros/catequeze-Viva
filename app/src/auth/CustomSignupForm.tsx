import { useState } from 'react';
import { signup } from 'wasp/client/auth';
import { Button } from '../client/components/ui/button';
import { Input } from '../client/components/ui/input';
import { Label } from '../client/components/ui/label';
import { Checkbox } from '../client/components/ui/checkbox';
import { Cross, Loader2, Eye, EyeOff } from 'lucide-react';

export default function CustomSignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!acceptTerms) {
      setError('Deve aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }

    setIsLoading(true);
    try {
      await signup({ email, password, username: email, isAdmin: false });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex rounded-xl bg-green-100 p-3">
          <Cross className="h-6 w-6 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Conta criada!</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Verifique seu email para ativar a conta.
          </p>
        </div>
        <Button variant="outline" onClick={() => setSuccess(false)} className="w-full">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex rounded-xl bg-primary/10 p-3">
          <Cross className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground">Comece gratuitamente a organizar a catequese</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              disabled={isLoading}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Mínimo 8 caracteres. Use letras, números e símbolos.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha"
            autoComplete="new-password"
            disabled={isLoading}
            required
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="acceptTerms"
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(!!v)}
            disabled={isLoading}
            className="mt-1"
          />
          <Label htmlFor="acceptTerms" className="text-xs cursor-pointer leading-relaxed">
            Aceito os{' '}
            <a href="/terms" target="_blank" className="text-primary hover:underline" rel="noreferrer">Termos de Uso</a>
            {' '}e a{' '}
            <a href="/privacy" target="_blank" className="text-primary hover:underline" rel="noreferrer">Política de Privacidade</a>
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</>
          ) : (
            'Criar conta gratuita'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <a href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </a>
      </p>
    </div>
  );
}
