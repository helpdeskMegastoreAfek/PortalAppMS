export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border bg-white shadow p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children }) {
  return <div className="">{children}</div>;
}
