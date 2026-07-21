import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import FloatingOrderButton from "./components/FloatingOrderButton";
import Homepage from "./pages/Homepage";
import CatalogPage from "./pages/CatalogPage";
import Trackdelivery from "./pages/TrackOrderPage";
import Order from "./pages/OrderPage";
import AdminPage from "./pages/AdminPage";
import SupportPage from "./pages/SupportPage";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/order" element={<Order />} />
          <Route path="/delivery" element={<Trackdelivery />} />
          <Route path="/track" element={<Trackdelivery />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/support" element={<SupportPage />} />
        </Routes>
      </main>

      <>
  <ScrollToTop />

  <Routes>
    {/* your existing routes remain here */}
  </Routes>

  <Footer />
</>
    </div>
  );
}

export default App;