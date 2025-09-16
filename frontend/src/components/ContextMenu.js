import React, { useState, useEffect, useRef } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ children, menuItems, onItemClick, disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState(null);
  const menuRef = useRef(null);
  const containerRef = useRef(null);

  // Handle right-click for desktop
  const handleContextMenu = (e) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Get the container's bounding rectangle
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Position menu under the container on the left side
    const x = containerRect.left;
    const y = containerRect.bottom + 5; // Position slightly below the container
    
    setPosition({ x, y });
    setIsVisible(true);
  };

  // Handle long press for mobile
  const handleTouchStart = (e) => {
    if (disabled) return;
    
    const timer = setTimeout(() => {
      // Get the container's bounding rectangle
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Position menu under the container on the left side
      const x = containerRect.left;
      const y = containerRect.bottom + 5; // Position slightly below the container
      
      setPosition({ x, y });
      setIsVisible(true);
      setLongPressTimer(null);
    }, 500); // 500ms long press
    
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Handle menu item click
  const handleMenuItemClick = (item) => {
    setIsVisible(false);
    if (onItemClick) {
      onItemClick(item);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsVisible(false);
      }
    };

    const handleScroll = () => {
      setIsVisible(false);
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isVisible]);

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (isVisible && menuRef.current) {
      const menu = menuRef.current;
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let { x, y } = position;
      let needsAdjustment = false;
      
      // Adjust horizontal position
      if (x + menuRect.width > viewportWidth) {
        x = viewportWidth - menuRect.width - 10;
        needsAdjustment = true;
      }
      
      // Adjust vertical position
      if (y + menuRect.height > viewportHeight) {
        y = viewportHeight - menuRect.height - 10;
        needsAdjustment = true;
      }
      
      // Ensure menu doesn't go off-screen
      const adjustedX = Math.max(10, x);
      const adjustedY = Math.max(10, y);
      
      if (needsAdjustment || adjustedX !== x || adjustedY !== y) {
        setPosition({ x: adjustedX, y: adjustedY });
      }
    }
  }, [isVisible]); // Remove position from dependencies to prevent infinite loop

  return (
    <>
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        style={{ display: 'inline-block', width: '100%' }}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 9999,
          }}
        >
          <ul className="context-menu-list">
            {menuItems.map((item, index) => (
              <li
                key={index}
                className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${item.danger ? 'danger' : ''}`}
                onClick={() => !item.disabled && handleMenuItemClick(item)}
              >
                {item.icon && <span className="context-menu-icon">{item.icon}</span>}
                <span className="context-menu-text">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default ContextMenu;