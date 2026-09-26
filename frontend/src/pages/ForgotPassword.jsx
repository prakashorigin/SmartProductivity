import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordResetAPI } from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { data } = await requestPasswordResetAPI(email.trim().toLowerCase());
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't request a reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <BrandMark />
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">Reset your password</h1>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">Enter your account email and we’ll send a reset link if an account matches.</p>
        {message && <div role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">{message}</div>}
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
            <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <button disabled={loading} className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">{loading ? "Sending…" : "Send reset link"}</button>
        </form>
        <p className="mt-6 text-center text-sm"><Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">Back to sign in</Link></p>
      </section>
    </main>
  );
}

export function BrandMark() {
  return <div className="mb-5 flex justify-center"><Link to="/" aria-label="SmartProductivity home"><img src="/SmartProductivity%20logo.png" alt="SmartProductivity" className="h-14 w-44 rounded-lg bg-white object-contain" /></Link></div>;
}

export default ForgotPassword;
