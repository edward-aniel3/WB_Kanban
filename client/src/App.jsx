import { BrowserRouter } from "react-router-dom";
import { message } from "antd";
import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./routes/AppRouter";

// Configure global message (toast)
message.config({
  duration: 3,
  maxCount: 3,
  top: 20,
});

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
