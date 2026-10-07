document.addEventListener("DOMContentLoaded", () => {
  // HERO SLIDER
  const slides = [...document.querySelectorAll(".hero-slide")];
  const dots = document.getElementById("dots");
  let current = 0;
  let timer;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Slide ${i + 1}`);
    dot.addEventListener("click", () => {
      go(i);
      restart();
    });
    dots.appendChild(dot);
  });

  function go(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("active", i === current));
    [...dots.children].forEach((dot, i) => dot.classList.toggle("active", i === current));
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => go(current + 1), 5500);
  }

  document.getElementById("next").addEventListener("click", () => { go(current + 1); restart(); });
  document.getElementById("prev").addEventListener("click", () => { go(current - 1); restart(); });
  restart();

  // MOBILE MENU
  const menu = document.querySelector(".menu-toggle");
  const links = document.querySelector(".nav-links");

  menu.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    menu.setAttribute("aria-expanded", open);
  });

  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
    });
  });

  // SCROLL REVEAL
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

  // GALLERY LIGHTBOX
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");

  document.querySelectorAll("#gallery figure").forEach(figure => {
    figure.addEventListener("click", () => {
      const img = figure.querySelector("img");
      const caption = figure.querySelector("figcaption");
      lightboxImage.src = img.src;
      lightboxImage.alt = img.alt;
      lightboxCaption.textContent = caption.textContent;
      lightbox.classList.add("show");
      lightbox.setAttribute("aria-hidden", "false");
    });
  });

  function closeLightbox() {
    lightbox.classList.remove("show");
    lightbox.setAttribute("aria-hidden", "true");
  }

  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.getElementById("galleryAll").addEventListener("click", () => {
    document.querySelector("#galeri").scrollIntoView({ behavior: "smooth" });
  });

  // PPDB MODAL
  const modal = document.getElementById("infoModal");
  const openModal = () => {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  };
  const closeModal = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  };

  document.getElementById("infoBtn").addEventListener("click", openModal);
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("closeModal2").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

  e.preventDefault();

    const form = e.target;

    const nama = document.getElementById("nama").value.trim();
    const email = document.getElementById("email").value.trim();
    const pesan = document.getElementById("pesan").value.trim();

    if (!nama || !email || !pesan) {
        alert("Nama, email, dan pesan wajib diisi.");
        return;
    }

    const tombol = form.querySelector("button[type='submit']");

    tombol.disabled = true;
    tombol.textContent = "Mengirim...";

    try {

        const response = await fetch("/api/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nama: nama,
                email: email,
                pesan: pesan
            })
        });

        const hasil = await response.json();

        if (hasil.ok) {

            alert("Pesan berhasil dikirim ke email sekolah.");

            form.reset();

        } else {

            alert(
                hasil.message ||
                "Pesan gagal dikirim."
            );
        }

    } catch (error) {

        console.error("Error contact form:", error);

        alert(
            "Tidak dapat menghubungi server. Pastikan server SPMB sedang berjalan."
        );

    } finally {

        tombol.disabled = false;
        tombol.textContent = "Kirim Pesan";
    }


  // YEAR
  document.getElementById("year").textContent = new Date().getFullYear();});
