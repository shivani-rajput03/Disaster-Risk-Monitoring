import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">A</div>

        <div>
          <div>AEGIS</div>
          <small>Environmental Risk Monitoring</small>
        </div>
      </div>

      <nav className="navbar-links">
        <NavLink to="/" end>
          Home
        </NavLink>

        <NavLink to="/risk-monitoring">
          Risk Monitoring
        </NavLink>

        <NavLink to="/alerts">
          Alerts
        </NavLink>

        <NavLink to="/safety">
          Safety
        </NavLink>
      </nav>
    </header>
  );
}

export default Navbar;