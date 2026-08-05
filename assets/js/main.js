/**
 * Portfolio Interactive Engine
 * Rafaiz Ghazian Lusaid
 */

(function () {
  'use strict';

  /* ----------------------------------------------------------------
     UTILITIES
  ---------------------------------------------------------------- */
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isFinePointerDesktop = () =>
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    window.innerWidth >= 992;

  /* ----------------------------------------------------------------
     HEADER — shrink on scroll + active nav links
  ---------------------------------------------------------------- */
  function initHeader() {
    const header = qs('#header');
    if (!header) return;

    // Scroll shrink
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Active nav via IntersectionObserver
    const sections = qsa('section[id]');
    const navLinks = qsa('.nav-links a[href^="#"], .mobile-menu-links a[href^="#"]');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((a) => {
              a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
            });
          }
        });
      },
      { rootMargin: '-30% 0px -65% 0px' }
    );
    sections.forEach((s) => io.observe(s));
  }

  /* ----------------------------------------------------------------
     SMOOTH SCROLL — respects reduced motion
  ---------------------------------------------------------------- */
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const target = qs(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();

      // Close mobile menu if open
      const mobileMenu = qs('.mobile-menu');
      if (mobileMenu && mobileMenu.classList.contains('is-open')) {
        closeMobileMenu();
      }

      const headerHeight = qs('#header')?.offsetHeight ?? 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  }

  /* ----------------------------------------------------------------
     MOBILE MENU
  ---------------------------------------------------------------- */
  let mobileMenuFocusSource = null;
  const FOCUSABLE = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function openMobileMenu() {
    const menu = qs('.mobile-menu');
    const toggle = qs('.mobile-toggle');
    if (!menu) return;
    mobileMenuFocusSource = document.activeElement;
    menu.classList.add('is-open');
    document.body.classList.add('no-scroll');
    menu.setAttribute('aria-hidden', 'false');
    toggle?.setAttribute('aria-expanded', 'true');
    toggle?.setAttribute('aria-label', 'Close navigation menu');
    // Move focus inside
    const firstFocusable = qs(FOCUSABLE, menu);
    firstFocusable?.focus();
    menu.addEventListener('keydown', trapFocus);
  }

  function closeMobileMenu() {
    const menu = qs('.mobile-menu');
    const toggle = qs('.mobile-toggle');
    if (!menu) return;
    menu.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    menu.setAttribute('aria-hidden', 'true');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open navigation menu');
    menu.removeEventListener('keydown', trapFocus);
    mobileMenuFocusSource?.focus();
    mobileMenuFocusSource = null;
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const menu = qs('.mobile-menu');
    if (!menu) return;
    const focusable = qsa(FOCUSABLE, menu).filter((el) => !el.disabled);
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function initMobileMenu() {
    const openBtn  = qs('.mobile-toggle');
    const closeBtn = qs('.mobile-menu-close');
    const menu     = qs('.mobile-menu');
    if (!menu) return;

    openBtn?.addEventListener('click', openMobileMenu);
    closeBtn?.addEventListener('click', closeMobileMenu);

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMobileMenu();
    });
  }

  /* ----------------------------------------------------------------
     CASE STUDY DRAWER SYSTEM
  ---------------------------------------------------------------- */
  const drawers = {};
  let activeDrawer = null;
  let drawerFocusSource = null;

  function buildDrawerRegistry() {
    qsa('.cs-overlay[id]').forEach((overlay) => {
      const id = overlay.id.replace('drawer-', '');
      drawers[id] = overlay;
    });
  }

  function openDrawer(id, { updateHistory = true } = {}) {
    const overlay = drawers[id];
    if (!overlay) return;

    // Store scroll position & lock body
    drawerFocusSource = document.activeElement;
    document.body.classList.add('no-scroll');

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    activeDrawer = id;

    // Push hash
    if (updateHistory && history.pushState) {
      history.pushState({ drawer: id }, '', '#' + id);
    } else if (updateHistory) {
      location.hash = id;
    }

    // Move focus to close button
    const closeBtn = qs('.cs-drawer-close', overlay);
    closeBtn?.focus();

    // Trap focus
    overlay.addEventListener('keydown', drawerTrapFocus);
  }

  function closeDrawer(id, { updateHistory = true } = {}) {
    const overlay = id ? drawers[id] : (activeDrawer ? drawers[activeDrawer] : null);
    if (!overlay) return;

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.removeEventListener('keydown', drawerTrapFocus);
    document.body.classList.remove('no-scroll');

    // Clear hash
    if (updateHistory && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.search);
    }

    drawerFocusSource?.focus();
    drawerFocusSource = null;
    activeDrawer = null;
  }

  function drawerTrapFocus(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    const overlay = e.currentTarget;
    const focusable = qsa(FOCUSABLE, overlay).filter((el) => !el.disabled && el.offsetParent !== null);
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function initDrawers() {
    buildDrawerRegistry();

    // Open via trigger buttons/cards
    document.addEventListener('click', (e) => {
      // Close via overlay backdrop click
      const overlay = e.target.closest('.cs-overlay');
      if (overlay && e.target === overlay) { closeDrawer(); return; }

      // Close button
      if (e.target.closest('.cs-drawer-close')) { closeDrawer(); return; }

      // Open trigger
      const trigger = e.target.closest('[data-open-drawer]');
      if (trigger) {
        e.preventDefault();
        openDrawer(trigger.dataset.openDrawer);
      }
    });

    // Keyboard trigger (Enter/Space on cards)
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const trigger = e.target.closest('[data-open-drawer]');
      if (trigger) { e.preventDefault(); openDrawer(trigger.dataset.openDrawer); }
    });

    // Browser back button
    window.addEventListener('popstate', () => {
      const hash = location.hash.replace('#', '');
      if (activeDrawer) closeDrawer(null, { updateHistory: false });
      if (hash && drawers[hash]) openDrawer(hash, { updateHistory: false });
    });

    // Open from URL hash on load
    const hash = location.hash.replace('#', '');
    if (hash && drawers[hash]) openDrawer(hash, { updateHistory: false });
  }

  /* ----------------------------------------------------------------
     CUSTOM CURSOR
  ---------------------------------------------------------------- */
  function initCursor() {
    if (prefersReducedMotion() || !isFinePointerDesktop()) return;

    const dot      = qs('.custom-cursor-dot');
    const follower = qs('.custom-cursor-follower');
    if (!dot || !follower) return;

    let mx = 0, my = 0, fx = 0, fy = 0;
    let rafId;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx - 3.5}px, ${my - 3.5}px, 0)`;
    });

    const animate = () => {
      fx += (mx - fx) * 0.14;
      fy += (my - fy) * 0.14;
      follower.style.transform = `translate3d(${fx - 17}px, ${fy - 17}px, 0)`;
      rafId = requestAnimationFrame(animate);
    };
    animate();

    const hoverEls = qsa('a, button, [data-open-drawer], .cap-card, .compact-card');
    hoverEls.forEach((el) => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    // Hide on leave, show on enter
    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0'; follower.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1'; follower.style.opacity = '1';
    });
  }

  /* ----------------------------------------------------------------
     AMBIENT CANVAS — warm particle mesh
  ---------------------------------------------------------------- */
  function initCanvas() {
    if (prefersReducedMotion()) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const canvas = qs('#bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize, { passive: true });

    const count = Math.min(Math.floor(W / 40), 28);
    const particles = Array.from({ length: count }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.4 + 0.6,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      a:  Math.random() * 0.18 + 0.06,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(230, 74, 25, ${0.045 * (1 - dist / 160)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Dots
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 74, 25, ${p.a})`;
        ctx.fill();
      });

      requestAnimationFrame(draw);
    };
    draw();
  }

  /* ----------------------------------------------------------------
     TIMELINE SCROLL ANIMATION
  ---------------------------------------------------------------- */
  function initTimeline() {
  const tabs = Array.from(
    document.querySelectorAll("[data-journey-tab]")
  );

  function updateTimeline() {
    const activeTimelines = document.querySelectorAll(
      ".journey-panel.is-active .timeline"
    );

    activeTimelines.forEach((timeline) => {
      const rail = timeline.querySelector(".timeline-rail");
      const fill = timeline.querySelector(".timeline-fill");

      if (!rail || !fill) return;

      const railRect = rail.getBoundingClientRect();

      /*
       * The playhead stays at 65% of the viewport.
       * This prevents the red line from shrinking or stopping when
       * the last timeline card enters the viewport.
       */
      const playhead = window.innerHeight * 0.65;

      const progress = Math.max(
        0,
        Math.min(railRect.height, playhead - railRect.top)
      );

      fill.style.height = `${progress}px`;

      timeline.querySelectorAll(".tl-item").forEach((item) => {
        const dot = item.querySelector(".tl-dot");

        if (!dot) return;

        const dotRect = dot.getBoundingClientRect();
        const dotCenter = dotRect.top + dotRect.height / 2;
        const isActive = dotCenter <= playhead;

        item.classList.toggle("is-active", isActive);
      });
    });
  }

  function selectTab(selectedTab) {
    tabs.forEach((tab) => {
      const selected = tab === selectedTab;
      const panelId = tab.dataset.journeyTab;
      const panel = document.getElementById(panelId);

      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;

      if (panel) {
        panel.hidden = !selected;
        panel.classList.toggle("is-active", selected);
      }
    });

    requestAnimationFrame(updateTimeline);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      selectTab(tab);
    });

    tab.addEventListener("keydown", (event) => {
      if (
        event.key !== "ArrowRight" &&
        event.key !== "ArrowLeft"
      ) {
        return;
      }

      event.preventDefault();

      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex =
        (index + direction + tabs.length) % tabs.length;

      selectTab(tabs[nextIndex]);
      tabs[nextIndex].focus();
    });
  });

  window.addEventListener("scroll", updateTimeline, {
    passive: true
  });

  window.addEventListener("resize", updateTimeline);

  updateTimeline();
}

  /* ----------------------------------------------------------------
     COPY EMAIL TO CLIPBOARD
  ---------------------------------------------------------------- */
  window.copyEmail = function (address) {
    if (!navigator.clipboard) {
      // Fallback: select/copy
      const ta = document.createElement('textarea');
      ta.value = address;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      showToast(`Copied: ${address}`);
      return;
    }
    navigator.clipboard.writeText(address).then(
      () => showToast(`<i class="bi bi-check-circle-fill" style="color:#22c55e"></i> Email copied to clipboard!`),
      () => showToast(`Could not copy. Email: ${address}`)
    );
  };

  function showToast(html) {
    let toast = qs('#toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id        = 'toast';
      toast.className = 'toast-notification';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML = html;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  /* ----------------------------------------------------------------
     INIT
  ---------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initSmoothScroll();
    initMobileMenu();
    initDrawers();
    initTimeline();
    initCursor();
    initCanvas();
  });

})();
