import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <div>
          <div className="hero-badge">
            <span>●</span>
            PRE-DISASTER RISK MONITORING PLATFORM
          </div>

          <h1>
            Know the Risk.
            <br />
            <span>Prepare Early.</span>
          </h1>

          <p className="hero-description">
            AEGIS monitors environmental conditions, analyzes potential
            flood risk using weather data, and provides early warning
            information to support disaster preparedness before a disaster
            occurs.
          </p>

          <div className="hero-actions">
            <Link to="/risk-monitoring" className="primary-btn">
              Start Risk Assessment →
            </Link>

            <Link to="/safety" className="secondary-btn">
              Safety Guidelines
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-circle">
            <div className="hero-circle-inner">
              <div className="hero-circle-icon">⚠</div>

              <strong>EARLY</strong>

              <span>RISK AWARENESS</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section">
        <div className="section-label">
          HOW AEGIS WORKS
        </div>

        <h2 className="section-title">
          From Environmental Data to Early Warning
        </h2>

        <p className="section-description">
          AEGIS combines weather information, predefined risk assessment
          rules, and GIS visualization to provide a preliminary assessment
          of potential environmental risk.
        </p>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>

            <div className="step-icon">📍</div>

            <h3>Select Location</h3>

            <p>
              Choose a city or location that you want to monitor for
              changing environmental conditions.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">02</div>

            <div className="step-icon">🌦️</div>

            <h3>Collect Weather Data</h3>

            <p>
              Weather information including rainfall, humidity and wind
              conditions is retrieved through an online weather API.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">03</div>

            <div className="step-icon">📊</div>

            <h3>Assess Risk</h3>

            <p>
              The collected environmental data is analyzed using
              predefined rule-based risk assessment criteria.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">04</div>

            <div className="step-icon">🚨</div>

            <h3>Early Warning</h3>

            <p>
              The resulting risk level is converted into an understandable
              warning with appropriate precautionary information.
            </p>
          </div>
        </div>
      </section>

      {/* PLATFORM SECTION */}
      <section className="info-section">
        <div className="info-grid">
          <div className="info-card">
            <div className="section-label">
              PRE-DISASTER APPROACH
            </div>

            <h2>Preparedness Starts With Awareness</h2>

            <p>
              Early identification of changing environmental conditions
              can help people understand potential risks and take
              preventive measures before a disaster occurs.
            </p>

            <Link to="/risk-monitoring" className="primary-btn">
              Monitor a Location →
            </Link>
          </div>

          <div className="info-card">
            <div className="section-label">
              RISK CLASSIFICATION
            </div>

            <h2>Understand the Risk Level</h2>

            <div className="risk-level-list">
              <div className="risk-level-item">
                <span className="risk-level-dot low"></span>

                <div>
                  <strong>Low Risk</strong>

                  <div>Normal environmental conditions</div>
                </div>
              </div>

              <div className="risk-level-item">
                <span className="risk-level-dot moderate"></span>

                <div>
                  <strong>Moderate Risk</strong>

                  <div>Stay alert and continue monitoring</div>
                </div>
              </div>

              <div className="risk-level-item">
                <span className="risk-level-dot high"></span>

                <div>
                  <strong>High Risk</strong>

                  <div>Take precautions and monitor official alerts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;