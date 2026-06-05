import CustomSignupForm from "./CustomSignupForm";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function Signup() {
  useRedirectIfLoggedIn();

  return (
    <AuthPageLayout>
      <CustomSignupForm />
    </AuthPageLayout>
  );
}
