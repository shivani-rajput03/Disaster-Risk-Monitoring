import "./CapacityAssessment.css";

function CapacityAssessment({
  location,
  infrastructureData,
}) {
  if (!location) {
    return (
      <section className="capacity-card">
        <div className="capacity-empty">
          Complete a location search to assess emergency
          response capacity.
        </div>
      </section>
    );
  }

  if (!infrastructureData) {
    return (
      <section className="capacity-card">
        <div className="capacity-header">
          <div>
            <span className="section-label">
              CAPACITY ASSESSMENT
            </span>

            <h2>Emergency Response Capacity</h2>

            <p>
              Assessment of mapped emergency facilities
              and transport access that may support
              disaster response.
            </p>
          </div>

          <div className="capacity-icon">
            🚨
          </div>
        </div>

        <div className="capacity-unavailable">
          <span>⚠️</span>

          <div>
            <strong>
              Capacity data is temporarily unavailable
            </strong>

            <p>
              Emergency response capacity cannot be
              assessed because infrastructure data could
              not be retrieved for this location.
            </p>
          </div>
        </div>

        <div className="capacity-source">
          Data dependency: <strong>OpenStreetMap</strong>
        </div>
      </section>
    );
  }

  const hospitals =
    infrastructureData.hospitals?.length || 0;

  const fireStations =
    infrastructureData.fireStations?.length || 0;

  const roads =
    infrastructureData.roads?.length || 0;

  const totalEmergencyFacilities =
    hospitals + fireStations;

  const totalMappedResponseAssets =
    totalEmergencyFacilities + roads;

  return (
    <section className="capacity-card">

      <div className="capacity-header">
        <div>
          <span className="section-label">
            CAPACITY ASSESSMENT
          </span>

          <h2>Emergency Response Capacity</h2>

          <p>
            Mapped emergency facilities and transport
            infrastructure that may support flood response,
            evacuation and emergency access.
          </p>
        </div>

        <div className="capacity-icon">
          🚨
        </div>
      </div>

      <div className="capacity-summary">

        <div className="capacity-stat">
          <span>MEDICAL FACILITIES</span>

          <strong>{hospitals}</strong>

          <small>
            mapped hospitals
          </small>
        </div>

        <div className="capacity-stat">
          <span>FIRE / RESCUE</span>

          <strong>{fireStations}</strong>

          <small>
            mapped fire stations
          </small>
        </div>

        <div className="capacity-stat">
          <span>EMERGENCY ACCESS</span>

          <strong>{roads}</strong>

          <small>
            major road features
          </small>
        </div>

        <div className="capacity-stat">
          <span>RESPONSE ASSETS</span>

          <strong>
            {totalMappedResponseAssets}
          </strong>

          <small>
            mapped facilities and roads
          </small>
        </div>

      </div>

      <div className="capacity-grid">

        <div className="capacity-item">
          <div className="capacity-item-icon">
            🏥
          </div>

          <div>
            <strong>
              Medical Response
            </strong>

            <span>
              {hospitals} hospitals mapped
            </span>
          </div>
        </div>

        <div className="capacity-item">
          <div className="capacity-item-icon">
            🚒
          </div>

          <div>
            <strong>
              Fire & Rescue
            </strong>

            <span>
              {fireStations} fire stations mapped
            </span>
          </div>
        </div>

        <div className="capacity-item">
          <div className="capacity-item-icon">
            🛣️
          </div>

          <div>
            <strong>
              Emergency Access
            </strong>

            <span>
              {roads} major road features mapped
            </span>
          </div>
        </div>

        <div className="capacity-item">
          <div className="capacity-item-icon">
            📍
          </div>

          <div>
            <strong>
              Response Resources
            </strong>

            <span>
              {totalEmergencyFacilities} emergency
              facilities mapped
            </span>
          </div>
        </div>

      </div>

      <div className="capacity-indicator">

        <div className="capacity-indicator-title">
          <span>
            RESPONSE CAPACITY INDICATOR
          </span>

          <strong>
            MAPPED RESOURCES AVAILABLE
          </strong>
        </div>

        <p>
          Emergency facilities and road infrastructure
          have been identified around the monitoring
          location and may support emergency response
          and evacuation activities.
        </p>

      </div>

      <div className="capacity-note">
        <span>ⓘ</span>

        <p>
          This assessment represents the presence of
          mapped response resources. It does not confirm
          operational availability, staffing, equipment,
          road accessibility during flooding, hospital
          capacity or actual emergency response time.
        </p>
      </div>

      <div className="capacity-source">
        Data Source: <strong>OpenStreetMap</strong>
      </div>

    </section>
  );
}

export default CapacityAssessment;