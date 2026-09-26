import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPasswordAPI } from "../services/api";
import { BrandMark } from "./ForgotPassword";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("The passwords don’t match. Check both fields and try again.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordAPI(token, password);
      navigate("/login", { replace: true, state: { notice: "Your password has been reset. Sign in with your new password." } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "This reset link may have expired. Request a new one and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <BrandMark />
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">Choose a new password</h1>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">Use at least 8 characters. Reset links expire after 15 minutes.</p>
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} visible={showPassword} toggle={() => setShowPassword((visible) => !visible)} />
          <PasswordField id="confirm-password" label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} toggle={() => setShowPassword((visible) => !visible)} />
          <button disabled={loading} className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">{loading ? "Saving…" : "Reset password"}</button>
        </form>
        <p className="mt-6 text-center text-sm"><Link to="/forgot-password" className="font-medium text-blue-600 hover:underline dark:text-blue-400">Request another reset link</Link></p>
      </section>
    </main>
  );
}

function PasswordField({ id, label, value, onChange, visible, toggle }) {
  return <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <div className="relative">
      <input id={id} type={visible ? "text" : "password"} required minLength={8} autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-16 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      <button type="button" onClick={toggle} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute inset-y-0 right-3 my-auto h-8 rounded px-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-gray-600">{visible ? "Hide" : "Show"}</button>
    </div>
  </div>;
}

export default ResetPassword;
