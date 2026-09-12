const fs = require('fs');

function fixCustomer() {
  let content = `import React, { Suspense, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Grid, Tag, User, MapPin, Search as SearchIcon, ArrowLeft } from "lucide-react";
import { useLocation as useGlobalLocation } from "../../context/LocationContext";
import { useSearch } from "../../context/SearchContext";
import { AnimatePresence, motion } from "motion/react";

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);
`;

  let orig = fs.readFileSync('src/components/layout/CustomerLayout.tsx', 'utf8');
  let body = orig.substring(orig.indexOf('export function CustomerLayout()'));
  fs.writeFileSync('src/components/layout/CustomerLayout.tsx', content + body);
}

function fixShop() {
  let content = `import React, { Suspense, useState } from "react";
import { Outlet, Link, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, RefreshCw, BarChart3, LogOut, Menu, X, Smartphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AnimatePresence, motion } from "motion/react";

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);
`;

  let orig = fs.readFileSync('src/components/layout/ShopLayout.tsx', 'utf8');
  let body = orig.substring(orig.indexOf('export function ShopLayout()'));
  fs.writeFileSync('src/components/layout/ShopLayout.tsx', content + body);
}

fixCustomer();
if (fs.existsSync('src/components/layout/ShopLayout.tsx')) fixShop();
