function Safety() {
  return (
    <div className="page">
      <section className="page-header">
        <span>DISASTER PREPAREDNESS</span>
        <h1>Safety Guidelines</h1>
        <p>
          Important precautionary measures to follow before a potential flood
          or other disaster.
        </p>
      </section>

      <section className="safety-section">
        <div className="safety-grid">
          <div className="safety-card">
            <div className="safety-icon">📋</div>
            <h2>Prepare an Emergency Plan</h2>
            <p>
              Keep a basic emergency plan for your family and identify safe
              places and evacuation routes in advance.
            </p>
          </div>

          <div className="safety-card">
            <div className="safety-icon">🎒</div>
            <h2>Prepare an Emergency Kit</h2>
            <p>
              Keep drinking water, basic food, medicines, a flashlight,
              batteries, important documents and other essential items ready.
            </p>
          </div>

          <div className="safety-card">
            <div className="safety-icon">📱</div>
            <h2>Stay Informed</h2>
            <p>
              Monitor official weather and disaster management announcements
              and pay attention to early warning messages.
            </p>
          </div>

          <div className="safety-card">
            <div className="safety-icon">🏠</div>
            <h2>Protect Your Home</h2>
            <p>
              Keep drainage areas clear and move important belongings to safer
              locations if flooding is expected.
            </p>
          </div>

          <div className="safety-card">
            <div className="safety-icon">🚶</div>
            <h2>Know Evacuation Routes</h2>
            <p>
              Identify nearby safe locations and understand the safest route
              to reach them if evacuation becomes necessary.
            </p>
          </div>

          <div className="safety-card">
            <div className="safety-icon">📞</div>
            <h2>Keep Emergency Contacts</h2>
            <p>
              Maintain important emergency contact numbers and communicate
              your preparedness plan with family members.
            </p>
          </div>
        </div>

        <div className="safety-bottom">
          <h2>Remember</h2>
          <p>
            Early awareness and preparedness can reduce the impact of a
            disaster. Always follow instructions from official disaster
            management and emergency authorities.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Safety;