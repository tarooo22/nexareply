import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageMetadata } from "./components/PageMetadata";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PublicPage from "./pages/PublicPage";

const DemoWorkspace = lazy(() => import("./pages/DemoWorkspace"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-background text-foreground"><div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm font-semibold shadow-sm">NexaReply იტვირთება…</div></div>}>
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/pricing"}>{() => <PublicPage kind="pricing" />}</Route>
      <Route path={"/privacy"}>{() => <PublicPage kind="privacy" />}</Route>
      <Route path={"/terms"}>{() => <PublicPage kind="terms" />}</Route>
      <Route path={"/contact"}>{() => <PublicPage kind="contact" />}</Route>
      <Route path={"/demo/:rest*"} component={DemoWorkspace} />
      <Route path={"/demo"} component={DemoWorkspace} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <PageMetadata />
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
