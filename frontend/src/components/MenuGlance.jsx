import { useState } from 'react';

function MenuGlance({ products }) {
  const categories = [
    { key: 'cinnamon_roll', label: 'Cinnamon Rolls', note: 'Minimum order of 4 rolls of your choice' },
    { key: 'cake_loaf', label: 'Cake Loaves', note: 'Sold per whole loaf' },
    { key: 'cookie', label: 'Cookies', note: 'Minimum order of 6 cookies of your choice' }
  ];

  const [active, setActive] = useState('cinnamon_roll');
  const items = products.filter(p => p.category === active);
  const activeCategory = categories.find(c => c.key === active);

  return (
    <div className="menu-glance">
      <div className="menu-glance-tabs">
        {categories.map(cat => (
          <button
            key={cat.key}
            className={`menu-glance-tab ${active === cat.key ? 'menu-glance-tab-active' : ''}`}
            onClick={() => setActive(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className="menu-glance-note">{activeCategory?.note}</p>

      <div className="menu-glance-list">
        {items.map(item => (
          <div className="menu-glance-row" key={item.id}>
            <span className="menu-glance-name">{item.name}</span>
            <span className="menu-glance-line"></span>
            <span className="menu-glance-price">KES {Number(item.price).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MenuGlance;
