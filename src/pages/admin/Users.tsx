import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { EditUserModal } from '../../components/modals/EditUserModal';
import { Edit2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm">
                <th className="p-4 font-medium text-gray-500">Name</th>
                <th className="p-4 font-medium text-gray-500">Email</th>
                <th className="p-4 font-medium text-gray-500">Phone</th>
                <th className="p-4 font-medium text-gray-500">Role</th>
                <th className="p-4 font-medium text-gray-500">Joined</th>
                <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-sm font-medium text-gray-900">
                      {u.name || u.displayName || (u.email ? u.email.split('@')[0] : 'N/A')}
                    </td>
                    <td className="p-4 text-sm text-gray-500">{u.email}</td>
                    <td className="p-4 text-sm text-gray-500">{u.phone || 'N/A'}</td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'shop' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {u.role === 'shop' ? 'shop owner' : (u.role || 'customer')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="p-4 text-sm text-right">
                      <Button variant="outline" size="sm" onClick={() => setEditingUser(u)} title="Edit User">
                        <Edit2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={() => {
            setEditingUser(null);
            // Re-fetch handled below or by reloading window for simplicity since it's admin
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
