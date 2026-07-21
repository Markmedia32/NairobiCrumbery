import { Link, useLocation } from 'react-router-dom';

function FloatingOrderButton() {
  const location = useLocation();
  if (location.pathname === '/order') return null;

  return (
    <Link to="/order" className="floating-order-btn">
      Order Now
    </Link>
  );
}

export default FloatingOrderButton;