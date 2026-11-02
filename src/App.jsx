import { BrowserRouter, Routes, Route } from "react-router-dom";

import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Farms from "./pages/Farms";
import Weather from "./pages/Weather";
import Monitoring from "./pages/Monitoring";
import YieldPrediction from "./pages/YieldPrediction";
import DiseaseDetection from "./pages/DiseaseDetection";
import Recommendations from "./pages/Recommendations";
import AddFarm from "./pages/AddFarm";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Simulation from "./pages/Simulation";
import CropRecommendation from "./pages/CropRecommendation";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Main starting page */}
        <Route path="/" element={<Splash />} />

        {/* Login page */}
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/farms" element={<Farms />} />

        <Route path="/weather" element={<Weather />} />

        <Route path="/monitoring" element={<Monitoring />} />

        <Route path="/yield-prediction" element={<YieldPrediction />} />

        <Route path="/disease-detection" element={<DiseaseDetection />} />

        <Route path="/recommendations" element={<Recommendations />} />

        <Route path="/add-farm" element={<AddFarm />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/register" element={<Register />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/simulation" element={<Simulation />} />

        <Route
  path="/crop-recommendation"
  element={<CropRecommendation />}
/>

      </Routes>
    </BrowserRouter>
  );
}

export default App;