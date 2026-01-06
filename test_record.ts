import { test, expect } from '@playwright/test';

test.use({
  locale: 'typescript'
});

test('test', async ({ page }) => {
  await page.goto('http://localhost:4000/');
  await page.getByRole('textbox', { name: 'Your Name' }).fill('asd');
  await page.getByRole('textbox', { name: 'Your Name' }).press('Enter');
  await page.getByRole('textbox').click();
  await page.getByRole('textbox').fill('가값');
  await expect(page.getByRole('textbox')).toHaveValue('가');
});