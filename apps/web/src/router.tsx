import { createBrowserRouter } from "react-router";

import { ProtectedRoute } from "./components/protected-route.js";
import { RootLayout } from "./layouts/root-layout.js";
import { ForgotPasswordPage } from "./pages/forgot-password-page.js";
import { LoginPage } from "./pages/login-page.js";
import { RegisterPage } from "./pages/register-page.js";
import { ResetPasswordPage } from "./pages/reset-password-page.js";
import { RoutePlaceholder } from "./pages/route-placeholder.js";
import { VerifyEmailPage } from "./pages/verify-email-page.js";

function placeholder(title: string, description: string) {
  return <RoutePlaceholder title={title} description={description} />;
}

/** Public, unauthenticated routes — the M3 Identity & Authentication
 * flows (see docs/adr/adr-006-authentication.md). */
const PUBLIC_ROUTES = [
  { path: "login", element: <LoginPage /> },
  { path: "register", element: <RegisterPage /> },
  { path: "verify-email", element: <VerifyEmailPage /> },
  { path: "forgot-password", element: <ForgotPasswordPage /> },
  { path: "reset-password", element: <ResetPasswordPage /> },
];

/** Routes requiring an authenticated session — gated by ProtectedRoute,
 * which only hides UI; the backend remains the real authorization
 * boundary on every request. Still placeholders for the features
 * themselves (M4+), real now only in that they require login. */
const APP_ROUTES = [
  { path: "dashboard", element: placeholder("Dashboard", "Student dashboard placeholder.") },
  { path: "lessons", element: placeholder("Lessons", "Lesson list placeholder.") },
  { path: "vocabulary", element: placeholder("Vocabulary", "Vocabulary practice placeholder.") },
  { path: "phonetics", element: placeholder("Phonetics", "Phonetics practice placeholder.") },
  { path: "exercises", element: placeholder("Exercises", "Exercises placeholder.") },
  { path: "progress", element: placeholder("Progress", "Progress tracking placeholder.") },
  {
    path: "achievements",
    element: placeholder("Achievements", "Gamification/achievements placeholder."),
  },
  { path: "profile", element: placeholder("Profile", "User profile placeholder.") },
  { path: "settings", element: placeholder("Settings", "Account settings placeholder.") },
];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: placeholder("TFM-BIC", "Language-learning platform — home.") },
      ...PUBLIC_ROUTES,
      {
        element: <ProtectedRoute />,
        children: APP_ROUTES,
      },
      { path: "*", element: placeholder("Not found", "This route does not exist.") },
    ],
  },
]);
