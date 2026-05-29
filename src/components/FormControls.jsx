export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-bold text-gray-800">{label}</span>}
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-5 text-gray-500">{hint}</span>}
    </label>
  );
}

export function Input({ label, hint, value, onChange, className = '', ...props }) {
  return (
    <Field label={label} hint={hint}>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-base text-gray-950 outline-none transition focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10 ${className}`}
      />
    </Field>
  );
}

export function Select({ label, hint, value, onChange, options = [], getLabel = (x) => x.nombre, optional = false }) {
  return (
    <Field label={label} hint={hint}>
      <select
        value={value}
        required={!optional}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-base text-gray-950 outline-none transition focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      >
        <option value="">Seleccionar...</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {getLabel(option)}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Textarea({ label, hint, value, onChange, rows = 3, ...props }) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        {...props}
        value={value}
        rows={rows}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-950 outline-none transition focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      />
    </Field>
  );
}

export function ToggleCard({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
        checked ? 'border-[#07AE8B] bg-[#07AE8B]/10' : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <span>
        <span className="block font-bold text-gray-950">{label}</span>
        {description && <span className="mt-1 block text-sm text-gray-600">{description}</span>}
      </span>
      <span
        className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
          checked ? 'bg-[#07AE8B]' : 'bg-gray-300'
        }`}
      >
        <span className={`h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}
