import React from "react";

const LoadingSpinner = ({ message = "Chargement..." }) => (
  <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4">
    <div className="w-10 h-10 rounded-full border-4 border-stone-200 border-t-blue-500 animate-spin" />
    <p className="text-sm font-medium text-stone-500">{message}</p>
  </div>
);

export default LoadingSpinner;