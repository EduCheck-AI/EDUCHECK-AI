// frontend/exam-service/src/components/ExternalRedirect.jsx

import { useEffect } from "react";

export default function ExternalRedirect({ to }) {
  useEffect(() => {
    window.location.href = to;
  }, [to]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          Redirection vers la page de connexion...
        </p>
      </div>
    </div>
  );
}
