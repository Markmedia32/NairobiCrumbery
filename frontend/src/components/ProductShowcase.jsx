import { useState } from 'react';
import ProductCard from './ProductCard';

function ProductShowcase({ products }) {
  const categories = [
    { key: 'cinnamon_roll', label: 'Cinnamon Rolls', note: 'Minimum order of 4 rolls of your choice' },
    { key: 'cake_loaf', label: 'Cake Loaves', note: 'Sold per whole loaf' },
    { key: 'cookie', label: 'Cookies', note: 'Minimum order of 6 cookies of your choice' }
  ];

  const [active, setActive] = useState('cinnamon_roll');
  const items = products.filter(p => p.category === active);
  const activeCategory = categories.find(c => c.key === active);

  return (
    <div className="showcase">
      <div className="showcase-tabs">
        {categories.map(cat => (
          <button
            key={cat.key}
            className={`showcase-tab ${active === cat.key ? 'showcase-tab-active' : ''}`}
            onClick={() => setActive(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className="showcase-note">{activeCategory?.note}</p>

      <div className="product-grid">
        {items.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </div>
  );
}

export default ProductShowcase;