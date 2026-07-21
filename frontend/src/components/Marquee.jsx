function Marquee() {
  const items = [
    'FRESH DAILY',
    'DELIVERING ANYWHERE IN NAIROBI',
    'CINNAMON ROLLS FROM KES 300',
    'COOKIES FROM KES 150',
    'LOAVES FROM KES 1,000',
    'ORDER TODAY, BAKED TODAY'
  ];

  const content = items.map((item, i) => (
    <span key={i} className="marquee-item">
      {item} <span className="marquee-dot">&#10022;</span>
    </span>
  ));

  return (
    <div className="marquee">
      <div className="marquee-track">
        {content}
        {content}
      </div>
    </div>
  );
}

export default Marquee;