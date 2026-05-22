import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Tag, ShoppingBag, Info, ChevronLeft, Calendar, ExternalLink, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function Notifications() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read all notifications (simplified audience filtering for now)
    const q = query(
      collection(db, 'notifications'), 
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Client-side filtering for Tribe members if needed
      const filtered = docs.filter((n: any) => {
        if (n.targetAudience === 'tribe_members') {
          return (userData as any)?.isTribeMember;
        }
        return true;
      });

      setNotifications(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  return (
    <div className="min-h-screen bg-white pt-24 pb-32">
      <div className="max-w-2xl mx-auto px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-black/20">Loading updates...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {notifications.map((notif, i) => (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-black/5 to-transparent rounded-[32px] opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
                  
                  <div className="relative p-6 bg-white border border-black/5 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
                    {/* Type Indicator */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center",
                          notif.type === 'offer' ? "bg-orange-50 text-orange-500" :
                          notif.type === 'product_update' ? "bg-blue-50 text-blue-500" :
                          "bg-black text-white"
                        )}>
                          {notif.type === 'offer' ? <Tag className="w-4 h-4" /> :
                           notif.type === 'product_update' ? <ShoppingBag className="w-4 h-4" /> :
                           <Bell className="w-4 h-4" />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 leading-none">{notif.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-black/20">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
                          {notif.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Now'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xl font-black uppercase tracking-tighter text-black leading-tight group-hover:text-primary transition-colors">
                        {notif.title}
                      </h3>
                      <p className="text-sm text-black/60 font-medium leading-relaxed">
                        {notif.body}
                      </p>

                      {notif.imageUrl && (
                        <div className="mt-4 rounded-2xl overflow-hidden border border-black/5 bg-black/5 group-hover:border-black/20 transition-colors">
                          <img 
                            src={notif.imageUrl} 
                            alt="" 
                            className="w-full h-auto object-cover max-h-[300px] hover:scale-105 transition-transform duration-700" 
                          />
                        </div>
                      )}

                      {notif.link && (
                        <Link 
                          to={notif.link}
                          className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all group/btn"
                        >
                          View Details
                          <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      )}
                    </div>

                    {/* Tribe Exclusive Badge */}
                    {notif.targetAudience === 'tribe_members' && (
                      <div className="absolute top-4 right-4 translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#C5A059] text-black text-[7px] font-black px-8 py-1 uppercase tracking-widest shadow-sm">
                        TRIBE ONLY
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!loading && notifications.length === 0 && (
              <div className="text-center py-20 px-8 bg-black/[0.02] rounded-[48px] border border-dashed border-black/10">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-black/5">
                  <Bell className="w-8 h-8 text-black/20" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-black mb-2">Clean Slates</h3>
                <p className="text-xs font-medium text-black/40 max-w-[200px] mx-auto uppercase tracking-widest leading-loose">
                  Your inbox is empty for now. We'll ping you when the heavy drops hit.
                </p>
                <button 
                  onClick={() => navigate('/shop')}
                  className="mt-8 px-8 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all shadow-xl shadow-black/10"
                >
                  Explore Shop
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
