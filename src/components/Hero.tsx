import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

export default function Hero() {
  return (
    <section className="relative h-[60vh] sm:h-[80vh] w-full overflow-hidden bg-background">
      <div className="absolute inset-0">
        <img 
          src="https://picsum.photos/seed/fashion/1920/1080" 
          alt="Hero Banner" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-start">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          <span className="inline-block bg-black text-white text-xs font-black uppercase tracking-widest px-3 py-1 mb-4 shimmer-primary">
            DESIGN OF THE DAY
          </span>
          <h1 className="text-4xl sm:text-7xl font-heading font-black text-white leading-none mb-6 drop-shadow-lg">
            STAY QUIRKY.<br />
            STAY BOLD<span className="text-primary">.</span>
          </h1>
          <p className="text-base sm:text-xl text-white mb-8 font-medium drop-shadow-md">
            Premium quality t-shirts, hoodies, and joggers designed for the bold Indian spirit.
          </p>
          <div className="flex-wrap gap-4 flex">
            <Link to="/shop">
              <Button size="lg" className="bg-black text-white font-black px-8 py-6 text-lg hover:scale-105 transition-transform shimmer-primary">
                SHOP NOW
              </Button>
            </Link>
            <Link to="/tribe">
              <Button size="lg" variant="outline" className="border-2 border-white text-white font-black px-8 py-6 text-lg hover:bg-white hover:text-black transition-all">
                JOIN THE TRIBE
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Floating Badge */}
      <motion.div 
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute bottom-10 right-10 hidden lg:block"
      >
        <div className="w-32 h-32 bg-[#C5A059] rounded-full flex items-center justify-center border-4 border-black rotate-12 shadow-2xl shimmer-primary">
          <span className="text-black font-black text-center leading-tight text-sm">
            100%<br />COTTON<br />GOODNESS
          </span>
        </div>
      </motion.div>
    </section>
  );
}
