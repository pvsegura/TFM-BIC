import { createBrowserRouter } from "react-router";

import { RootLayout } from "./layouts/root-layout.js";
import { RoutePlaceholder } from "./pages/route-placeholder.js";

function placeholder(title: string, description: string) {
  return <RoutePlaceholder title={title} description={description} />;
}

/**
 * Route tree for M1. Split into two groups purely as documentation of
 * intent — "public" vs. "conceptually authenticated" — per the M1 brief:
 * placeholders only, no real auth guard (that would be faking
 * authentication, which M1 explicitly must not do). A real guard/loader
 * arrives with the Identity & Auth bounded context.
 */
const PUBLIC_ROUTES = [
  { path: "login", element: placeholder("Log in", "Authentication is not implemented yet.") },
  {
    path: "register",
    element: placeholder("Register", "Registration is not implemented yet."),
  },
];

/** Routes that will require an authenticated session once auth exists. */
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
      ...APP_ROUTES,
      { path: "*", element: placeholder("Not found", "This route does not exist.") },
    ],
  },
]);
