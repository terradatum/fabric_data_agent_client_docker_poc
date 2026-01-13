import React from "react";
import { HelixIcon } from "@helix/helix-icon";
import { wolfie } from "@helix/helix-icon/outlined";
import styles from "./SidebarNav.module.scss";

interface TopbarProps {
  children?: React.ReactNode;
}

const Topbar = ({ children }: TopbarProps) => {
  return (
    <div className={styles.topbar}>
      <div className="helix-d-flex helix-align--center helix-gap-2">
        <HelixIcon
          icon={wolfie}
          className="helix-svg-fill--helix-brand"
          style={{ width: "32px", height: "32px" }}
        />
        <span>LWAI</span>
      </div>
      {children}
    </div>
  );
};

export default Topbar;
