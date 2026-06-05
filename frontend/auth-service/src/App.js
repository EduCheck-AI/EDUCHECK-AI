import AuthPage from "./AuthPage";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AuthPage />
    </>
  );
}

export default App;