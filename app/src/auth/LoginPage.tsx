import CustomLoginForm from "./CustomLoginForm";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export default function Login() {
  useRedirectIfLoggedIn();

  return (
    <AuthPageLayout>
      <CustomLoginForm />
    </AuthPageLayout>
  );
}

