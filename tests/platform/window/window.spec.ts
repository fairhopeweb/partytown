import { test, expect } from '@playwright/test';

test('window', async ({ page }) => {
  await page.goto('/platform/window/');

  await page.waitForSelector('.completed');

  const testWindowName = page.locator('#testWindowName');
  await expect(testWindowName).toHaveText('Window');

  const testHTMLAnchorElementName = page.locator('#testHTMLAnchorElementName');
  await expect(testHTMLAnchorElementName).toHaveText('HTMLAnchorElement');

  const testName = page.locator('#testName');
  await expect(testName).toHaveText('Partytown 🎉 (1)');

  const testNameEquals = page.locator('#testNameEquals');
  await expect(testNameEquals).toHaveText('true');

  const testComputedStyle = page.locator('#testGetComputedStyle');
  await expect(testComputedStyle).toHaveText('rgb(128, 0, 128)');

  await page.waitForSelector('.testRaf');

  const testBtoa = page.locator('#testBtoa');
  await expect(testBtoa).toHaveText('ODg=');
  const testAtob = page.locator('#testAtob');
  await expect(testAtob).toHaveText('88');

  page.on('dialog', (dialog) => dialog.accept('88'));
  const promptButton = page.locator('#button-prompt');
  await promptButton.click();
  const testPrompt = page.locator('#testPrompt');
  await expect(testPrompt).toHaveText('88');

  const wwHTMLConstructors = page.locator('#wwHTMLConstructors');
  const ww = await wwHTMLConstructors.innerText();
  const mainHTMLConstructors = page.locator('#mainHTMLConstructors');
  const main = await mainHTMLConstructors.innerText();
  expect(ww).toBe(main);

  const testScreenHasWidth = page.locator('#testScreenHasWidth');
  await expect(testScreenHasWidth).toHaveText('true');
});
