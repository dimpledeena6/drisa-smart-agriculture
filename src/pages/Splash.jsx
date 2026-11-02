import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/splash.css";

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="splash-screen">

      {/* Sun / warm natural light */}
      <div className="sun-glow"></div>

      {/* Soft light particles */}
      <div className="light light-1"></div>
      <div className="light light-2"></div>
      <div className="light light-3"></div>
      <div className="light light-4"></div>
      <div className="light light-5"></div>

      {/* Background leaves */}
      <div className="leaf leaf-1"></div>
      <div className="leaf leaf-2"></div>
      <div className="leaf leaf-3"></div>
      <div className="leaf leaf-4"></div>
      <div className="leaf leaf-5"></div>
      <div className="leaf leaf-6"></div>
      <div className="leaf leaf-7"></div>
      <div className="leaf leaf-8"></div>
      <div className="leaf leaf-9"></div>
      <div className="leaf leaf-10"></div>

      {/* Main DRISA content */}
      <section className="splash-content">

        <div className="logo-area">

          <div className="logo-glow"></div>

          <div className="logo-halo"></div>

          <img
            src="/src/assets/drisa-logo.png"
            alt="DRISA"
            className="splash-logo"
          />

        </div>

        <div className="splash-text">

  <h1>Smart Farming</h1>

  <h2>Better Decisions</h2>

  <p>AI-POWERED SMART AGRICULTURE</p>

</div>

        <div className="splash-loader">
          <span></span>
          <span></span>
          <span></span>
        </div>

      </section>

      {/* Agricultural landscape */}
      <div className="landscape">

  <div className="field field-back"></div>

  <div className="field field-light"></div>

  <div className="field field-lime"></div>

  <div className="field field-green"></div>

  <div className="field field-dark"></div>

  <div className="field-sweep sweep-1"></div>

  <div className="field-sweep sweep-2"></div>

  <div className="field-sweep sweep-3"></div>

  <div className="field-sweep sweep-4"></div>

  {/* Soft foreground vegetation */}

  <div className="foreground-blur foreground-left"></div>

  <div className="foreground-blur foreground-right"></div>

  <div className="foreground-leaf foreground-leaf-1"></div>

  <div className="foreground-leaf foreground-leaf-2"></div>

  <div className="foreground-leaf foreground-leaf-3"></div>

  <div className="bokeh bokeh-1"></div>

  <div className="bokeh bokeh-2"></div>

  <div className="bokeh bokeh-3"></div>

</div>

    </main>
  );
}

export default Splash;