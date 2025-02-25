import Image from 'next/image';

const galleryImages = [
  {
    id: 1,
    src: '/images/gallery/training-1.jpg',
    alt: 'ROTC Training Session'
  },
  {
    id: 2,
    src: '/images/gallery/ceremony-1.jpg',
    alt: 'Recognition Ceremony'
  },
  {
    id: 3,
    src: '/images/gallery/community-1.jpg',
    alt: 'Community Service'
  },
  {
    id: 4,
    src: '/images/gallery/training-2.jpg',
    alt: 'Field Training'
  },
  {
    id: 5,
    src: '/images/gallery/event-1.jpg',
    alt: 'Special Event'
  },
  {
    id: 6,
    src: '/images/gallery/ceremony-2.jpg',
    alt: 'Awards Ceremony'
  }
];

export default function GallerySection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Photo Gallery
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {galleryImages.map(image => (
            <div
              key={image.id}
              className="relative aspect-square overflow-hidden rounded-lg hover:opacity-90 transition-opacity">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
