import React from 'react';
import { NavLink } from 'react-router-dom';

function Navigation() {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <NavLink to="/">Home</NavLink>
          </li>
          <li>
            <NavLink to="/Details">Details</NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Navigation;
