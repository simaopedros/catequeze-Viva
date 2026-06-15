export default function SectionTitle({
  title,
  description,
}: {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
}) {
  const titleElement =
    typeof title === "string" ? (
      <h3 className="text-foreground mt-2 text-title-xl font-bold tracking-tight">
        {title}
      </h3>
    ) : (
      title
    );
  const descriptionElement =
    typeof description === "string" ? (
      <p className="text-text-secondary mt-4 text-body-lg leading-relaxed">
        {description}
      </p>
    ) : (
      description
    );

  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      {titleElement}
      {descriptionElement}
    </div>
  );
}
