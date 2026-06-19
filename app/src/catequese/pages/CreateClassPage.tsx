import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { createClass } from 'wasp/client/operations';
import { handlePlanLimitError } from '../lib/planLimitToast';
import { toast } from '../../client/hooks/use-toast';
import { useActiveWorkspace } from '../../client/hooks/useActiveWorkspace';
import { createClassSchema, type CreateClassValues } from '../../client/validation/schemas';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../client/components/ui/form';

export default function CreateClassPage() {
  const { t } = useTranslation('classes');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const { workspaceId } = useActiveWorkspace();

  const form = useForm<CreateClassValues>({
    resolver: zodResolver(createClassSchema) as any,
    defaultValues: {
      name: '',
      location: '',
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      maxCapacity: 30,
    },
  });

  const onSubmit = async (values: CreateClassValues) => {
    try {
      await createClass({
        ...values,
        parishId: workspaceId,
      });
      toast({ title: t('created_success') });
      navigate('/app/classes');
    } catch (err: any) {
      if (handlePlanLimitError(err.message || err)) return;
      form.setError('root', { message: err.message || t('create_error') });
    }
  };

  return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/classes"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div><h1 className="text-2xl font-bold tracking-tight">{t('create')}</h1></div>
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
                  <FormLabel>{t('name')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('location')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('location_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('day')}</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">{tc('select_option')}</option>
                        {[0, 1, 2, 3, 4, 5, 6].map(i => (
                          <option key={i} value={i}>{t(`days.${i}`)}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('start')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('end')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="maxCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('max_capacity')}</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={200} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? tc('loading') : t('create')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/app/classes">{tc('cancel')}</Link>
              </Button>
            </div>
          </form>
        </Form>
      </div>
  );
}
