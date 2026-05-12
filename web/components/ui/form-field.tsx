export function FormField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field fieldBlock">
      <span>{label}</span>
      {description ? <span className="fieldHint">{description}</span> : null}
      {children}
    </label>
  );
}
