import { useState } from "react";
import styles from "./SidebarNav.module.scss";
import { HelixIcon } from "@helix/helix-icon";
import {
  signature,
  home,
  funnel_person,
  cog,
  line_chart,
  arrows_exchange,
  plus,
  robot,
  chevron_small_right,
  wolfie,
} from "@helix/helix-icon/outlined";
import { Tooltip } from "@helix/tooltip";

const menuItems = [
  {
    id: "foundation",
    text: "Foundation",
    icon: "home",
    active: true,
    links: [
      {
        id: "dashboard",
        text: "Dashboard",
        url: "/foundation/dashboard",
        active: true,
      },
      {
        id: "contacts",
        text: "Contacts",
        url: "/foundation/contacts",
      },
      {
        id: "tasks",
        text: "Tasks",
        count: 10,
        url: "/foundation/tasks",
      },
      {
        id: "calendar",
        text: "Calendar",
        url: "/foundation/calendar",
      },
      {
        id: "automations",
        text: "Automations",
        url: "/foundation/automations",
      },
    ],
  },
  {
    id: "LWAI",
    text: "LWAI",
    icon: "robot",
    active: false,
    links: [
      {
        id: "chat",
        text: "Chat",
        url: "/",
      },
      {
        id: "charts",
        text: "Charts",
        url: "/charts",
      },
    ],
  },
  {
    id: "brokermetrics",
    text: "Brokermetrics",
    icon: "line-chart",
    active: false,
    links: [
      {
        id: "analytics",
        text: "Analytics",
        url: "#",
      },
      {
        id: "reports",
        text: "Reports",
        url: "#",
      },
    ],
  },
  {
    id: "authentisign",
    text: "Authentisign",
    icon: "signature",
    active: false,
    links: [
      {
        id: "documents",
        text: "Documents",
        url: "#",
      },
      {
        id: "signatures",
        text: "Signatures",
        url: "#",
      },
    ],
  },
  {
    id: "transact",
    text: "Transact",
    icon: "exchange-alt",
    active: false,
    links: [
      {
        id: "transactions",
        text: "Transactions",
        url: "#",
      },
      {
        id: "history",
        text: "History",
        url: "#",
      },
    ],
  },
  {
    id: "relationships",
    text: "Relationships",
    icon: "funnel-person",
    active: false,
    links: [
      {
        id: "clients",
        text: "Clients",
        url: "#",
      },
      {
        id: "prospects",
        text: "Prospects",
        url: "#",
      },
    ],
  },
  {
    id: "apps",
    text: "Apps",
    icon: "plus",
    active: false,
  },
];

const SidebarNav = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState("LWAI");
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getDisplayedMenuItem = () => {
    if (hoveredMenuItem) {
      return menuItems.find((item) => item.id === hoveredMenuItem);
    }
    return menuItems.find((item) => item.id === activeMenuItem);
  };

  const handleMenuItemHover = (itemId: string) => {
    if (itemId === "apps") return;
    setHoveredMenuItem(itemId);
  };

  const handleMenuItemLeave = () => {
    setHoveredMenuItem(null);
  };

  const handleMenuItemClick = (itemId: string) => {
    if (itemId === "apps") return;
    setActiveMenuItem(itemId);
    setHoveredMenuItem(null);
  };

  const displayedMenuItem = getDisplayedMenuItem();

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "signature":
        return signature;
      case "home":
        return home;
      case "funnel-person":
        return funnel_person;
      case "cog":
        return cog;
      case "line-chart":
        return line_chart;
      case "exchange-alt":
        return arrows_exchange;
      case "plus":
        return plus;
      case "robot":
        return robot;
      default:
        return null;
    }
  };
  return (
    <div
      className={`${styles["sidebar-nav-container"]} ${
        isCollapsed ? styles["sidebar-nav-container--collapsed"] : ""
      }`}
      style={{
        position: "relative",
      }}
    >
      <div className={styles["sidebar-nav"]}>
        <div className={styles["sidebar-nav__header"]}>
          <div
            className={`${styles["sidebar-nav__header__content"]} ${
              isCollapsed ? styles["collapsed"] : ""
            }`}
          >
            <div className='helix-d-flex helix-align--center helix-gap-2'>
              <HelixIcon
                icon={wolfie}
                className='helix-svg-fill--helix-brand'
                style={{
                  width: "32px",
                  height: "32px",
                }}
              />
              {!isCollapsed && <>LWAI</>}
            </div>
          </div>
        </div>
        <div className={styles["sidebar-nav__panels"]}>
          <div
            className={styles["sidebar-nav__main"]}
            onMouseLeave={handleMenuItemLeave}
          >
            {menuItems.map((item) => {
              const IconComponent = getIconComponent(item.icon);
              // active if the url matches the current location in the url bar
              return (
                <>
                  <button
                    id={item.id}
                    key={item.id}
                    className={`${styles["sidebar-nav__item"]} ${
                      item.id === activeMenuItem
                        ? styles["sidebar-nav__item--active"]
                        : ""
                    } ${
                      item.id === "apps"
                        ? styles["sidebar-nav__item--apps"]
                        : ""
                    }`}
                    title={isCollapsed ? item.text : ""}
                    onMouseEnter={() => handleMenuItemHover(item.id)}
                    onClick={() => handleMenuItemClick(item.id)}
                  >
                    {IconComponent && (
                      <HelixIcon
                        icon={IconComponent}
                        className={styles["sidebar-nav__item__icon"]}
                      />
                    )}
                  </button>
                  {isCollapsed && (
                    <Tooltip target={item.id} placement='right'>
                      <span>{item.text} </span>
                    </Tooltip>
                  )}
                </>
              );
            })}
          </div>
          <div className={styles["sidebar-nav__secondary"]}>
            <div className={styles["sidebar-nav__secondary__header"]}>
              <div className={styles["sidebar-nav__secondary__header__title"]}>
                {displayedMenuItem?.text || "Menu"}
              </div>
            </div>
            <div className={styles["sidebar-nav__links"]}>
              {displayedMenuItem?.links?.map((link) => {
                // get the url and if the url matches the current location
                const isActive = link.url === window.location.pathname;
                link.active = isActive;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    className={`${styles["sidebar-nav__link"]} ${
                      link.active ? styles["sidebar-nav__link--active"] : ""
                    }`}
                  >
                    {link.text}
                    {link.count && (
                      <span className={styles["sidebar-nav__link__count"]}>
                        {link.count}
                      </span>
                    )}
                  </a>
                );
              }) || []}
            </div>
          </div>
        </div>
      </div>
      <button
        className='Close'
        onClick={toggleCollapsed}
        style={{
          cursor: "pointer",
          position: "absolute",
          top: 80,
          right: -12,
          background: "white",
          border: "solid 1px #ccc",
          borderRadius: "50%",
          width: "24px",
          height: "24px",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <HelixIcon
          icon={chevron_small_right}
          className='helix-flex-shrink--0'
        />
      </button>
    </div>
  );
};

export default SidebarNav;
