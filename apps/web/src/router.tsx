import { createBrowserRouter, Navigate, type RouteObject } from "react-router";

import { ProtectedRoute } from "./components/protected-route.js";
import { RouteErrorFallback } from "./components/route-error-fallback.js";
import { TeacherRoute } from "./components/teacher-route.js";
import { RootLayout } from "./layouts/root-layout.js";
import { AccountDeletedPage } from "./pages/account-deleted-page.js";
import { AchievementsPage } from "./pages/achievements-page.js";
import { DashboardPage } from "./pages/dashboard-page.js";
import { ExercisePage } from "./pages/exercise-page.js";
import { ForgotPasswordPage } from "./pages/forgot-password-page.js";
import { ContentPage } from "./pages/content-page.js";
import { LearnPage } from "./pages/learn-page.js";
import { LessonPage } from "./pages/lesson-page.js";
import { LessonsPage } from "./pages/lessons-page.js";
import { LoginPage } from "./pages/login-page.js";
import { MyVocabularyPage } from "./pages/my-vocabulary-page.js";
import { NewsletterConfirmPage } from "./pages/newsletter-confirm-page.js";
import { NewsletterUnsubscribePage } from "./pages/newsletter-unsubscribe-page.js";
import { PhoneticDetailPage } from "./pages/phonetic-detail-page.js";
import { PhoneticsPage } from "./pages/phonetics-page.js";
import { GrammarPage } from "./pages/grammar-page.js";
import { GrammarTopicPage } from "./pages/grammar-topic-page.js";
import { PrivacyPage } from "./pages/privacy-page.js";
import { ProfilePage } from "./pages/profile-page.js";
import { RegisterPage } from "./pages/register-page.js";
import { ResetPasswordPage } from "./pages/reset-password-page.js";
import { RoutePlaceholder } from "./pages/route-placeholder.js";
import { TeacherDashboardPage } from "./pages/teacher-dashboard-page.js";
import { TeacherStudentPage } from "./pages/teacher-student-page.js";
import { VerifyEmailPage } from "./pages/verify-email-page.js";
import { VideoGenerationDemoPage } from "./pages/video-generation-demo-page.js";
import { VideosPage } from "./pages/videos-page.js";
import { VocabularyDetailPage } from "./pages/vocabulary-detail-page.js";
import { VocabularyPage } from "./pages/vocabulary-page.js";

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
  // Newsletter links from emails (M14): public, the token is the credential; each asks for a click.
  { path: "newsletter/confirm", element: <NewsletterConfirmPage /> },
  { path: "newsletter/unsubscribe", element: <NewsletterUnsubscribePage /> },
  // Privacy (M15): the notice is public; the deletion confirmation is shown once the session is
  // gone. Not under `/data-management`, which is the API path.
  { path: "privacy", element: <PrivacyPage /> },
  { path: "account-deleted", element: <AccountDeletedPage /> },
];

/** Language, level and content discovery (M5) — public, like the catalog API behind it. One
 * generic page set for every language; the choice lives in the URL. Deliberately not under
 * `/languages` or `/content`: those are the API paths, and a page and an API sharing a path
 * needs a proxy workaround (see ADR-017). */
const LEARN_ROUTES = [
  { path: "learn/:languageCode?/:levelId?", element: <LearnPage /> },
  { path: "learn/:languageCode/:levelId/:contentId", element: <ContentPage /> },
];

/** The student lesson experience (M6) — the lessons list and one lesson. Under `/learn` because
 * `/lessons` is the API path (see ADR-019). React Router ranks these static paths above the public
 * `learn/:languageCode?/:levelId?` route, and no language code can be spelled "lessons" (codes are
 * two or three letters), so the two never compete. They sit behind ProtectedRoute like the rest. */
const LESSON_ROUTES = [
  { path: "learn/lessons", element: <LessonsPage /> },
  { path: "learn/lessons/:lessonId", element: <LessonPage /> },
];

/** One exercise (M7). Under `/learn` because `/exercises` is the API path (see ADR-020). Its static
 * `learn/exercises` segment ranks above the public `learn/:languageCode/:levelId` route, and no language
 * code can be spelled "exercises" (codes are two or three letters), so the two never compete. Behind
 * ProtectedRoute like the rest. */
const EXERCISE_ROUTES = [{ path: "learn/exercises/:exerciseId", element: <ExercisePage /> }];

/** Vocabulary (M9) — browse, "My Vocabulary" and one entry. Under `/learn` because `/vocabulary`
 * and `/user-vocabulary` are the API paths (see ADR-022). `learn/vocabulary/mine` is a static
 * segment, so React Router ranks it above `learn/vocabulary/:vocabularyId` regardless of
 * registration order — the same technique `learn/lessons` and `learn/exercises` already use. */
const VOCABULARY_ROUTES = [
  { path: "learn/vocabulary", element: <VocabularyPage /> },
  { path: "learn/vocabulary/mine", element: <MyVocabularyPage /> },
  { path: "learn/vocabulary/:vocabularyId", element: <VocabularyDetailPage /> },
];

/** Phonetics (M10) — browse and one representation. Under `/learn` because `/phonetics` is the
 * API path, the same reasoning as Vocabulary (ADR-022) and Lessons (ADR-019). Independent of
 * Vocabulary: no shared route, no shared identifier. */
const PHONETICS_ROUTES = [
  { path: "learn/phonetics", element: <PhoneticsPage /> },
  { path: "learn/phonetics/:phoneticId", element: <PhoneticDetailPage /> },
];

/** Grammar reference (M23) — quick-lookup tables per language, and one topic. Under `/learn`
 * because `/grammar` is the API path, the same reasoning as Phonetics. */
const GRAMMAR_ROUTES = [
  { path: "learn/grammar", element: <GrammarPage /> },
  { path: "learn/grammar/:topicId", element: <GrammarTopicPage /> },
];

/** Video generation (M11) — one demo page requesting generation of the milestone's one authored
 * definition (see VideoGenerationDemoPage's doc comment for why there is no browse/list route).
 * Under `/learn` because `/video-generations` is the API path, the same reasoning as Phonetics. */
const VIDEO_ROUTES = [
  // M21 (ADR-031): the video library — published explainer videos of lessons and words.
  { path: "learn/videos", element: <VideosPage /> },
  // M11's on-demand render demo, kept for its API but no longer linked: learners watch published
  // videos; generation is an offline operator step.
  { path: "learn/videos/render-demo", element: <VideoGenerationDemoPage /> },
];

/** The teacher dashboard (M13) — the overview/roster and one student. Behind login *and* the
 * TeacherRoute guard, which only spares a student a page of refused requests: the API authorises
 * every request by role and teacher–student link (ADR-024). Not under `/teacher-dashboard`, which
 * is the API path, so no proxy bypass is needed. */
const TEACHER_ROUTES = [
  {
    element: <TeacherRoute />,
    children: [
      { path: "teacher", element: <TeacherDashboardPage /> },
      { path: "teacher/students/:studentId", element: <TeacherStudentPage /> },
    ],
  },
];

/** Routes requiring an authenticated session — gated by ProtectedRoute,
 * which only hides UI; the backend remains the real authorization
 * boundary on every request. Profile is the real M4 page, lessons the
 * real M6 pages, exercises the real M7 page, vocabulary the real M9 pages, phonetics the real
 * M10 pages, video generation the real M11 demo page, and the dashboard and achievements the real
 * M8 pages (their API is under `/gamification`, so no page-vs-API path
 * clash); the rest are still placeholders for their features, real now only in that they require
 * login. */
const APP_ROUTES = [
  { path: "dashboard", element: <DashboardPage /> },
  ...LESSON_ROUTES,
  ...EXERCISE_ROUTES,
  ...VOCABULARY_ROUTES,
  ...PHONETICS_ROUTES,
  ...VIDEO_ROUTES,
  ...GRAMMAR_ROUTES,
  ...TEACHER_ROUTES,
  // M21: former Milestone-1 placeholders now lead somewhere real — progress lives on the dashboard,
  // account settings on the profile. Still behind login.
  { path: "progress", element: <Navigate to="/dashboard" replace /> },
  { path: "achievements", element: <AchievementsPage /> },
  { path: "profile", element: <ProfilePage /> },
  { path: "settings", element: <Navigate to="/profile" replace /> },
];

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    // M18: any route that throws while rendering shows a safe fallback and is reported.
    errorElement: <RouteErrorFallback />,
    // M20A: shown only while a lazy route (the homepage) loads on the very first navigation — a blank
    // page in the page colour, so nothing flashes or shifts.
    hydrateFallbackElement: (
      <div aria-busy="true" className="min-h-screen bg-surface dark:bg-surface-dark" />
    ),
    children: [
      // The public homepage (M20A): its own chunk (scenes, stylesheet), so no other page carries it;
      // full-bleed, so the root layout drops its centred column for it.
      {
        index: true,
        handle: { fullBleed: true },
        lazy: () =>
          import("./pages/home-page.js").then(({ HomePage }) => ({ Component: HomePage })),
      },
      ...PUBLIC_ROUTES,
      ...LEARN_ROUTES,
      {
        element: <ProtectedRoute />,
        children: APP_ROUTES,
      },
      { path: "*", element: placeholder("Not found", "This route does not exist.") },
    ],
  },
];

export const router = createBrowserRouter(routes);
