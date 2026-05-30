import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

export default function AnnouncementBar() {
  const { siteConfig } = useAuth();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const show = !!(siteConfig?.showAnnouncement && siteConfig?.announcementText);
    setIsActive(show);
    
    // Dynamically adjust the offset variables so the rest of the application
    // shifts down to make room for the announcement bar
    if (show) {
      document.documentElement.style.setProperty('--announcement-height', '38px');
    } else {
      document.documentElement.style.setProperty('--announcement-height', '0px');
    }

    return () => {
      document.documentElement.style.setProperty('--announcement-height', '0px');
    };
  }, [siteConfig?.showAnnouncement, siteConfig?.announcementText]);

  if (!isActive || !siteConfig) return null;

  const fontStyle = 
    siteConfig.announcementFont === 'serif' ? 'font-serif text-[10px] tracking-normal' :
    siteConfig.announcementFont === 'mono' ? 'font-mono text-[9px] tracking-widest' :
    'font-sans text-[9px] tracking-[0.2em] -mr-[0.2em]';

  return (
    <div 
      className={cn(
        "fixed left-0 right-0 md:left-1/2 md:-translate-x-1/2 z-[105] w-full md:max-w-[430px] h-[38px] flex items-center justify-center font-black uppercase shadow-[0_1px_5px_rgba(0,0,0,0.03)] selection:bg-[#fff]/30 transition-all duration-300",
        fontStyle
      )}
      style={{ 
        top: 'var(--app-banner-height, 0px)',
        backgroundColor: siteConfig.announcementBg || '#000000',
        color: siteConfig.announcementTextColor || '#FFFFFF'
      }}
    >
      <div className="px-4 text-center truncate w-full animate-pulse-slow">
        {siteConfig.announcementText}
      </div>
    </div>
  );
}
