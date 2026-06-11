import { ThemeProvider, Spinner, Flexbox } from "bluestar";
import { useAuth } from "./AuthContext";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <ThemeProvider>
      {isLoading ? (
        <Flexbox justifyContent="center" alignItems="center" height="100vh">
          <Spinner size={32} />
        </Flexbox>
      ) : isAuthenticated ? (
        <Dashboard />
      ) : (
        <Login />
      )}
    </ThemeProvider>
  );
}
