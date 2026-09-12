const fs = require('fs');
const file = 'src/components/layout/ShopLayout.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /import \{ LayoutDashboard, Package, RefreshCw, BarChart3, LogOut, Menu, X, Smartphone \} from "lucide-react";/,
  'import { LayoutDashboard, Package, RefreshCw, BarChart3, LogOut, Menu, X, Smartphone, Tags, PlusSquare, Store, CreditCard, CheckSquare, ExternalLink } from "lucide-react";'
);

fs.writeFileSync(file, content);
