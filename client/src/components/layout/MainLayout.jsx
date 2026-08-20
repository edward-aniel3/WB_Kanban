import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Drawer } from "antd";
import Header from "./Header";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  const handleCloseMobile = () => {
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar collapsed={collapsed} onToggle={handleToggleSidebar} />
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileOpen}
          onClose={handleCloseMobile}
          width={240}
          styles={{ body: { padding: 0, backgroundColor: "#1E3A5F" } }}
          closable={false}
        >
          <Sidebar collapsed={false} onToggle={handleCloseMobile} />
        </Drawer>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          onToggleSidebar={handleToggleSidebar}
          isMobile={isMobile}
        />

        {/* Content */}
        <main
          className="
            flex-1 overflow-auto
            bg-surface p-6
            mt-[60px]
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
