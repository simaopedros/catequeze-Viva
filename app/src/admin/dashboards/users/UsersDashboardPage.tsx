import { type AuthUser } from 'wasp/auth';
import DefaultLayout from '../../layout/DefaultLayout';
import UsersTable from './UsersTable';

const Users = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Utilizadores</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerir todos os utilizadores da plataforma.</p>
        </div>
        <UsersTable />
      </div>
    </DefaultLayout>
  );
};

export default Users;
