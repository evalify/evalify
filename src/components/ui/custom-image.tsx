import Image from 'next/image';

interface CustomImageProps {
    src: string;
    alt: string;
    className?: string;
}

export function CustomImage({ src, alt, className }: CustomImageProps) {
    return (
        <div className="relative w-[200px] h-[150px]">
            <Image 
                src={src} 
                alt={alt} 
                fill
                className={`object-contain ${className || ''}`}
            />
        </div>
    );
}
