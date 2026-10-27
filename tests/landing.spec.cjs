const { test, expect } = require('@playwright/test');
const sharp = require('sharp');

test('Category assets have transparent edges instead of rectangular backgrounds', async () => {
  for (const name of ['batteries', 'lighting', 'cables', 'electrical', 'tools', 'home']) {
    const file = `assets/${name}-cutout.webp`;
    const { width, height, hasAlpha } = await sharp(file).metadata();
    expect(hasAlpha, name).toBe(true);
    for (const [left, top] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
      const pixel = await sharp(file).extract({ left, top, width: 1, height: 1 }).raw().toBuffer();
      expect(pixel[3], `${name}: corner transparency`).toBeLessThanOrEqual(5);
    }
  }
});

for (const width of [360, 390, 768, 1024, 1440, 1920]) {
  test(`Layout and image integrity at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.querySelectorAll('img[loading="lazy"]').forEach(image => { image.loading = 'eager'; });
      await Promise.all([...document.images].map(image => image.decode()));
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(await page.locator('h1').count()).toBe(1);
    expect(await page.locator('.category').count()).toBe(6);
    const images = await page.locator('.category img, .hero-art img').evaluateAll(elements => elements.map(image => ({
      fit: getComputedStyle(image).objectFit,
      width: image.naturalWidth,
      height: image.naturalHeight,
    })));
    for (const image of images) {
      expect(image.fit).toBe('contain');
      expect(image.width).toBeGreaterThanOrEqual(1024);
      expect(image.height).toBeGreaterThanOrEqual(1024);
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.fonts.check('16px Play'))).toBe(true);
  });
}

test('Mobile navigation supports opening, anchors and Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('.mobile-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#navigation a[href="#delivery"]').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveURL(/#delivery$/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('Quote validates input and prepares correct mail without sending data', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('#quote-form');
  await form.locator('[name=name]').fill('Иван Тестов');
  await form.locator('[name=contact]').fill('wrong contact');
  await form.locator('[name=products]').fill('Кабель ВВГ, 100 м. Пермь.');
  await form.locator('[name=consent]').check();
  await form.locator('button[type=submit]').click();
  await expect(page.locator('#request-dialog')).not.toBeVisible();
  expect(await form.locator('[name=contact]').evaluate(el => el.validity.customError)).toBe(true);
  await form.locator('[name=contact]').fill('ivan@example.com');
  await page.locator('#attachment').setInputFiles({ name: 'zakupka.csv', mimeType: 'text/csv', buffer: Buffer.from('Кабель;100') });
  await expect(page.locator('#file-note')).toBeVisible();
  await form.locator('button[type=submit]').click();
  await expect(page.locator('#request-dialog')).toBeVisible();
  const mail = await page.locator('#open-mail').getAttribute('href');
  expect(decodeURIComponent(mail)).toContain('ivan@example.com');
  expect(decodeURIComponent(mail)).toContain('Кабель ВВГ, 100 м. Пермь.');
  await expect(page.locator('#dialog-attachment')).toContainText('zakupka.csv');
  await page.keyboard.press('Escape');
  await expect(page.locator('#request-dialog')).not.toBeVisible();
});

test('Invalid attachment is rejected and FAQ expands accessibly', async ({ page }) => {
  await page.goto('/');
  await page.locator('#attachment').setInputFiles({ name: 'not-supported.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('test') });
  await expect(page.locator('#form-error')).toContainText('Выберите документ');
  expect(await page.locator('#attachment').evaluate(el => el.files.length)).toBe(0);
  const faq = page.locator('.faq details').first();
  await faq.locator('summary').click();
  await expect(faq).not.toHaveAttribute('open');
  await faq.locator('summary').click();
  await expect(faq).toHaveAttribute('open', '');
  const second = page.locator('.faq details').nth(1);
  await second.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('open', '');
  await expect(faq).not.toHaveAttribute('open');
});

test('FAQ handles rapid toggles and reduced-motion changes', async ({ page }) => {
  await page.goto('/');
  const item = page.locator('.faq-item').nth(2);
  const summary = item.locator('summary');
  await summary.scrollIntoViewIfNeeded();
  await summary.evaluate(el => { el.click(); el.click(); el.click(); });
  await expect(item).toHaveAttribute('open', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await summary.click();
  await expect(item).not.toHaveAttribute('open');
  expect(await item.evaluate(el => el.getAnimations().length)).toBe(0);
});

test('Reduced motion and no JavaScript preserve readable content', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).scrollBehavior)).toBe('auto');
  expect(await page.locator('.category').first().evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await context.close();
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noJS.newPage();
  await fallback.goto('/');
  expect(await fallback.locator('.category').first().evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await expect(fallback.locator('h1')).toBeVisible();
  const nativeFAQ = fallback.locator('.faq-item').first();
  await nativeFAQ.locator('summary').click();
  await expect(nativeFAQ).not.toHaveAttribute('open');
  await nativeFAQ.locator('summary').click();
  await expect(nativeFAQ).toHaveAttribute('open', '');
  await noJS.close();
});
