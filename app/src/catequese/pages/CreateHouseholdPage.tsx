import { Link, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { createHousehold } from 'wasp/client/operations';
import PhoneMaskInput from '../../client/components/PhoneMaskInput';
import { useViaCep } from '../../client/hooks/useViaCep';
import { createHouseholdSchema, type CreateHouseholdValues } from '../../client/validation/schemas';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../client/components/ui/form';

export default function CreateHouseholdPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const form = useForm<CreateHouseholdValues>({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });

  const cep = form.watch('address');
  const { data: cepData, loading: cepLoading } = useViaCep(cep || '');

  useEffect(() => {
    if (cepData) {
      const parts = [
        cepData.street,
        cepData.neighborhood && `- ${cepData.neighborhood}`,
        cepData.city && `- ${cepData.city}/${cepData.state}`,
      ].filter(Boolean);
      if (parts.length > 0) {
        form.setValue('address', parts.join(' '));
      }
    }
  }, [cepData, form]);

  const onSubmit = async (values: CreateHouseholdValues) => {
    try {
      await createHousehold({
        name: values.name,
        address: values.address || undefined,
        phone: values.phone || undefined,
      });
      navigate('/app/families');
    } catch (err: any) {
      form.setError('root', { message: err.message || t('families.create_error') });
    }
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/families"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('families.create_title')}</h1>
          </div>
        </div>

        {form.formState.errors.root && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('families.name_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('families.name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('address')}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input placeholder={t('families.address_placeholder')} {...field} />
                      {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('phone')}</FormLabel>
                  <FormControl>
                    <PhoneMaskInput
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder={t('phone_placeholder')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? t('saving') : t('register')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/app/families">{t('cancel')}</Link>
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppShell>
  );
}
