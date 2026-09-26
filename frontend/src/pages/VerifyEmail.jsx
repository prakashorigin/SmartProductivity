import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { verifyEmailAPI } from "../services/api";
import { updateCredentials } from "../store/authSlice";
import { BrandMark } from "./ForgotPassword";

function VerifyEmail() {
  const { token } = useParams();
  const dispatch = useDispatch();
  const requested = useRef(false);
  const [status, setStatus] = useState("Checking your verification link…");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    verifyEmailAPI(token).then(({ data }) => {
      setStatus(data.message || "Email verified successfully.");
      dispatch(updateCredentials({ emailVerified: true }));
    }).catch((requestError) => {
      setError(true);
      setStatus(requestError.response?.data?.message || "We couldn't verify this link. It may have expired.");
    });
  }, [dispatch, token]);

  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
    <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg dark:bg-gray-800">
      <BrandMark />
      <div aria-hidden="true" className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl ${error ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"}`}>{error ? "!" : "✓"}</div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{error ? "Link needs attention" : "Email verification"}</h1>
      <p role={error ? "alert" : "status"} className="text-sm leading-6 text-gray-600 dark:text-gray-300">{status}</p>
      <div className="mt-6 flex justify-center gap-4 text-sm font-medium"><Link to="/dashboard" className="text-blue-600 hover:underline dark:text-blue-400">Go to dashboard</Link><Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">Sign in</Link></div>
    </section>
  </main>;
}

export default VerifyEmail;
