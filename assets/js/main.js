// Procanimation - Portfolio Interactive UI Logic

document.addEventListener('DOMContentLoaded', () => {
  initProjectFilters();
  initNavbarScroll();
});

// Category Filtering for Projects
function initProjectFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          card.style.opacity = '1';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// Navbar dynamic glass background on scroll
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.style.background = 'rgba(7, 9, 14, 0.92)';
      navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.12)';
    } else {
      navbar.style.background = 'rgba(7, 9, 14, 0.75)';
      navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.08)';
    }
  });
}
