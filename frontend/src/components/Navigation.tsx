"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white text-gray-800 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Image
              src="/logo.png"
              alt="Kerala Government Logo"
              width={60}
              height={60}
              className="rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-green-800">
                Kerala Certificate Portal
              </span>
              <span className="text-sm text-gray-600 hidden sm:block">
                Government of Kerala
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/apply">Apply</NavLink>
            <NavLink href="/status">Check Status</NavLink>
            <NavLink href="/contact">Contact</NavLink>
            <NavLink href="/socket-test">
              <span className="flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5"></span>
                WebSocket Demo
              </span>
            </NavLink>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-2">
              <MobileNavLink href="/">Home</MobileNavLink>
              <MobileNavLink href="/apply">Apply</MobileNavLink>
              <MobileNavLink href="/status">Check Status</MobileNavLink>
              <MobileNavLink href="/contact">Contact</MobileNavLink>
              <MobileNavLink href="/socket-test">
                <span className="flex items-center">
                  <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5"></span>
                  WebSocket Demo
                </span>
              </MobileNavLink>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Navigation Link Components
const NavLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className="px-4 py-2 rounded-lg text-gray-700 hover:text-green-800 hover:bg-green-50 
    transition-colors duration-200 font-medium"
  >
    {children}
  </Link>
);

const MobileNavLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className="block px-4 py-2 text-gray-700 hover:text-green-800 hover:bg-green-50 
    rounded-lg transition-colors duration-200"
  >
    {children}
  </Link>
);
