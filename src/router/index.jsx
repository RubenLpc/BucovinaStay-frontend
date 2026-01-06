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
      { path: "add", element: <HostAddProperty /> },
      { path: "listings", element: <HostListings /> },



    ],
  },
]);
