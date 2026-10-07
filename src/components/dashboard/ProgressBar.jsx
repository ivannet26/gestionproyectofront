function ProgressBar({ value, tone = 'blue', label }) {
  return (
    <div
      className={`progress-bar progress-bar--${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={value}
      style={{ '--progress-value': `${value}%` }}
    >
      <span className="progress-bar__fill" />
    </div>
  )
}

export default ProgressBar
