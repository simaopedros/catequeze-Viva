import { type AuthUser } from 'wasp/auth';
import DefaultLayout from '../../layout/DefaultLayout';
import { AppPageHeader } from '../../../client/components/brand/AppChrome';
import UsersTable from './UsersTable';

const Users = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow="Admin"
          title="Utilizadores"
          subtitle="Gerir todos os utilizadores da plataforma."
        />
        <UsersTable />
      </div>
    </DefaultLayout>
  );
};

export default Users;
