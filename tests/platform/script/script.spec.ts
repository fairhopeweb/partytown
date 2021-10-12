import { test, expect } from '@playwright/test';

test('script', async ({ page }) => {
  await page.goto('/platform/script/');

  await page.waitForSelector('.testJSONP');
  const testJSONP = page.locator('#testJSONP');
  await expect(testJSONP).toHaveText('88');
  expect(await page.$$('[data-testjsonp]')).toHaveLength(0);

  await page.waitForSelector('.testOnLoad');
  const testOnLoad = page.locator('#testOnLoad');
  await expect(testOnLoad).toHaveText('99');
  expect(await page.$$('[data-testonload]')).toHaveLength(0);

  await page.waitForSelector('.testOnError');
  const testOnError = page.locator('#testOnError');
  await expect(testOnError).toHaveText('error');

  await page.waitForSelector('.testAddEventListenerError');
  const testAddEventListenerError = page.locator('#testAddEventListenerError');
  await expect(testAddEventListenerError).toHaveText('error');

  await page.waitForSelector('.testInnerHTML');
  const testInnerHTML = page.locator('#testInnerHTML');
  await expect(testInnerHTML).toHaveText('88');

  await page.waitForSelector('.testTextContent');
  const testTextContent = page.locator('#testTextContent');
  await expect(testTextContent).toHaveText('99');

  await page.waitForSelector('.testInnerText');
  const testInnerText = page.locator('#testInnerText');
  await expect(testInnerText).toHaveText('101');

  await page.waitForSelector('.testInnerHTMLGlobalVar');
  const testInnerHTMLGlobalVar = page.locator('#testInnerHTMLGlobalVar');
  await expect(testInnerHTMLGlobalVar).toHaveText('111');

  await page.waitForSelector('.testInnerHTMLError');
  const testInnerHTMLError = page.locator('#testInnerHTMLError');
  await expect(testInnerHTMLError).toHaveText('gahh');
});
