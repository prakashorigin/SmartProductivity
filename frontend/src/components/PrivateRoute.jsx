import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

function PrivateRoute({ children, allowedRoles }) {
  const { token, user } = useSelector((state) => state.auth);
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default PrivateRoute;
