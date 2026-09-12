const fs = require('fs');
let file = 'src/pages/admin/Shops.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add import for EditShopModal
content = content.replace(
  'import { getShopPlanStatus } from "../../lib/subscription";',
  'import { getShopPlanStatus } from "../../lib/subscription";\nimport { EditShopModal } from "../../components/modals/EditShopModal";\nimport { Edit2 } from "lucide-react";'
);

// 2. Add state for editing shop
content = content.replace(
  'const [updating, setUpdating] = useState<string | null>(null);',
  'const [updating, setUpdating] = useState<string | null>(null);\n  const [editingShop, setEditingShop] = useState<any>(null);'
);

// 3. Add Edit button in Actions column
content = content.replace(
  '{(shop.status === "pending" ||',
  `<Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingShop(shop)}
                          title="Edit Shop Details"
                        >
                          <Edit2 size={16} />
                        </Button>
                      {(shop.status === "pending" ||`
);

// 4. Render modal at the bottom of the component
content = content.replace(
  '</div>\n    </div>\n  );\n}',
  `</div>\n      {editingShop && (\n        <EditShopModal\n          shop={editingShop}\n          onClose={() => setEditingShop(null)}\n          onSave={() => {\n            setEditingShop(null);\n            fetchShops();\n          }}\n        />\n      )}\n    </div>\n  );\n}`
);

fs.writeFileSync(file, content);
