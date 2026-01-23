import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './MainLayout.scss';

const MainLayout = () => {
  return (
    <div className="main-layout">
      <Header />
      <div className="main-layout__container">
        <Sidebar />
        <main className="main-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
