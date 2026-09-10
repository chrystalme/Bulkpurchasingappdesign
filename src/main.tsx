import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import App from "./App.tsx";
import { store, persistor } from "./store/store.ts";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/errors/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <AuthProvider>
        <ErrorBoundary label="app-root">
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </PersistGate>
  </Provider>
);
  