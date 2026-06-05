import React from "react";

const LoadingSpinner = ({ message = "Chargement..." }) => (
  <div className="loading-container">
    <div className="spinner" />
    <p>{message}</p>
  </div>
);

export default LoadingSpinner;
