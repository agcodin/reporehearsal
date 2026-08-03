const steps = ["Account", "Plan", "Checkout"];

export default function OnboardingProgress({ current }: { current: number }) {
  return <nav className="onboarding-progress" aria-label="Onboarding progress">
    <ol>{steps.map((label, index) => { const step = index + 1; return <li className={step < current ? "complete" : step === current ? "current" : ""} aria-current={step === current ? "step" : undefined} key={label}><span>{step < current ? "✓" : step}</span><b>{label}</b></li>; })}</ol>
    <p>Step {current} of {steps.length}</p>
  </nav>;
}
