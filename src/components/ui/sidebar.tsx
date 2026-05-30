import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface SidebarNavItem {
  title: string;
  icon?: React.ReactNode;
  href?: string;
  badge?: string | number;
  items?: SidebarSubNavItem[];
  onClick?: () => void;
}

export interface SidebarSubNavItem {
  title: string;
  href?: string;
  badge?: string | number;
  onClick?: () => void;
}

interface SidebarProps {
  items: SidebarNavItem[];
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  activeItem?: string;
  logo?: React.ReactNode;
  logoIcon?: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
}

interface SidebarContextProps {
  collapsed: boolean;
  activeItem: string;
  setActiveItem: (item: string) => void;
}

const SidebarContext = React.createContext<SidebarContextProps>({
  collapsed: false,
  activeItem: "",
  setActiveItem: () => {},
});

export function Sidebar({
  items,
  collapsed = false,
  onCollapsedChange,
  className,
  activeItem: controlledActiveItem,
  logo,
  logoIcon,
  footer,
  headerAction,
}: SidebarProps) {
  const [internalActiveItem, setInternalActiveItem] = React.useState("");
  const [isLogoHovered, setIsLogoHovered] = React.useState(false);
  const activeItem = controlledActiveItem ?? internalActiveItem;

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        activeItem,
        setActiveItem: setInternalActiveItem,
      }}
    >
      <aside
        className={cn(
          "flex h-screen flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className,
        )}
      >
        {/* Logo */}
        {(logo || logoIcon) && (
          <div
            className={cn(
              "flex h-16 items-center",
              collapsed ? "justify-center px-2" : "justify-between px-4",
            )}
          >
            {collapsed ? (
              <button
                className={cn(
                  "group flex cursor-pointer items-center justify-center rounded-lg p-2 transition-all duration-200",
                  isLogoHovered && "bg-primary/10",
                )}
                onClick={() => onCollapsedChange?.(false)}
                onMouseEnter={() => setIsLogoHovered(true)}
                onMouseLeave={() => setIsLogoHovered(false)}
                title="Expand sidebar"
              >
                {isLogoHovered ? (
                  <ChevronsRight className="h-5 w-5 text-primary" />
                ) : (
                  logoIcon || logo
                )}
              </button>
            ) : (
              <>
                {logo}
                {headerAction}
              </>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="space-y-1">
            {items.map((item, index) => (
              <SidebarNavItem key={index} item={item} />
            ))}
          </div>
        </nav>

        {/* Footer */}
        {footer && <div className="p-4">{footer}</div>}
      </aside>
    </SidebarContext.Provider>
  );
}

function SidebarNavItem({ item }: { item: SidebarNavItem }) {
  const { collapsed, activeItem, setActiveItem } =
    React.useContext(SidebarContext);
  const navigate = useNavigate();
  const location = useLocation();
  const hasSubItems = item.items && item.items.length > 0;

  // Check if current path matches this item or any of its sub-items
  const isItemActive = item.href === location.pathname;
  const hasActiveChild =
    hasSubItems &&
    item.items?.some((subItem) => subItem.href === location.pathname);
  // Only highlight if item is active AND doesn't have children, or if explicitly set as active
  const isActive = hasSubItems
    ? false
    : isItemActive || activeItem === item.title;

  // Keep parent open if any child is active
  const [isOpen, setIsOpen] = React.useState(hasActiveChild || false);

  // Update isOpen when location changes and a child becomes active
  React.useEffect(() => {
    if (hasActiveChild) {
      setIsOpen(true);
    }
  }, [hasActiveChild]);

  const handleClick = () => {
    if (hasSubItems) {
      setIsOpen(!isOpen);
    }

    // Use onClick if provided, otherwise navigate to href if provided
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      navigate(item.href);
    }

    // Only set as active if it doesn't have subitems
    if (!hasSubItems) {
      setActiveItem(item.title);
    }
  };

  // Clone the icon and pass the active prop
  // For parent items with children, use hasActiveChild to determine icon color
  const iconWithActiveState =
    item.icon && React.isValidElement(item.icon)
      ? React.cloneElement(item.icon as React.ReactElement, {
          active: isActive || hasActiveChild,
        })
      : item.icon;

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "group relative flex w-full items-center gap-3 py-2.5 text-sm transition-all duration-300 ease-in-out",
          collapsed ? "justify-center px-2" : "px-3 rounded-md",
          isActive
            ? "font-semibold text-primary"
            : hasActiveChild
              ? "font-semibold text-primary"
              : "font-medium text-muted-foreground/70 hover:text-primary",
        )}
      >
        {item.icon && (
          <span
            className={cn(
              "flex-shrink-0",
              collapsed ? "text-lg" : "",
              isActive || hasActiveChild
                ? "text-primary"
                : "text-muted-foreground/60",
            )}
          >
            {iconWithActiveState}
          </span>
        )}
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.title}</span>
            {item.badge && (
              <Badge
                variant={isActive ? "default" : "muted"}
                className={cn(
                  "transition-colors duration-300 ease-in-out",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                    : "group-hover:bg-primary/10 group-hover:text-primary",
                )}
              >
                {item.badge}
              </Badge>
            )}
            {hasSubItems && (
              <span className="flex-shrink-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
            )}
          </>
        )}
      </button>

      {/* Sub Navigation */}
      {hasSubItems && isOpen && !collapsed && (
        <div className="relative ml-9">
          {/* Continuous left border line for children */}
          <span className="absolute -left-3 top-0 h-full w-0.5 bg-border" />

          {item.items?.map((subItem, index) => (
            <SidebarSubNavItem
              key={index}
              item={subItem}
              parentTitle={item.title}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarSubNavItem({
  item,
  parentTitle,
}: {
  item: SidebarSubNavItem;
  parentTitle: string;
}) {
  const { activeItem, setActiveItem } = React.useContext(SidebarContext);
  const navigate = useNavigate();
  const location = useLocation();
  const itemKey = `${parentTitle}-${item.title}`;

  // Check if this sub-item is active based on current path
  const isPathActive = item.href === location.pathname;
  const isActive = isPathActive || activeItem === itemKey;

  const handleClick = () => {
    // Use onClick if provided, otherwise navigate to href if provided
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      navigate(item.href);
    }
    setActiveItem(itemKey);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group relative z-10 flex w-full items-center gap-3 px-3 py-2 text-sm transition-all duration-300 ease-in-out",
        isActive
          ? "font-semibold text-primary"
          : "font-normal text-muted-foreground hover:text-primary",
      )}
    >
      {/* Left border indicator - overlays on the continuous line when active/hover */}
      <span
        className={cn(
          "absolute -left-3 top-0 h-full transition-all duration-300 ease-in-out",
          isActive
            ? "w-0.5 bg-primary"
            : "w-0 group-hover:w-0.5 group-hover:bg-primary",
        )}
      />

      <span className="flex-1 text-left">{item.title}</span>
      {item.badge && (
        <Badge
          variant={isActive ? "outline-primary" : "muted"}
          className={cn(
            "transition-colors duration-300 ease-in-out",
            isActive
              ? "border-primary/30 bg-primary/5"
              : "group-hover:bg-primary/10 group-hover:text-primary",
          )}
        >
          {item.badge}
        </Badge>
      )}
    </button>
  );
}

export { SidebarNavItem, SidebarSubNavItem };
