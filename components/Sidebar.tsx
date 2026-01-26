'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, FileVideo, Activity, Settings } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async () => {
    try {
      // Standardize on 'access_token' set by apiClient; fallback to legacy 'auth_token'
      const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token')
      if (!token) {
        console.log('No auth token found in localStorage');
        setLoading(false);
        return;
      }

      console.log('Fetching user role with token:', token.substring(0, 20) + '...');
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      console.log('User role response status:', response.status);
      if (response.ok) {
        const userData = await response.json();
        setUserRole(userData.role);
      } else {
        console.error('Failed to fetch user role:', response.status);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUserRole();
  }, []);

  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Phát hiện', icon: Home, requireAdmin: false },
    { href: '/users', label: 'Người dùng', icon: Users, requireAdmin: true },
    { href: '/files', label: 'Files', icon: FileVideo, requireAdmin: false },
    { href: '/settings', label: 'Cài đặt', icon: Settings, requireAdmin: false },
  ];

  // Filter items based on role
  const visibleItems = navItems.filter(item => {
    console.log(`Filtering item: ${item.label}, requireAdmin: ${item.requireAdmin}, userRole: ${userRole}`);
    
    // If still loading, show all items temporarily
    if (loading) {
      console.log(`-> Showing ${item.label} (still loading)`);
      return true;
    }
    
    // Once loaded, hide admin items if user is not admin
    if (item.requireAdmin && userRole !== 'admin') {
      return false;
    }
    return true;
  });
  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <Activity className="text-primary" size={32} />
          <h2 className="text-xl font-bold">AI Admin</h2>
        </div>

        <nav className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
