// Procanimation - Portfolio Interactive UI Logic

document.addEventListener('DOMContentLoaded', () => {
  initProjectFilters();
  initNavbarScroll();
  initMobileNav();
});

// Mobile Hamburger Menu Controller
function initMobileNav() {
  const toggleBtn = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navMenu.classList.toggle('open');
    toggleBtn.classList.toggle('active', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close when clicking any nav link
  document.querySelectorAll('.nav-link-item').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('open')) {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('open');
        toggleBtn.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    }
  });
}

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
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.style.background = 'rgba(7, 9, 14, 0.94)';
      navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.12)';
    } else {
      navbar.style.background = 'rgba(7, 9, 14, 0.75)';
      navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.08)';
    }
  });
}
