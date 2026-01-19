import React, { useRef, useEffect, useState } from 'react';

interface LazyLoadSectionProps {
    children: React.ReactNode;
    threshold?: number;
    rootMargin?: string;
}

const LazyLoadSection: React.FC<LazyLoadSectionProps> = ({
    children,
    threshold = 0.1,
    rootMargin = '100px'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Once visible, stop observing
                    if (sectionRef.current) {
                        observer.unobserve(sectionRef.current);
                    }
                }
            },
            {
                threshold,
                rootMargin
            }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, [threshold, rootMargin]);

    return (
        <div ref={sectionRef}>
            {isVisible ? children : <div style={{ minHeight: '400px' }} />}
        </div>
    );
};

export default LazyLoadSection;
