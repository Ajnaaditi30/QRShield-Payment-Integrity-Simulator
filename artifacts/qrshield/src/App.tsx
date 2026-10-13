import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import OverviewPage from '@/pages/overview';
import GeneratePage from '@/pages/generate';
import TamperingPage from '@/pages/tampering';
import VerificationPage from '@/pages/verification';
import HistoryPage from '@/pages/history';
import AboutPage from '@/pages/about';
import { Layout } from '@/components/layout';
import { AppStateProvider } from '@/lib/app-state';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: false },
  },
});

function Router() {
  return (
    <RoutedErrorBoundary>
      <Layout>
        <Switch>
          <Route path="/" component={OverviewPage} />
          <Route path="/generate" component={GeneratePage} />
          <Route path="/tampering" component={TamperingPage} />
          <Route path="/verification" component={VerificationPage} />
          <Route path="/history" component={HistoryPage} />
          <Route path="/about" component={AboutPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppStateProvider>
            <Router />
          </AppStateProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
