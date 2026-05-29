export default function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || subtitle || action) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h2 className="text-lg font-bold text-gray-950">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm leading-5 text-gray-600">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}

      {children}
    </section>
  );
}
