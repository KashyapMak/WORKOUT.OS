import React, { useState, useEffect } from "react";

interface AnimatedExerciseViewerProps {
  images?: string[];
  fallbackUrl?: string;
  alt: string;
  className?: string;
}

export function AnimatedExerciseViewer({ images, fallbackUrl, alt, className = "max-h-full max-w-full object-contain" }: AnimatedExerciseViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 1000); // alternating cycle of 1.0s matches the natural pace of an exercise rep
    return () => clearInterval(interval);
  }, [images]);

  // If a high-quality animated GIF is available from the dataset, prioritize displaying it!
  const hasRealGif = fallbackUrl && (fallbackUrl.toLowerCase().endsWith(".gif") || fallbackUrl.includes("raw.githubusercontent.com"));

  if (hasRealGif) {
    return (
      <img 
        src={fallbackUrl} 
        alt={alt} 
        className={className}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (images && images.length > 0) {
    return (
      <img 
        src={images[currentIndex]} 
        alt={`${alt} phase ${currentIndex + 1}`} 
        className={className}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (fallbackUrl) {
    return (
      <img 
        src={fallbackUrl} 
        alt={alt} 
        className={className}
        referrerPolicy="no-referrer"
      />
    );
  }

  return null;
}
