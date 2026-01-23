import { NavLink } from 'react-router-dom';
import './Sidebar.scss';

const Sidebar = () => {
  const menuItems = [
    { path: '/dashboard', label: '대시보드', icon: '🏠' },
    { path: '/groups', label: '내 모임', icon: '👥' },
    { path: '/settings', label: '설정', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span className="sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
