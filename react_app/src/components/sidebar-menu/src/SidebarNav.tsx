import React, { useState } from "react";
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
  drawer_close,
  drawer_open,
} from "@helix/helix-icon/outlined";
import { Tooltip } from "@helix/tooltip";

interface SidebarNavProps {
  // Add props as needed
}

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
    id: "brokermetrics",
    text: "Brokermetrics",
    icon: "line-chart",
    active: false,
    links: [
      {
        id: "analytics",
        text: "Analytics",
        url: "/brokermetrics/analytics",
      },
      {
        id: "reports",
        text: "Reports",
        url: "/brokermetrics/reports",
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
        url: "/authentisign/documents",
      },
      {
        id: "signatures",
        text: "Signatures",
        url: "/authentisign/signatures",
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
        url: "/transact/transactions",
      },
      {
        id: "history",
        text: "History",
        url: "/transact/history",
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
        url: "/relationships/clients",
      },
      {
        id: "prospects",
        text: "Prospects",
        url: "/relationships/prospects",
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

const clients = [
  {
    id: "emma-mckenna",
    name: "Emma McKenna",
    logo: "https://assets.lwolf.com/img/lw-logo.png",
  },
  {
    id: "john-doe",
    name: "John Doe",
    logo: "https://assets.lwolf.com/img/lw-logo.png",
  },
  {
    id: "jane-smith",
    name: "Jane Smith",
    logo: "https://assets.lwolf.com/img/lw-logo.png",
  },
  {
    id: "acme-corp",
    name: "ACME Corporation",
    logo: "https://assets.lwolf.com/img/lw-logo.png",
  },
];

const SidebarNav: React.FC<SidebarNavProps> = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState("foundation");
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);
  const [currentClient, setCurrentClient] = useState(clients[0]);

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

  const handleClientSelect = (client: {
    id: string;
    name: string;
    logo?: string;
  }) => {
    setCurrentClient(client as (typeof clients)[0]);
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
      default:
        return null;
    }
  };
  return (
    <div
      className={`${styles["sidebar-nav-container"]} ${
        isCollapsed ? styles["sidebar-nav-container--collapsed"] : ""
      }`}
    >
      <div className={styles["sidebar-nav"]}>
        <div className={styles["sidebar-nav__header"]}>
          <div
            className={`${styles["sidebar-nav__header__content"]} ${
              isCollapsed ? styles["collapsed"] : ""
            }`}
          >
            <button
              className={styles["sidebar-nav__header__collapse"]}
              onClick={toggleCollapsed}
            >
              <HelixIcon
                icon={isCollapsed ? drawer_open : drawer_close}
                className={styles["sidebar-nav__header__collapse__icon"]}
              />
            </button>
          </div>
        </div>
        <div className={styles["sidebar-nav__panels"]}>
          <div
            className={styles["sidebar-nav__main"]}
            onMouseLeave={handleMenuItemLeave}
          >
            {menuItems.map((item) => {
              const IconComponent = getIconComponent(item.icon);
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
              {displayedMenuItem?.links?.map((link) => (
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
              )) || []}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarNav;
