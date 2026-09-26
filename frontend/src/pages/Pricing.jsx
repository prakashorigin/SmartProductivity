import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateCredentials } from "../store/authSlice";
import { createCheckoutSessionAPI, createCustomerPortalAPI, getCurrentSubscriptionAPI, getPlansAPI } from "../services/api";

const formatPrice = (price) => {
  if (!price) return "Price configured in Stripe";
  const amount = new Intl.NumberFormat(undefined, { style: "currency", currency: price.currency.toUpperCase() }).format(price.amount / 100);
  return `${amount} / ${price.interval}`;
};

function Pricing() {
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState("");
  const [error, setError] = useState("");
  const checkoutStatus = searchParams.get("checkout");
  const notice = checkoutStatus === "success"
    ? "Checkout finished. Your plan will update after Stripe confirms payment."
    : checkoutStatus === "cancelled"
      ? "Checkout was cancelled. You have not been charged."
      : "";

  useEffect(() => {
    Promise.all([
      getPlansAPI(),
      userId ? getCurrentSubscriptionAPI().catch(() => null) : Promise.resolve(null),
    ]).then(([planResponse, subscriptionResponse]) => {
      setPlans(planResponse.data);
      setSubscription(subscriptionResponse?.data || null);
      if (subscriptionResponse?.data) {
        dispatch(updateCredentials({
          subscription: subscriptionResponse.data.plan,
          subscriptionPlan: subscriptionResponse.data.plan,
          subscriptionStatus: subscriptionResponse.data.subscriptionStatus,
          currentPeriodEnd: subscriptionResponse.data.currentPeriodEnd,
        }));
      }
    }).catch((requestError) => {
      setError(requestError.response?.data?.message || "Pricing is temporarily unavailable.");
    }).finally(() => setLoading(false));
  }, [userId, searchParams, dispatch]);

  const selectPlan = async (plan) => {
    if (!user) {
      navigate("/register");
      return;
    }
    if (plan.id === "free") return;
    setBusyPlan(plan.id);
    setError("");
    try {
      const { data } = await createCheckoutSessionAPI(plan.id);
      window.location.assign(data.url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't start secure checkout.");
      setBusyPlan("");
    }
  };

  const openBillingPortal = async () => {
    setBusyPlan("billing");
    setError("");
    try {
      const { data } = await createCustomerPortalAPI();
      window.location.assign(data.url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Billing settings are not available yet.");
      setBusyPlan("");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 to-white px-4 py-10 dark:from-gray-900 dark:to-gray-950 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center justify-between"><Link to="/" className="text-sm font-semibold text-gray-500 no-underline hover:text-indigo-600 dark:text-gray-300">← SmartProductivity</Link>{user ? <Link to="/dashboard" className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Back to dashboard</Link> : <Link to="/login" className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Sign in</Link>}</div>
        <header className="mx-auto mb-10 max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Simple plans</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">More focus, your way.</h1><p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">Start free and upgrade when you need more room for your goals.</p></header>

        {notice && <div role="status" className="mx-auto mb-5 max-w-2xl rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">{notice}</div>}
        {error && <div role="alert" className="mx-auto mb-5 max-w-2xl rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        {loading ? <div className="grid gap-4 md:grid-cols-3" aria-label="Loading plans">{[0, 1, 2].map((item) => <div key={item} className="h-[28rem] animate-pulse rounded-3xl bg-white dark:bg-gray-800" />)}</div> : <div className="grid items-stretch gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const current = subscription?.plan === plan.id;
            const popular = plan.id === "pro";
            return <article key={plan.id} className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm dark:bg-gray-800 ${popular ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-gray-200 dark:border-gray-700"}`}>
              {popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">Most popular</span>}
              <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h2><p className="mt-2 min-h-12 text-sm text-gray-500 dark:text-gray-400">{plan.id === "free" ? "The essential tools to build a steady routine." : plan.id === "pro" ? "More room for your study plans and focus habits." : "Long-term insight and a deeper view of your progress."}</p><p className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(plan.price)}</p></div>
              <ul className="my-6 flex-1 space-y-3 border-t border-gray-100 pt-5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><span className="font-bold text-emerald-600" aria-hidden="true">✓</span>{feature}</li>)}</ul>
              <button type="button" disabled={busyPlan !== "" || (plan.id !== "free" && !plan.configured)} onClick={() => selectPlan(plan)} className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${popular ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"}`}>{busyPlan === plan.id ? "Opening checkout…" : current ? "Current plan" : plan.id === "free" ? user ? "Free plan" : "Start for free" : plan.configured ? `Choose ${plan.name}` : "Stripe setup required"}</button>
            </article>;
          })}
        </div>}
        {user && subscription?.plan !== "free" && <div className="mt-6 text-center"><button type="button" onClick={openBillingPortal} disabled={busyPlan !== ""} className="text-sm font-semibold text-indigo-700 hover:underline disabled:opacity-50 dark:text-indigo-300">{busyPlan === "billing" ? "Opening billing…" : "Manage billing"}</button></div>}
        {!plans.some((plan) => plan.id === "pro" && plan.configured) && !loading && <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-gray-400">Paid checkout becomes available once the Stripe secret key and recurring Pro and Premium Price IDs are set in the backend environment.</p>}
      </div>
    </main>
  );
}

export default Pricing;
