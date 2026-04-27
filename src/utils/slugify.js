function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function randomSuffix() {
  return Math.random().toString(36).substring(2, 6);
}

async function uniqueSlug(base, checkExists) {
  let slug = slugify(base);
  if (await checkExists(slug)) {
    slug = `${slug}-${randomSuffix()}`;
  }
  return slug;
}

module.exports = { slugify, uniqueSlug };
