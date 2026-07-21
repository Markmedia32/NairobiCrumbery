function Testimonials() {
  const reviews = [
    { name: 'Wanjiru M.', area: 'Kahawa Sukari', quote: 'The Nairobi Swirl is unreal — ordered on a Tuesday and it was still warm when it arrived.' },
    { name: 'Brian K.', area: 'Kasarani', quote: 'PB & Crumb roll is now a monthly order for my whole office. Never disappoints.' },
    { name: 'Achieng O.', area: 'Roysambu', quote: 'The Cinnamon Swirl Loaf disappeared in one sitting. Ordering again this weekend.' }
  ];

  return (
    <div className="testimonials-grid">
      {reviews.map((r, i) => (
        <div className="testimonial-card" key={i}>
          <p className="testimonial-quote">&ldquo;{r.quote}&rdquo;</p>
          <div className="testimonial-author">
            <strong>{r.name}</strong>
            <span>{r.area}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Testimonials;