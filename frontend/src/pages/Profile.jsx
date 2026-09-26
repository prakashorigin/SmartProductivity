import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchProfile, logout, updateCredentials } from "../store/authSlice";
import { deleteAccountAPI, resendVerificationAPI, updateProfileAPI } from "../services/api";

function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [name, setName] = useState(null);
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [loading, setLoading] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  const formName = name ?? user?.name ?? "";
  const formEmail = email ?? user?.email ?? "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setVerificationUrl("");
    try {
      const updateData = { name: formName, email: formEmail };
      if (password) updateData.password = password;

      const { data } = await updateProfileAPI(updateData);
      dispatch(updateCredentials(data));
      setMessageTone(data.verificationEmailSent === false ? "warning" : "success");
      setMessage(data.verificationEmailSent === false
        ? "Profile updated. Email delivery is not configured, so your new email is not verified yet."
        : data.emailVerified === false && data.verificationEmailSent
          ? "Profile updated. Check your new email address for a verification link."
          : "Profile updated successfully!");
      setPassword("");
      dispatch(fetchProfile());
    } catch (error) {
      setMessageTone("error");
      setMessage(error.response?.data?.message || "Update failed");
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const resendVerification = async () => {
    setVerificationBusy(true);
    setVerificationUrl("");
    try {
      const { data } = await resendVerificationAPI();
      setMessageTone(data.emailSent === false ? "warning" : "success");
      setMessage(data.message);
      setVerificationUrl(data.verificationUrl || "");
    } catch (error) {
      setMessageTone("error");
      setMessage(error.response?.data?.message || "We couldn't send a verification link. Please try again.");
    } finally {
      setVerificationBusy(false);
    }
  };

  const deleteAccount = async (event) => {
    event.preventDefault();
    setDeleteBusy(true);
    setDeleteMessage("");
    try {
      await deleteAccountAPI(deletePassword);
      dispatch(logout());
      window.location.assign("/");
    } catch (error) {
      setDeleteMessage(error.response?.data?.message || "We couldn't delete your account. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        👤 Profile Settings
      </h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-6">
        {/* User avatar/initials */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-white text-lg">
              {user?.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user?.email}
            </p>
            <div className="flex gap-2 mt-1">
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {user?.role}
              </span>
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                {user?.subscription} plan
              </span>
            </div>
            {user?.emailVerified === false && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-amber-700 dark:text-amber-300">Email not verified</span><button type="button" onClick={resendVerification} disabled={verificationBusy} className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400">{verificationBusy ? "Sending…" : "Resend link"}</button></div>}
          </div>
        </div>

        {message && (
          <div
            role={messageTone === "error" ? "alert" : "status"}
            className={`p-3 rounded-lg mb-4 text-sm text-center ${messageTone === "success" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" : messageTone === "warning" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}
          >
            {message}
            {verificationUrl && <div><a href={verificationUrl} className="mt-2 inline-block font-semibold underline">Open verification link</a></div>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="profile-new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password (leave blank to keep)
            </label>
            <div className="relative">
              <input
                id="profile-new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-16 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-3 my-auto h-8 rounded px-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-gray-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold cursor-pointer disabled:opacity-50 transition-colors border-none"
          >
            {loading ? "Saving..." : "Update Profile"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/60 dark:bg-gray-800">
        <h3 className="font-semibold text-red-700 dark:text-red-300">Delete account</h3>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">This permanently deletes your account, tasks, projects, focus sessions, and notifications. Enter your password to confirm.</p>
        {deleteMessage && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{deleteMessage}</div>}
        <form onSubmit={deleteAccount} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="delete-account-password">Password</label>
          <div className="relative min-w-0 flex-1"><input id="delete-account-password" type={showDeletePassword ? "text" : "password"} autoComplete="current-password" required value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Confirm with your password" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-16 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" /><button type="button" onClick={() => setShowDeletePassword((visible) => !visible)} aria-label={showDeletePassword ? "Hide password" : "Show password"} aria-pressed={showDeletePassword} className="absolute inset-y-0 right-3 my-auto h-8 rounded px-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-gray-600">{showDeletePassword ? "Hide" : "Show"}</button></div>
          <button type="submit" disabled={deleteBusy} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{deleteBusy ? "Deleting…" : "Delete account"}</button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
          Account Info
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
          <p>
            Member since:{" "}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "N/A"}
          </p>
          <p>Role: {user?.role}</p>
          <p>Plan: {user?.subscription}</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;
