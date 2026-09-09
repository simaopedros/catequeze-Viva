import { type AuthUser } from "wasp/auth";
import { createBlogPost } from "wasp/client/operations";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";

const BlogNewPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void createBlogPost({ title: t("pages.blog.untitled") })
      .then((post) => navigate(`/admin/blog/${post.id}`, { replace: true }))
      .catch(() => navigate("/admin/blog", { replace: true }));
  }, [navigate, t]);

  return (
    <DefaultLayout user={user}>
      <AppPageHeader
        eyebrow={t("pages.admin")}
        title={t("pages.blog.creating")}
        subtitle={t("pages.blog.subtitle")}
      />
    </DefaultLayout>
  );
};

export default BlogNewPage;
