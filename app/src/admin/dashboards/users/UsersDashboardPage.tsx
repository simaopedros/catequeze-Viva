import { type AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";
import UsersTable from "./UsersTable";

const Users = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.users.title")}
          subtitle={t("pages.users.subtitle")}
        />
        <UsersTable />
      </div>
    </DefaultLayout>
  );
};

export default Users;
