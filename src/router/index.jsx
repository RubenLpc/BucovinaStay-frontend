import { createBrowserRouter, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import HostLayout from "../layouts/HostLayout";

import Home from "../pages/Home/Home";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import Profile from "../pages/Profile/Profile";
import ProtectedRoute from "./ProtectedRoute";
import Trails from "../pages/Trails/Trails";
import Stays from "../pages/Stays/Stays";
import HostDashboard from "../pages/Host/HostDashboard";
import HostAddProperty from "../pages/Host/HostAddProperty";
import HostListings from "../pages/Host/HostListings";
import PropertyPage from "../pages/PropertyPage/PropertyPage";
import HostEditProperty from "../pages/Host/HostEditProperty";
import HostActivity from "../pages/Host/HostActivity";
import HostReports from "../pages/Host/HostReports";
import HostSettings from "../pages/Host/HostSettings";
import AdminLayout from "../layouts/AdminLayout";
import AdminRoute from "./AdminRoute";
import MaintananceLayout from "../layouts/MaintananceLayout";

import AdminOverview from "../pages/Admin/AdminOverview";
import AdminUsers from "../pages/Admin/AdminUsers";
import AdminListings from "../pages/Admin/AdminListings";
import AdminSettings from "../pages/Admin/AdminSettings";
import AdminReviews from "../pages/Admin/AdminReviews";
import Maintenance from "../pages/Maintenance/Maintenance";





export const router = createBrowserRouter([
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { index: true, element: <Navigate to="/auth/login" replace /> },
    ],
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "trasee", element: <Trails /> },
      { path: "cazari", element: <Stays /> },
      { path: "cazari/:id", element: <PropertyPage /> },


      {
        element: <ProtectedRoute />,
        children: [{ path: "profile", element: <Profile /> }],
      },
    ],
  },
  {
    path: "/host",
    element: <HostLayout />,
    children: [
     
      { index: true, element: <HostDashboard /> },
      { path: "dashboard", element: <HostDashboard /> },

      { path: "add", element: <HostAddProperty /> },
      { path: "listings", element: <HostListings /> },
      { path: ":id/edit", element: <HostEditProperty /> },
      { path: "activity", element: <HostActivity /> },
      { path: "reports", element: <HostReports /> },
      { path: "settings", element: <HostSettings /> },


      

    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        element: <AdminRoute />,
        children: [
          { index: true, element: <AdminOverview /> },
          { path: "users", element: <AdminUsers /> },
          { path: "listings", element: <AdminListings /> },
          { path: "settings", element: <AdminSettings /> },
          { path: "reviews", element: <AdminReviews /> },



        ],
      },
    ],
  },
  {
    path: "/maintenance",
    element: <MaintananceLayout />,
    children: [
      {
        children: [
          { index: true, element: <Maintenance /> },
        ],
      },
    ],
  },
  
]);
