import React from "react";
import styles from "./SidebarNav.module.scss";

interface TopbarProps {
  children?: React.ReactNode;
}
const Topbar = ({ children }: TopbarProps) => {
  return <div className={styles.topbar}>{children}</div>;
};

export default Topbar;
