import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  Camera, 
  Send, 
  Trash2, 
  X, 
  MessageSquare, 
  Sparkles,
  Loader2,
  Calendar,
  User as UserIcon
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  writeBatch,
  increment,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn, compressImage } from '@/lib/utils';
import { toast } from 'sonner';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: any;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { user, role } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  // Form State
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === 'admin';

  useEffect(() => {
    const reviewsRef = collection(db, 'products', productId, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Review[];
      setReviews(fetchedReviews);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [productId]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (reviewImages.length + newImages.length >= 4) {
        toast.error("Maximum 4 images allowed per review");
        break;
      }

      const file = files[i];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(base64, 800, 800, 0.6);
      newImages.push(compressed);
    }

    setReviewImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to leave a review");
      return;
    }
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (comment.trim().length < 10) {
      toast.error("Review must be at least 10 characters long");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Broadcasting your vibe...");

    try {
      const batch = writeBatch(db);
      
      // 0. Get current product data to update average rating
      const productRef = doc(db, 'products', productId);
      const productDoc = await getDoc(productRef);
      const productData = productDoc.data();
      
      const currentReviewCount = productData?.reviewCount || 0;
      const currentAverageRating = productData?.averageRating || 0;
      const newReviewCount = currentReviewCount + 1;
      const newAverageRating = ((currentAverageRating * currentReviewCount) + rating) / newReviewCount;

      // 1. Add Review
      const reviewRef = doc(collection(db, 'products', productId, 'reviews'));
      batch.set(reviewRef, {
        userId: user.uid,
        userName: user.displayName || 'Tribe Member',
        userPhoto: user.photoURL || '',
        rating,
        comment: comment.trim(),
        images: reviewImages,
        createdAt: serverTimestamp()
      });

      // 2. Award Points (100 Namate Points)
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        namatePoints: increment(100)
      });

      // 3. Record Point Transaction
      const pointsHistoryRef = doc(collection(db, 'users', user.uid, 'points_history'));
      batch.set(pointsHistoryRef, {
        points: 100,
        type: 'earn',
        description: `Review for ${productName}`,
        createdAt: serverTimestamp()
      });

      // 4. Update Product Average Rating and Review Count
      batch.update(productRef, {
        averageRating: newAverageRating,
        reviewCount: newReviewCount
      });

      await batch.commit();

      toast.success("Review posted! +100 Namate Points added to your profile.", { id: toastId });
      setRating(0);
      setComment('');
      setReviewImages([]);
      setShowReviewForm(false);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to post review", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string, reviewRating: number) => {
    if (!window.confirm("Remove this review from history?")) return;
    
    try {
      const batch = writeBatch(db);
      
      // 0. Get current product data to update average rating
      const productRef = doc(db, 'products', productId);
      const productDoc = await getDoc(productRef);
      const productData = productDoc.data();
      
      const currentReviewCount = productData?.reviewCount || 0;
      const currentAverageRating = productData?.averageRating || 0;
      const newReviewCount = Math.max(0, currentReviewCount - 1);
      
      let newAverageRating = 0;
      if (newReviewCount > 0) {
        newAverageRating = ((currentAverageRating * currentReviewCount) - reviewRating) / newReviewCount;
      }

      batch.delete(doc(db, 'products', productId, 'reviews', reviewId));
      
      batch.update(productRef, {
        averageRating: newAverageRating,
        reviewCount: newReviewCount
      });

      await batch.commit();
      toast.success("Review deleted");
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length 
    : 0;

  return (
    <section className="py-24 border-t border-black/5">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-5 h-5 text-black/20" />
              <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Tribe Frequencies</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-brand font-medium uppercase tracking-tighter text-black leading-none">
              REVIEWS
            </h2>
            <div className="flex items-center gap-4 mt-6">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={cn(
                      "w-4 h-4 transition-colors",
                      star <= Math.round(averageRating) ? "fill-black text-black" : "text-black/10"
                    )} 
                  />
                ))}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-black/60">
                {averageRating.toFixed(1)} / {reviews.length} Feedbacks
              </span>
            </div>
          </div>

          <Button 
            onClick={() => user ? setShowReviewForm(!showReviewForm) : toast.error("Log in to join the conversation")}
            className="h-16 px-8 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black/90 transition-all shadow-xl shadow-black/10 flex items-center gap-3"
          >
            {showReviewForm ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {showReviewForm ? 'CANCEL REVIEW' : 'LEAVE A REVIEW'}
          </Button>
        </div>

        {/* Review Form */}
        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 64 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleSubmitReview} className="bg-black/[0.02] border-2 border-black/5 rounded-[40px] p-8 sm:p-12">
                <div className="space-y-8">
                  {/* Rating Selector */}
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-black/40 ml-2">Rate the Vibe</Label>
                    <div className="flex gap-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="group relative"
                        >
                          <Star 
                            className={cn(
                              "w-8 h-8 transition-all",
                              star <= rating ? "fill-black text-black scale-110" : "text-black/10 group-hover:text-black/30"
                            )} 
                          />
                          {star <= rating && (
                            <motion.div 
                              layoutId="star-aura"
                              className="absolute inset-0 bg-black/5 rounded-full scale-150 -z-10"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-black/40 ml-2">Your Story</Label>
                    <Textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience with the tribe..."
                      className="min-h-[160px] rounded-3xl border-2 border-black/5 bg-white text-black font-bold p-6 focus:border-black/20 transition-all resize-none"
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-black/40 ml-2">Lookbook Contributions</Label>
                    <div className="flex flex-wrap gap-4">
                      {reviewImages.map((img, idx) => (
                        <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden group border-2 border-black/5">
                          <img src={img} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {reviewImages.length < 4 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-24 h-24 rounded-2xl border-2 border-dashed border-black/10 flex flex-col items-center justify-center gap-2 hover:bg-black/5 transition-all text-black/20 hover:text-black/40"
                        >
                          <Camera className="w-6 h-6" />
                          <span className="text-[8px] font-black uppercase">Add Photo</span>
                        </button>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-20 bg-black text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-black/90 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSubmitting ? 'TRANSMITTING...' : 'POST FREQUENCY'}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews List */}
        <div className="space-y-12">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-black/10 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-black/20">Syncing Frequencies...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-20 border-2 border-dashed border-black/5 rounded-[40px] flex flex-col items-center justify-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-black/10" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-black mb-2">Be the first to join the frequency</h3>
                <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest max-w-xs mx-auto">
                  Share your experience with the tribe and help others discover their next favorite piece.
                </p>
              </div>
              {!showReviewForm && (
                <Button 
                  onClick={() => user ? setShowReviewForm(true) : toast.error("Log in to start a story")}
                  variant="outline"
                  className="rounded-full border-black/10 font-black text-[10px] uppercase tracking-widest px-8"
                >
                  Start a Story
                </Button>
              )}
            </div>
          ) : (
            reviews.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group"
              >
                <div className="bg-white rounded-[40px] p-8 sm:p-10 border border-black/5 hover:border-black/10 transition-all hover:shadow-2xl hover:shadow-black/5">
                  <div className="flex flex-col sm:flex-row gap-8">
                    {/* User Info */}
                    <div className="sm:w-48 shrink-0">
                      <div className="flex flex-row sm:flex-col items-center sm:items-start gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-black/5 overflow-hidden border-2 border-white shadow-xl shadow-black/5">
                          {review.userPhoto ? (
                            <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UserIcon className="w-6 h-6 text-black/20" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase tracking-tighter text-black mb-1 truncate max-w-[120px]">
                            {review.userName}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-black/20 uppercase tracking-widest">
                            <Calendar className="w-3 h-3" />
                            {review.createdAt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="flex-grow">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={cn(
                                "w-4 h-4",
                                star <= review.rating ? "fill-black text-black" : "text-black/10"
                              )} 
                            />
                          ))}
                        </div>
                        {(isAdmin || user?.uid === review.userId) && (
                          <button
                            onClick={() => handleDeleteReview(review.id, review.rating)}
                            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-lg font-bold text-black/80 leading-relaxed italic mb-8">
                        "{review.comment}"
                      </p>

                      {review.images && review.images.length > 0 && (
                        <div className="flex flex-wrap gap-4">
                          {review.images.map((img, imgIdx) => (
                            <div key={imgIdx} className="w-24 h-32 rounded-2xl overflow-hidden border-2 border-black/5 cursor-pointer hover:scale-105 transition-transform">
                              <img 
                                src={img} 
                                alt={`Review by ${review.userName}`} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
