import React from "react";

function Alerts({ risk, location }) {

  // =====================================================
  // NO LOCATION / NO RISK DATA
  // =====================================================

  if (!location || !risk) {
    return (
      <main className="alerts-page">

        {/* PAGE HEADER */}

        <section className="page-hero">

          <span className="section-label">
            EARLY WARNING
          </span>

          <h1>
            Alerts & Warnings
          </h1>

          <p>
            Review potential environmental risk alerts
            generated from the selected monitoring location.
          </p>

        </section>


        {/* EMPTY STATE */}

        <section className="alerts-section">

          <div className="alerts-empty-card">

            <div className="alerts-empty-icon">
              🔔
            </div>

            <h2>
              No Active Alert
            </h2>

            <p>
              Select a location in Risk Monitoring to
              analyze environmental conditions and
              generate a potential risk alert.
            </p>


            <a
              href="/risk-monitoring"
              className="alert-action-button"
            >
              Go to Risk Monitoring
            </a>

          </div>

        </section>

      </main>
    );
  }


  // =====================================================
  // RISK-BASED ALERT
  // =====================================================

  const getAlertClass = () => {

    if (risk.level === "HIGH") {
      return "alert-high";
    }

    if (risk.level === "MODERATE") {
      return "alert-moderate";
    }

    return "alert-low";
  };


  const getAlertTitle = () => {

    if (risk.level === "HIGH") {
      return "High Risk Alert";
    }

    if (risk.level === "MODERATE") {
      return "Moderate Risk Advisory";
    }

    return "Low Risk — No Immediate Warning";
  };


  const getAlertIcon = () => {

    if (risk.level === "HIGH") {
      return "⚠️";
    }

    if (risk.level === "MODERATE") {
      return "🔔";
    }

    return "✓";
  };


  return (
    <main className="alerts-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <section className="page-hero">

        <span className="section-label">
          EARLY WARNING
        </span>

        <h1>
          Alerts & Warnings
        </h1>

        <p>
          Environmental risk alerts based on the
          latest monitoring assessment.
        </p>

      </section>


      {/* =================================================
          ALERT CONTENT
      ================================================= */}

      <section className="alerts-section">

        <div
          className={`alert-card ${getAlertClass()}`}
        >

          {/* ALERT HEADER */}

          <div className="alert-card-header">

            <div className="alert-icon">
              {getAlertIcon()}
            </div>

            <div>

              <span className="section-label">
                CURRENT ASSESSMENT
              </span>

              <h2>
                {getAlertTitle()}
              </h2>

            </div>

          </div>


          {/* LOCATION */}

          <div className="alert-location">

            <span>
              MONITORING LOCATION
            </span>

            <strong>
              {location.name}
              {location.admin1
                ? `, ${location.admin1}`
                : ""}
            </strong>

          </div>


          {/* MESSAGE */}

          <div className="alert-message">

            <p>
              {risk.message}
            </p>

          </div>


          {/* METRICS */}

          <div className="alert-metrics">

            <div>

              <span>
                RISK LEVEL
              </span>

              <strong>
                {risk.level}
              </strong>

            </div>


            <div>

              <span>
                RISK SCORE
              </span>

              <strong>
                {risk.score}
              </strong>

            </div>


            <div>

              <span>
                RAINFALL
              </span>

              <strong>
                {risk.totalRainfall} mm
              </strong>

            </div>


            <div>

              <span>
                RAIN PROBABILITY
              </span>

              <strong>
                {risk.maxRainProbability}%
              </strong>

            </div>

          </div>


          {/* EARLY WARNING */}

          <div className="early-warning-box">

            <div className="early-warning-icon">
              🛡️
            </div>

            <div>

              <h3>
                Early Preparedness
              </h3>

              <p>
                Continue monitoring environmental
                conditions and follow official
                disaster management advisories
                when issued.
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            PRECAUTIONS
        ================================================= */}

        {risk.precautions &&
          risk.precautions.length > 0 && (

          <div className="alert-precautions-card">

            <span className="section-label">
              PREPAREDNESS MEASURES
            </span>

            <h2>
              Recommended Actions
            </h2>

            <div className="alert-precautions-list">

              {risk.precautions.map(
                (precaution, index) => (

                  <div
                    className="alert-precaution-item"
                    key={index}
                  >

                    <span>
                      {index + 1}
                    </span>

                    <p>
                      {precaution}
                    </p>

                  </div>

                )
              )}

            </div>

          </div>

        )}

      </section>

    </main>
  );
}

export default Alerts;