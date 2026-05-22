import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';

export function NotificationBridge() {
  const { userData } = useAuth();
  const lastProcessedTime = useRef<number>(Date.now());

  useEffect(() => {
    // Check if running inside Flutter
    const hasNotificationChannel = !!(window as any).FlutterNotificationChannel;
    if (!hasNotificationChannel) return;

    // Listen for new notifications
    const q = query(
      collection(db, 'notifications'), 
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;

      const notif = snapshot.docs[0].data();
      const createdAt = (notif.createdAt as Timestamp)?.toMillis() || Date.now();

      // Only bridge if the notification was created AFTER the app started
      // and it's intended for this user
      if (createdAt > lastProcessedTime.current) {
        lastProcessedTime.current = createdAt;

        const isTribeMember = (userData as any)?.isTribeMember;
        const audienceMatch = notif.targetAudience === 'all' || (notif.targetAudience === 'tribe_members' && isTribeMember);

        if (audienceMatch) {
          console.log("Bridging notification to Native:", notif.title);
          
          (window as any).FlutterNotificationChannel.postMessage(JSON.stringify({
            title: notif.title,
            body: notif.body,
            type: notif.type,
            imageUrl: notif.imageUrl,
            link: notif.link
          }));
        }
      }
    });

    return () => unsubscribe();
  }, [userData]);

  return null; // This is a logic-only component
}
