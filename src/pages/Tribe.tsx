import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { CheckCircle2, Zap, Gift, ShieldCheck, Star, Loader2 } from 'lucide-react';
import AnimatedBrandName from '@/components/AnimatedBrandName';
import BrandSignature from '@/components/BrandSignature';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Tribe() {
  const { user, userData, loginWithGoogle } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  const isTribeMember = userData?.isTribeMember || false;

  const handleJoinTribe = async () => {
    if (!user) {
      toast.info("Please login to join the tribe");
      loginWithGoogle();
      return;
    }

    if (isTribeMember) {
      toast.info("You are already a tribe member!");
      return;
    }

    setIsJoining(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { isTribeMember: true });
      toast.success("Welcome to the Tribe!", {
        description: "You now have access to exclusive perks."
      });
      navigate('/profile');
    } catch (error) {
      console.error("Error joining tribe:", error);
      toast.error("Failed to join the tribe. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="bg-background pb-20">
      {/* Hero Section */}
      <section className="bg-black py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl sm:text-8xl font-heading font-black uppercase tracking-tighter mb-6 text-white flex items-center justify-center gap-4">
              <span className="px-4 bg-liquid-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.4)]">TRIBE</span>
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-white max-w-2xl mx-auto mb-10">
              The ultimate loyalty program for the bold and the quirky. Save more, get more.
            </p>
            <Button 
              size="lg" 
              onClick={handleJoinTribe}
              disabled={isJoining}
              className="bg-liquid-gold text-black font-black px-12 py-8 text-2xl rounded-none hover:scale-105 transition-transform shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] border-none"
            >
              {isJoining ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : isTribeMember ? (
                "ALREADY A MEMBER"
              ) : (
                "JOIN NOW FOR ₹299/YR"
              )}
            </Button>
          </motion.div>
        </div>
        
        {/* Background Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black opacity-5 select-none whitespace-nowrap">
          EXCLUSIVE MEMBERSHIP
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center p-8 border-2 border-black/10 rounded-2xl hover:border-[#C5A059] transition-colors">
              <div className="w-16 h-16 bg-[#C5A059]/20 rounded-full flex items-center justify-center mb-6">
                <Zap className="h-8 w-8 text-[#C5A059] fill-[#C5A059]" />
              </div>
              <h3 className="text-xl font-black uppercase mb-4 text-black">Extra 10% Off</h3>
              <p className="text-black/40 font-medium">Get an additional 10% discount on every single product, every single time.</p>
            </div>
            <div className="flex flex-col items-center text-center p-8 border-2 border-black/10 rounded-2xl hover:border-[#C5A059] transition-colors">
              <div className="w-16 h-16 bg-[#C5A059]/20 rounded-full flex items-center justify-center mb-6">
                <Gift className="h-8 w-8 text-[#C5A059] fill-[#C5A059]" />
              </div>
              <h3 className="text-xl font-black uppercase mb-4 text-black">Early Access</h3>
              <p className="text-black/40 font-medium">Be the first to shop our new collections and limited edition drops.</p>
            </div>
            <div className="flex flex-col items-center text-center p-8 border-2 border-black/10 rounded-2xl hover:border-[#C5A059] transition-colors">
              <div className="w-16 h-16 bg-[#C5A059]/20 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="h-8 w-8 text-[#C5A059] fill-[#C5A059]" />
              </div>
              <h3 className="text-xl font-black uppercase mb-4 text-black">Priority Support</h3>
              <p className="text-black/40 font-medium">Skip the queue with dedicated customer support for Tribe members.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-black/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-heading font-black text-center uppercase mb-12 text-black">WHY JOIN THE <span className="luxury-text-gradient">TRIBE?</span></h2>
          <div className="bg-white border-2 border-black/10 overflow-hidden rounded-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black text-white">
                  <th className="p-6 font-black uppercase tracking-widest">BENEFITS</th>
                  <th className="p-6 font-black uppercase tracking-widest text-center">REGULAR</th>
                  <th className="p-6 font-black uppercase tracking-widest text-center text-[#C5A059]">TRIBE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {[
                  { name: 'Product Price', regular: 'MRP', tribe: 'Extra 10% Off' },
                  { name: 'Shipping Fee', regular: '₹50', tribe: 'FREE' },
                  { name: 'New Launches', regular: 'Standard', tribe: '24h Early Access' },
                  { name: 'Exclusive Designs', regular: 'No', tribe: 'Yes' },
                  { name: 'Birthday Gift', regular: 'No', tribe: 'Yes' },
                ].map((row) => (
                  <tr key={row.name}>
                    <td className="p-6 font-bold text-sm text-black">{row.name}</td>
                    <td className="p-6 text-center text-sm text-black/30">{row.regular}</td>
                    <td className="p-6 text-center text-sm font-black text-[#C5A059]">{row.tribe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-liquid-gold p-10 rounded-3xl relative shadow-xl shadow-[#FFD700]/20">
              <Star className="absolute top-6 right-6 h-12 w-12 text-black/10 fill-black/10" />
              <p className="text-xl font-bold text-black mb-6 italic">
                "Being part of the Namate Tribe has saved me so much money. I love the early access to their quirky drops!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-full" />
                <div>
                  <p className="font-black uppercase text-sm text-black">Rahul S.</p>
                  <p className="text-xs font-bold text-black/60">Member since 2025</p>
                </div>
              </div>
            </div>
            <div className="bg-black p-10 rounded-3xl relative text-white">
              <Star className="absolute top-6 right-6 h-12 w-12 text-white/10 fill-white/10" />
              <p className="text-xl font-bold mb-6 italic">
                "The priority shipping is a game changer. I always get my t-shirts within 2 days. Best membership ever."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-liquid-gold rounded-full shadow-[0_0_10px_rgba(197,160,89,0.4)]" />
                <div>
                  <p className="font-black uppercase text-sm text-[#C5A059]">Ananya M.</p>
                  <p className="text-xs font-bold opacity-60">Member since 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <BrandSignature variant="dark" className="mb-20 opacity-30" />
    </div>
  );
}
