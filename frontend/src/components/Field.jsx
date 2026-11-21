export default function Field({ label, htmlFor, error, hint, required, className = '', children }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label ? (
        <label htmlFor={htmlFor}>
          {label}
          {required ? <span className="required-mark"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <span className="field-error">{error}</span> : null}
      {!error && hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  )
}
