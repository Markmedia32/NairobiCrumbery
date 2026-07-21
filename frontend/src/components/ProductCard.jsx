import { Link } from 'react-router-dom';

function ProductCard({ product, index = 0 }) {
  const tilt = index % 2 === 0 ? 'tilt-left' : 'tilt-right';

  return (
    <div className={`product-card ${tilt}`} style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="product-card-image">
        <img src={`/images/${product.image_filename}`} alt={product.name} />
        {product.is_bestseller ? <span className="product-card-badge">Best Seller</span> : null}
      </div>
      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p className="product-card-desc">{product.description}</p>
        <div className="product-card-footer">
          <span className="product-card-price">KES {Number(product.price).toLocaleString()}</span>
          <span className="product-card-unit">{product.unit_label}</span>
        </div>
        <Link to="/order" className="btn btn-primary btn-block">Order Now</Link>
      </div>
    </div>
  );
}

export default ProductCard;