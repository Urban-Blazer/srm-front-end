"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ConnectButton } from "@mysten/dapp-kit";
import { usePathname } from "next/navigation";

// Estilos globales para animaciones
const globalStyles = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-slideIn {
    animation: slideIn 0.3s ease-out forwards;
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out forwards;
  }
`;

// Navigation data structure
const NAVIGATION_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard/my-royalties",
    submenu: [
      {
        id: "royalties",
        label: "My Royalties",
        path: "/dashboard/my-royalties",
      },
    ],
  },
  {
    id: "swap",
    label: "SWAP",
    path: "/swap/sui/srm",
    external: false,
  },
  {
    id: "pools",
    label: "POOLS",
    path: "/pools",
    submenu: [
      { id: "stats", label: "Pool Stats", path: "/pools" },
      { id: "positions", label: "My Positions", path: "/pools/my-positions" },
      { id: "create-pool", label: "Create Pool", path: "/pools/create-pool" },
      {
        id: "add-liquidity",
        label: "Add Liquidity",
        path: "/pools/add-liquidity",
      },
      {
        id: "burn-liquidity",
        label: "Burn Liquidity",
        path: "/pools/burn-liquidity",
      },
    ],
  },
  {
    id: "launchpad",
    label: "APPLY TO LAUNCH",
    path: "https://form.typeform.com/to/wbCfCQeb",
    external: true,
  },
  {
    id: "info",
    label: "INFO",
    path: "/info",
    submenu: [
      {
        id: "about",
        label: "About SRM",
        path: "https://suirewards.me/",
        external: true,
      },
      {
        id: "medium",
        label: "Medium",
        path: "https://medium.com/@suirewardsme/introducing-sui-rewards-me-the-worlds-first-rewards-dex-on-the-sui-blockchain-76e6832f140d",
        external: true,
      },
      {
        id: "dex-audit",
        label: "SRM Dex Audit",
        path: "/docs/SuiRewardsMe_DEX.pdf",
        external: true,
      },
      {
        id: "coin-audit",
        label: "SRM Coin Audit",
        path: "/docs/SuiRewardsMe_SRM.pdf",
        external: true,
      },
    ],
  },
];

const EXTERNAL_LINKS = [
  {
    id: "bridge-link",
    label: "BRIDGE",
    path: "https://bridge.sui.io/",
    external: true,
  },
];

// Link component with error handling
interface NavLinkProps {
  href: string;
  external?: boolean;
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const NavLink: React.FC<NavLinkProps> = ({
  href,
  external,
  onClick,
  className,
  children,
  style,
}) => {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
        style={style}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick} style={style}>
      {children}
    </Link>
  );
};

// Define submenu item type to properly handle external links
interface SubmenuItem {
  id: string;
  label: string;
  path: string;
  external?: boolean;
}

// Dropdown menu component
interface DropdownProps {
  menu: {
    id: string;
    label: string;
    path: string;
    submenu?: SubmenuItem[];
  };
  isMobile?: boolean;
  onLinkClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// Hook personalizado para detectar cambios de tamaño de pantalla
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Configurar listener
    window.addEventListener("resize", handleResize);

    // Llamar al handler inicialmente
    handleResize();

    // Limpiar al desmontar
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Array vacío significa que este useEffect se ejecuta una vez al montar

  return windowSize;
};

// Hook personalizado para caché en localStorage
const useLocalStorage = <T,>(key: string, initialValue: T) => {
  // Estado para almacenar nuestro valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      // Obtener del localStorage por clave
      const item = window.localStorage.getItem(key);
      // Parse JSON almacenado o retornar initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Si hay error retornar initialValue
      console.error(error);
      return initialValue;
    }
  });

  // Retornar una versión wrapper de la función setter de useState
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Permitir que el valor sea una función para que tengamos la misma API que useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Guardar estado
      setStoredValue(valueToStore);
      // Guardar en localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
};

const Dropdown: React.FC<DropdownProps> = ({
  menu,
  isMobile = false,
  onLinkClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  // Classes based on mobile or desktop view
  const dropdownClasses = isMobile
    ? "bg-white text-black p-2 rounded w-full"
    : "absolute left-0 mt-2 p-2 bg-slate-900 text-white rounded shadow-md w-40 z-50";

  const linkClasses = isMobile
    ? "block px-4 py-2 hover:bg-softMint"
    : "block px-4 py-2 text-white hover:bg-slate-200 hover:text-black";

  return (
    <div
      className={`${dropdownClasses} animate-slideIn`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {menu.submenu?.map((item, index) => (
        <NavLink
          key={item.id}
          href={item.path}
          external={item.external}
          className={`${linkClasses}`}
          onClick={onLinkClick}
          style={{
            animationDelay: `${index * 50}ms`,
            opacity: 0,
            animation: `slideIn 0.3s ease-out forwards ${index * 50}ms`,
          }}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
};

export default function NavBar() {
  // Utilizar caché para almacenar el estado del menú
  const [activeDropdown, setActiveDropdown] = useLocalStorage<string | null>(
    "navbar_active_dropdown",
    null
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const { width } = useWindowSize(); // Hook para detectar cambios en el tamaño de la pantalla
  const pathname = usePathname(); // Hook para obtener la ruta actual
  const prevPathRef = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Agregar estilos globales una vez
  useEffect(() => {
    // Comprobar si los estilos ya están agregados
    const existingStyle = document.getElementById("navbar-animation-styles");

    if (!existingStyle) {
      const styleElement = document.createElement("style");
      styleElement.id = "navbar-animation-styles";
      styleElement.textContent = globalStyles;
      document.head.appendChild(styleElement);

      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, []);

  // Cerrar el menú móvil y dropdown cuando cambia la ruta
  useEffect(() => {
    if (prevPathRef.current && prevPathRef.current !== pathname) {
      setIsMobileMenuOpen(false);
      setActiveDropdown(null);
    }
    prevPathRef.current = pathname;
  }, [pathname, setActiveDropdown]);

  // Cerrar el menú si el ancho de la pantalla cambia a desktop
  useEffect(() => {
    if (width && width > 768 && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [width, isMobileMenuOpen]);

  // Cerrar dropdown al hacer clic fuera del menú
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setActiveDropdown]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);

  const toggleDropdown = useCallback(
    (menuId: string) => {
      // Este enfoque garantiza que siempre se abra un nuevo menú cuando se clica
      // y solo se cierra si se vuelve a hacer clic en el mismo menú
      setActiveDropdown((prevDropdown) => {
        // Si es el mismo menú que estaba activo, lo cerramos
        if (prevDropdown === menuId) {
          return null;
        }
        // Si es un menú diferente o no había menú activo, lo abrimos
        return menuId;
      });
    },
    [setActiveDropdown]
  );

  const openDropdown = useCallback(
    (menuId: string) => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      setActiveDropdown(menuId);
    },
    [hoverTimeout, setActiveDropdown]
  );

  const closeDropdown = useCallback(() => {
    const timeout = setTimeout(() => {
      setActiveDropdown(null);
    }, 300); // Small delay prevents accidental closing
    setHoverTimeout(timeout);
  }, [setActiveDropdown]);

  const handleMobileLinkClick = useCallback(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [setActiveDropdown]);

  return (
    <nav className="navbar text-white p-4 flex flex-col items-center justify-between relative z-50">
      {/* Logo and Connect Button Section */}
      <div className="flex w-full max-w-7xl mt-4">
        <div className="flex w-full items-center justify-between">
          <Link
            href="/swap/sui/srm"
            className="relative w-full flex items-center justify-center sm:justify-start"
          >
            <Image
              src="/images/logosrm.png"
              alt="Sui Rewards Me App Logo"
              width={300}
              height={120}
              priority
            />
          </Link>
        </div>

        {/* Desktop Wallet Connect Button */}
        <div className="min-w-[180px] hidden md:flex ml-auto">
          <ConnectButton />
        </div>
      </div>

      <div className="flex w-full border-b p-0 m-0 mt-8 border-[#5E21A1]" />

      {/* Desktop Menu */}
      <div ref={menuRef} className="hidden md:flex space-x-4 ml-8">
        {NAVIGATION_ITEMS.map((menu) => {
          // Comprobar si la ruta actual coincide con este menú
          const isActive = pathname?.startsWith(menu.path);

          if (!menu.submenu) {
            return (
              <div key={menu.id} className="relative group">
                <NavLink href={menu.path} external={false} className="">
                  <button className="menu-button px-4 py-2 hover:scale-105 transition-transform duration-300">
                    {menu.label}
                  </button>
                </NavLink>
              </div>
            );
          }

          return (
            <div
              key={menu.id}
              className={`relative group ${
                isActive ? "border-b-2 border-[#5E21A1]" : ""
              }`}
              onMouseEnter={() => openDropdown(menu.id)}
              onMouseLeave={closeDropdown}
            >
              <Link href={menu.path}>
                <button
                  className={`menu-button px-4 py-2 transition-all duration-300 ${
                    isActive ? "text-[#5E21A1]" : "text-white"
                  }`}
                >
                  {menu.label}
                </button>
              </Link>

              {activeDropdown === menu.id && (
                <Dropdown
                  menu={menu}
                  onMouseEnter={() => {
                    if (hoverTimeout) clearTimeout(hoverTimeout);
                  }}
                  onMouseLeave={closeDropdown}
                />
              )}
            </div>
          );
        })}

        {/* External Links */}
        {EXTERNAL_LINKS.map((link) => (
          <div key={link.id} className="relative group">
            <NavLink href={link.path} external={link.external} className="">
              <button className="menu-button px-4 py-2 hover:scale-105 transition-transform duration-300">
                {link.label}
              </button>
            </NavLink>
          </div>
        ))}
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden ml-auto">
        <button
          className="menu-button text-white text-2xl"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu with Animation */}
      {isMobileMenuOpen && (
        <div
          className="h-[calc(100vh-64px)] mt-2 bg-black right-0 bg-darkBlue w-full sm:w-64 p-4 shadow-lg flex flex-col items-start md:hidden animate-fadeIn"
          style={{ animationDuration: "0.2s" }}
        >
          {NAVIGATION_ITEMS.map((menu, index) => {
            const isActive = pathname?.startsWith(menu.path);

            if (!menu.submenu) {
              return (
                <div key={menu.id} className="w-full mt-1">
                  <NavLink
                    href={menu.path}
                    external={menu.external}
                    className="block w-full"
                    onClick={handleMobileLinkClick}
                  >
                    <div className="menu-button block w-full bg-[#000306] text-white font-semibold text-center px-4 py-2 rounded-md hover:bg-softMint hover:text-black transition-colors duration-200">
                      {menu.label}
                    </div>
                  </NavLink>
                </div>
              );
            }

            return (
              <div key={menu.id} className="w-full mt-1">
                <button
                  className={`text-center text-white menu-button w-full text-left px-4 py-2 hover:bg-softMint transition-colors ${
                    isActive ? "border-l-4 border-[#5E21A1]" : ""
                  }`}
                  onClick={() => toggleDropdown(menu.id)}
                >
                  {menu.label}
                </button>

                {activeDropdown === menu.id && (
                  <Dropdown
                    menu={menu}
                    isMobile={true}
                    onLinkClick={handleMobileLinkClick}
                  />
                )}
              </div>
            );
          })}

          {/* External Links */}
          {EXTERNAL_LINKS.map((link) => (
            <div key={link.id} className="w-full mt-1">
              <NavLink
                href={link.path}
                external={link.external}
                className="block w-full"
                onClick={handleMobileLinkClick}
              >
                <div className="menu-button block w-full bg-[#000306] text-white font-semibold text-center px-4 py-2 rounded-md hover:bg-softMint hover:text-black transition-colors duration-200">
                  {link.label}
                </div>
              </NavLink>
            </div>
          ))}

          {/* Mobile Wallet Connect Button */}
          <div className="w-full mt-4 flex justify-center flex-1 min-w-[160px] max-h-[50px]">
            <ConnectButton />
          </div>
        </div>
      )}

      <div className="flex w-full border-b p-0 m-0 border-[#5E21A1]" />
    </nav>
  );
}
