import { Link } from 'react-router-dom';

const categories = [
  { name: 'T-Shirts', image: 'https://picsum.photos/seed/tshirt/600/800', link: '/shop?category=tshirts' },
  { name: 'Hoodies', image: 'https://picsum.photos/seed/hoodie/600/800', link: '/shop?category=hoodies' },
  { name: 'Joggers', image: 'https://picsum.photos/seed/joggers/600/800', link: '/shop?category=joggers' },
  { name: 'Accessories', image: 'https://picsum.photos/seed/watch/600/800', link: '/shop?category=accessories' },
];

export default function CategoryGrid() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tighter">
              SHOP BY <span className="text-[#064e3b]">CATEGORY</span>
            </h2>
            <div className="h-1.5 w-24 bg-[#064e3b] mt-2 shimmer-primary" />
          </div>
          <Link to="/shop" className="text-sm font-bold border-b-2 border-[#064e3b] hover:opacity-70 transition-opacity pb-1">
            VIEW ALL
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {categories.map((cat) => (
            <Link key={cat.name} to={cat.link} className="group relative overflow-hidden rounded-xl aspect-[3/4]">
              <img 
                src={cat.image} 
                alt={cat.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter group-hover:text-[#064e3b] transition-colors">
                  {cat.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
