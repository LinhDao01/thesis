<script setup>
    defineProps({
    name: { type: String, required: true },
    color: { type: String, required: true }
    })
</script>

<template>
  <div class="card tag-quiz shadow-sm border-0">
    <div class="card-body d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-3">
        <span class="color-dot" :style="{ background: color }"></span>
        <span class="fw-semibold text-dark-emphasis">{{ name }}</span>
      </div>

      <!-- Kebab -->
      <div class="dropdown">
        <button class="btn btn-sm btn-link text-muted p-0" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-three-dots-vertical fs-5"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="#">Rename</a></li>
          <li><a class="dropdown-item" href="#">Change color</a></li>
          <li><hr class="dropdown-divider" /></li>
          <li><a class="dropdown-item text-danger" href="#">Delete</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
    .tag-quiz { border-radius: 14px; }
    .color-dot { width: 22px; height: 22px; border-radius: 6px; display: inline-block; }
</style>
