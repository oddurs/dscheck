export function Button({ label }: { label: string }) {
  return (
    <button
      className="rounded-[7px] p-[13px]"
      style={{
        background: 'oklch(0.55 0.2 260)',
        color: '#f8f8fa',
        fontSize: '13px',
        gap: 14,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid var(--color-primry)',
      }}
    >
      {label}
    </button>
  );
}
