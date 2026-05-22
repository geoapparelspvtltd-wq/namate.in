import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Send, Trash2, Tag, ShoppingBag, Info, Loader2, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ManageNotifications() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const isAdmin = (userData as any)?.role === 'admin';
  
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'offer' as 'offer' | 'product_update' | 'order_update' | 'system',
    imageUrl: '',
    link: '',
    targetAudience: 'all' as 'all' | 'tribe_members'
  });

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(docs);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.body) {
      toast.error("Please fill title and body");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        ...form,
        createdAt: serverTimestamp()
      });
      toast.success("Notification sent successfully!");
      setForm({
        title: '',
        body: '',
        type: 'offer',
        imageUrl: '',
        link: '',
        targetAudience: 'all'
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-black uppercase mb-4">Admin Access Only</h1>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20 pt-10">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/profile')}
            className="w-12 h-12 flex items-center justify-center bg-black/5 rounded-2xl hover:bg-black hover:text-white transition-all group"
          >
            <ChevronLeft className="w-5 h-5 group-active:scale-90 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Notifications</h1>
            <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mt-1">Send offers and updates to users</p>
          </div>
        </div>

        {/* Create Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/5 rounded-[40px] p-8 mb-12 border border-black/5 shadow-inner"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Notification Title</label>
              <input 
                type="text"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="E.g. Big Friday Sale! 🔥"
                className="w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Notification Body</label>
              <textarea 
                value={form.body}
                onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Get up to 50% off on all oversized hoodies..."
                className="w-full h-32 bg-white border border-black/5 rounded-2xl px-6 py-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Type</label>
                <select 
                  value={form.type}
                  onChange={e => setForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black appearance-none"
                >
                  <option value="offer">Offer</option>
                  <option value="product_update">Product Update</option>
                  <option value="order_update">Order Update</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Audience</label>
                <select 
                  value={form.targetAudience}
                  onChange={e => setForm(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                  className="w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black appearance-none"
                >
                  <option value="all">Everyone</option>
                  <option value="tribe_members">Tribe Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Image URL (Optional)</label>
              <input 
                type="url"
                value={form.imageUrl}
                onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Click Action Link (Optional)</label>
              <input 
                type="text"
                value={form.link}
                onChange={e => setForm(prev => ({ ...prev, link: e.target.value }))}
                placeholder="e.g. /shop or /regal"
                className="w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-black text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Notification
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Recent Notifications */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-black/40 ml-4">Recently Sent</h2>
          {notifications.map((notif, i) => (
            <motion.div 
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-6 bg-white border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all group lg:hover:border-black/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    notif.type === 'offer' ? "bg-orange-50 text-orange-500" :
                    notif.type === 'product_update' ? "bg-blue-50 text-blue-500" :
                    "bg-gray-50 text-gray-500"
                  )}>
                    {notif.type === 'offer' ? <Tag className="w-6 h-6" /> :
                     notif.type === 'product_update' ? <ShoppingBag className="w-6 h-6" /> :
                     <Bell className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-black/20">{notif.type}</span>
                      <span className="w-1 h-1 bg-black/10 rounded-full" />
                      <span className="text-[10px] font-bold text-black/40">{notif.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}</span>
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tighter text-black leading-tight">{notif.title}</h3>
                    <p className="text-xs text-black/60 font-medium mt-1">{notif.body}</p>
                    {notif.imageUrl && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-black/5 aspect-video bg-black/5">
                        <img src={notif.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(notif.id)}
                  className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-12 bg-black/[0.02] rounded-[40px] border border-dashed border-black/10">
              <Bell className="w-8 h-8 text-black/10 mx-auto mb-3" />
              <p className="text-xs font-black text-black/20 uppercase tracking-widest">No notifications sent yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
