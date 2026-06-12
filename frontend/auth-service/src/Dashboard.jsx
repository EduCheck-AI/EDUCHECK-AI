import Sidebar from "./components/Sidebare";

function Dashbord() {
  const userName = localStorage.getItem("userName");

  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Content */}
      <div style={{ flex: 1, padding: "20px" }}>
        <h1> Bonjour</h1>
        <p>Welcome {userName}</p>
      </div>
    </div>
  );
}

export default Dashbord;
