import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Root from "./Root.jsx";
import HomePage from "./pages/Homepage.jsx";
import LoginPage from "./pages/Login.jsx";
import SignupPage from "./pages/Signup.jsx";
import Features from "./pages/Features.jsx";
import About from "./pages/About.jsx";
import RealtimeVerifier from "./pages/Dashboard.jsx";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import "./index.css";
import { LoadingBarContainer } from "react-top-loading-bar";
import { ToastContainer } from "react-toastify";

const routing = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "signup",
        element: <SignupPage />,
      },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <RealtimeVerifier />
          </ProtectedRoute>
        ),
      },
      {
        path: "features",
        element: <Features />,
      },
      {
        path: "about",
        element: <About />,
      }
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LoadingBarContainer>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <RouterProvider router={routing} />
    </LoadingBarContainer>
  </StrictMode>,
);
