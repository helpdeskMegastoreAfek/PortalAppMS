export function Button({ children, className = "", onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-2 font-semibold ${className}`}
    >
      {children}
    </button>
  );
}
