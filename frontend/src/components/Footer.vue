<template>
  <footer class="footer-dark mt-auto pt-5 pb-3">
    <div class="container">
      <div class="row mb-4">
        <!-- INFORMATION -->
        <div class="col-6 col-md-4">
          <h6 class="footer-heading">INFORMATION</h6>
          <ul class="list-unstyled">
            <li><a href="#">Our Plans</a></li>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>

        <!-- LEGAL -->
        <div class="col-6 col-md-4">
          <h6 class="footer-heading">LEGAL</h6>
          <ul class="list-unstyled">
            <li><a href="#">Terms of Use</a></li>
            <li><a href="#">Privacy Policy</a></li>
          </ul>
        </div>

        <!-- LOGO -->
        <div class="col-12 col-md-4 text-md-end mt-4 mt-md-0">
          <div class="d-inline-flex align-items-center footer-logo">
            <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
              <path d="M12 3L2 8l10 5 10-5-10-5Z" fill="#fff"/>
              <path d="M4 10v5c0 1 3.5 3 8 3s8-2 8-3v-5" stroke="#fff" stroke-width="1.4" />
            </svg>
            <span class="ms-2 fw-semibold fs-5 text-white">LetQuiz</span>
          </div>
        </div>
      </div>

      <hr class="footer-divider"/>

      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center small text-secondary mt-3">
        <div>123</div>
        <div>123</div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-dark {
  background: linear-gradient(180deg, #2b2b2b 0%, #1c1c1c 100%);
  color: #aaa;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.footer-heading {
  color: #ccc;
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.5px;
  margin-bottom: 0.75rem;
}
.footer-dark a {
  color: #aaa;
  text-decoration: none;
  font-size: 0.9rem;
}
.footer-dark a:hover {
  color: #fff;
}
.footer-divider {
  border-color: #444;
  margin-top: 1rem;
}
.footer-logo svg {
  flex-shrink: 0;
}
</style>
