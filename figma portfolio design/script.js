(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSmallScreen = window.innerWidth < 700;

  /* ---------------------------------------------------------
     MOBILE NAV
  --------------------------------------------------------- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  function closeNav() {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
  function toggleNav() {
    var isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  }
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', toggleNav);
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
  }

  /* ---------------------------------------------------------
     LENIS SMOOTH SCROLL
  --------------------------------------------------------- */
  var lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // smooth-scroll every in-page anchor, with or without Lenis
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -10 });
      } else {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  });

  /* ---------------------------------------------------------
     SCROLL REVEAL
  --------------------------------------------------------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('in');
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------------------------------------------------
     THREE.JS — AMBIENT BACKGROUND STRATA
     (interface / logic / data layers the whole page descends through)
  --------------------------------------------------------- */
  if (window.THREE) {
    (function backgroundScene() {
      var canvas = document.getElementById('bg-canvas');
      if (!canvas) return;

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmallScreen ? 1.5 : 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 3, 14);

      var layerDefs = [
        { color: 0x3ea8ff, y: 4.2, z: 0 },
        { color: 0x7c5cff, y: -0.4, z: -3.5 },
        { color: 0x00d9a3, y: -5.0, z: -7 }
      ];

      var layers = [];
      layerDefs.forEach(function (def) {
        var geo = new THREE.PlaneGeometry(34, 8, 24, 6);
        var mat = new THREE.MeshBasicMaterial({
          color: def.color, wireframe: true, transparent: true, opacity: 0.22
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, def.y, def.z);
        mesh.rotation.x = -0.15;
        scene.add(mesh);
        layers.push({ mesh: mesh, baseY: def.y });
      });

      var starCount = isSmallScreen ? 130 : 260;
      var starGeo = new THREE.BufferGeometry();
      var starPos = new Float32Array(starCount * 3);
      for (var i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 40;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 30;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      var starMat = new THREE.PointsMaterial({ color: 0xeef2f7, size: 0.045, transparent: true, opacity: 0.5 });
      var stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      var pulseCount = isSmallScreen ? 8 : 14;
      var pulses = [];
      var pulseGeo = new THREE.SphereGeometry(0.06, 8, 8);
      for (var p = 0; p < pulseCount; p++) {
        var goingDown = p % 2 === 0;
        var mat = new THREE.MeshBasicMaterial({
          color: goingDown ? 0x3ea8ff : 0x00d9a3, transparent: true, opacity: 0.9
        });
        var mesh = new THREE.Mesh(pulseGeo, mat);
        var x = (Math.random() - 0.5) * 26;
        mesh.position.set(x, goingDown ? 4.2 : -5.0, -2.5 - Math.random() * 4);
        scene.add(mesh);
        pulses.push({
          mesh: mesh, dir: goingDown ? -1 : 1, speed: 0.02 + Math.random() * 0.02,
          top: 4.2, bottom: -5.0
        });
      }

      var scrollT = 0, targetScrollT = 0;
      var mouseX = 0, mouseY = 0;

      function updateScrollTargetFromWindow() {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        targetScrollT = max > 0 ? window.scrollY / max : 0;
      }

      if (lenis) {
        lenis.on('scroll', function (e) {
          if (typeof e.progress === 'number') {
            targetScrollT = e.progress;
          } else if (e.limit > 0) {
            targetScrollT = e.scroll / e.limit;
          }
        });
      } else {
        window.addEventListener('scroll', updateScrollTargetFromWindow, { passive: true });
      }

      window.addEventListener('mousemove', function (e) {
        mouseX = (e.clientX / window.innerWidth - 0.5);
        mouseY = (e.clientY / window.innerHeight - 0.5);
      });
      window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

      var clock = new THREE.Clock();
      var running = true;
      document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
      });

      function animate() {
        requestAnimationFrame(animate);
        if (!running) return;
        var t = clock.getElapsedTime();

        scrollT += (targetScrollT - scrollT) * 0.06;

        camera.position.y = 3 - scrollT * 10;
        camera.position.z = 14 - scrollT * 4;
        camera.position.x += (mouseX * 1.2 - camera.position.x) * 0.02;
        camera.lookAt(0, camera.position.y - 2.2, camera.position.z - 10);

        layers.forEach(function (l, idx) {
          l.mesh.rotation.z = Math.sin(t * 0.08 + idx) * 0.02;
          l.mesh.position.x = Math.sin(t * 0.1 + idx * 2) * 0.6;
          l.mesh.material.opacity = 0.16 + Math.sin(t * 0.5 + idx) * 0.04;
        });

        stars.rotation.y = t * 0.004;

        pulses.forEach(function (pu) {
          pu.mesh.position.y += pu.dir * pu.speed;
          if (pu.dir < 0 && pu.mesh.position.y < pu.bottom) pu.mesh.position.y = pu.top;
          if (pu.dir > 0 && pu.mesh.position.y > pu.top) pu.mesh.position.y = pu.bottom;
        });

        renderer.render(scene, camera);
      }
      animate();
    })();

    /* ---------------------------------------------------------
       THREE.JS — HERO SCULPTURE
       fills the blank right side of the hero: three orbiting rings
       (interface / logic / data) linked by a lit vertical spine —
       the same stack metaphor as the background, rendered up close.
    --------------------------------------------------------- */
    (function heroScene() {
      var container = document.querySelector('.hero-visual');
      var canvas = document.getElementById('hero-canvas');
      if (!container || !canvas) return;

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0.4, 7.5);

      var group = new THREE.Group();
      scene.add(group);

      var ringDefs = [
        { color: 0x3ea8ff, y: 1.7, radius: 1.55 },
        { color: 0x7c5cff, y: 0,   radius: 1.9 },
        { color: 0x00d9a3, y: -1.7, radius: 1.55 }
      ];

      var rings = [];
      ringDefs.forEach(function (def) {
        var geo = new THREE.TorusGeometry(def.radius, 0.035, 10, 64);
        var mat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.85 });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = def.y;
        mesh.rotation.x = Math.PI / 2.15;
        group.add(mesh);
        rings.push({ mesh: mesh, color: def.color, y: def.y });

        // small node markers orbiting each ring
        var nodeCount = 5;
        for (var n = 0; n < nodeCount; n++) {
          var ang = (n / nodeCount) * Math.PI * 2;
          var nodeGeo = new THREE.SphereGeometry(0.05, 8, 8);
          var nodeMat = new THREE.MeshBasicMaterial({ color: def.color });
          var node = new THREE.Mesh(nodeGeo, nodeMat);
          node.position.set(Math.cos(ang) * def.radius, def.y, Math.sin(ang) * def.radius);
          group.add(node);
          rings[rings.length - 1].nodes = rings[rings.length - 1].nodes || [];
          rings[rings.length - 1].nodes.push({ mesh: node, angle: ang, radius: def.radius, y: def.y });
        }
      });

      // vertical spine connecting the three layers
      var spineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 1.9, 0), new THREE.Vector3(0, -1.9, 0)
      ]);
      var spineMat = new THREE.LineBasicMaterial({ color: 0xeef2f7, transparent: true, opacity: 0.18 });
      group.add(new THREE.Line(spineGeo, spineMat));

      // ambient pulses traveling along the spine
      var travelers = [];
      var travelerGeo = new THREE.SphereGeometry(0.07, 8, 8);
      [0x3ea8ff, 0x00d9a3].forEach(function (color, idx) {
        var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.95 });
        var mesh = new THREE.Mesh(travelerGeo, mat);
        group.add(mesh);
        travelers.push({ mesh: mesh, offset: idx * Math.PI, dir: idx === 0 ? 1 : -1 });
      });

      var pointer = { x: 0, y: 0 };
      container.addEventListener('pointermove', function (e) {
        var rect = container.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      });
      container.addEventListener('pointerleave', function () {
        pointer.x = 0; pointer.y = 0;
      });

      function resize() {
        var w = container.clientWidth;
        var h = container.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener('resize', resize);
      if ('ResizeObserver' in window) {
        new ResizeObserver(resize).observe(container);
      }

      var running = true;
      document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
      });

      var clock = new THREE.Clock();
      var targetRotX = 0, targetRotY = 0;

      function animate() {
        requestAnimationFrame(animate);
        if (!running) return;
        var t = clock.getElapsedTime();

        rings.forEach(function (r, idx) {
          r.mesh.rotation.z = t * (0.15 + idx * 0.05) * (idx % 2 === 0 ? 1 : -1);
          (r.nodes || []).forEach(function (nd) {
            var a = nd.angle + t * (0.2 + idx * 0.05) * (idx % 2 === 0 ? 1 : -1);
            nd.mesh.position.set(Math.cos(a) * nd.radius, nd.y, Math.sin(a) * nd.radius);
          });
        });

        travelers.forEach(function (tr) {
          var y = Math.sin(t * 0.7 * tr.dir + tr.offset) * 1.85;
          tr.mesh.position.set(0, y, 0);
        });

        targetRotY = pointer.x * 0.35;
        targetRotX = -pointer.y * 0.2;
        group.rotation.y += (targetRotY + t * 0.06 - group.rotation.y) * 0.04;
        group.rotation.x += (targetRotX - group.rotation.x) * 0.06;

        renderer.render(scene, camera);
      }

      if (reduceMotion) {
        resize();
        renderer.render(scene, camera);
      } else {
        animate();
      }
    })();
  }
})();