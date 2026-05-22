import React from 'react';
import { motion } from 'motion/react';
import { Settings, Construction, Hammer, Wrench, Cog } from 'lucide-react';

export default function MaintenanceMode() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -left-20"
        >
          <Cog size={400} />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -right-20"
        >
          <Cog size={500} />
        </motion.div>
      </div>

      <div className="relative z-10 max-w-lg w-full">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12 flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-black flex items-center justify-center mb-6 shadow-2xl">
             <img 
               src="https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png" 
               alt="NAMATE" 
               className="w-16 h-16 invert"
               referrerPolicy="no-referrer"
             />
          </div>
          <h1 className="text-4xl font-black tracking-[0.1em] text-black">N A M A T E</h1>
          <p className="mt-2 text-[10px] font-black text-black/40 uppercase tracking-[0.5em]">Elevated Apparel</p>
        </motion.div>

        {/* Manufacturing Animation */}
        <div className="relative h-48 flex items-center justify-center mb-12">
          {/* Central Product Placeholder */}
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-40 bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
             <Construction className="text-black/10 w-12 h-12" />
             
             {/* Progress Bar inside box */}
             <div className="absolute bottom-4 left-4 right-4 h-1 bg-gray-200 overflow-hidden">
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-full h-full bg-black/20"
                />
             </div>
          </motion.div>

          {/* Animated Tools */}
          <motion.div
            animate={{ 
              rotate: [0, -20, 0],
              x: [0, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/4 top-1/2 -translate-y-1/2 text-black/20"
          >
            <Hammer size={48} />
          </motion.div>

          <motion.div
            animate={{ 
              rotate: [0, 20, 0],
              y: [0, 5, 0]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute right-1/4 top-1/3 text-black/20"
          >
            <Wrench size={48} />
          </motion.div>

          <motion.div
            animate={{ 
              rotate: 360
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute right-1/3 bottom-10 text-black/10"
          >
            <Cog size={64} />
          </motion.div>
        </div>

        {/* Status Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Under Manufacturing</h2>
          <p className="text-black/60 font-medium text-sm leading-relaxed mb-8">
            We are currently refining our digital experience. Fresh arrivals and elevated designs are coming your way very soon.
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Live Updates Coming Soon
          </div>
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-8 left-0 right-0">
        <p className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em]">
          &copy; {new Date().getFullYear()} N A M A T E STUDIO. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}
